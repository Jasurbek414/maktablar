const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const net = require('net');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const os = require('os');

let mainWindow;
let tray = null;
let isQuiting = false;

// Logging Init
const logPath = path.join(app.getPath('userData'), 'minipc.log');
function logInfo(...args) {
  const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  fs.appendFileSync(logPath, msg);
  console.log(...args);
}

// Database Init
const dbPath = path.join(app.getPath('userData'), 'minipc.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, fullName TEXT, className TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, name TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY, fullName TEXT, role TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER,
    studentName TEXT,
    eventType TEXT,
    timestamp TEXT,
    deviceSerial TEXT,
    synced INTEGER DEFAULT 0
  )`);
});

// Config helpers
const getConfig = (key) => new Promise((resolve) => {
  db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => resolve(row ? row.value : null));
});
const setConfig = (key, value) => new Promise((resolve) => {
  db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value], resolve);
});

// State
let connectedTerminals = new Map();
let mainBackend = 'https://maktab.ecos.uz';
let isSyncing = false;

// ----------------------------------------------------
// ISUP TCP SERVER LOGIC (Node.js)
// ----------------------------------------------------
const server = net.createServer((socket) => {
  const remoteAddress = socket.remoteAddress;
  let deviceId = 'unknown';

  socket.on('data', (data) => {
    // Basic ISUP magic header check: 49 53 55 50 (I S U P)
    if (data.length >= 32 && data.toString('utf-8', 0, 4) === 'ISUP') {
      const msgType = data.readUInt16LE(6);
      const bodyLen = data.readUInt32LE(8);
      const deviceIdRaw = data.toString('utf-8', 16, 32).replace(/\0/g, '');
      if (deviceIdRaw) deviceId = deviceIdRaw;

      // Register device in memory
      connectedTerminals.set(deviceId, { addr: remoteAddress, status: 'ONLINE', lastSeen: new Date() });
      if (mainWindow) mainWindow.webContents.send('terminal-update', getTerminalsArray());

      // If registration request, send ack
      if (msgType === 0x0001) {
        const ack = Buffer.alloc(32);
        ack.write('ISUP', 0);
        ack.writeUInt16LE(5, 4); // version
        ack.writeUInt16LE(0x0002, 6); // ack msg type
        socket.write(ack);
      }
    } else {
      // It might be a JSON event (Hikvision HTTP style event via ISUP)
      try {
        const text = data.toString('utf-8');
        if (text.includes('employeeNo')) {
          const match = text.match(/\{.*\}/);
          if (match) {
            const event = JSON.parse(match[0]);
            handleFaceEvent(deviceId, event);
          }
        }
      } catch (e) { }
    }
  });

  socket.on('close', () => {
    if (deviceId !== 'unknown') {
      connectedTerminals.set(deviceId, { ...connectedTerminals.get(deviceId), status: 'OFFLINE' });
      if (mainWindow) mainWindow.webContents.send('terminal-update', getTerminalsArray());
    }
  });

  socket.on('error', () => {});
});

function getTerminalsArray() {
  return Array.from(connectedTerminals.entries()).map(([id, info]) => ({ id, ...info }));
}

function handleFaceEvent(deviceSerial, eventData) {
  const studentId = eventData.employeeNo || 0;
  let eventType = 'IN';
  
  if (eventData.minor === 0x4C || eventData.minor === 0x4E) {
    eventType = 'OUT';
  }

  const timestamp = eventData.dateTime || new Date().toISOString();

  // Try to find student name from local DB, fallback to eventData.name or 'Noma`lum'
  db.get(`SELECT fullName FROM students WHERE id = ?`, [studentId], (err, row) => {
    const studentName = row ? row.fullName : (eventData.name || "Noma'lum");
    
    db.run(`INSERT INTO attendance (studentId, studentName, eventType, timestamp, deviceSerial, synced) VALUES (?, ?, ?, ?, ?, 0)`, 
      [studentId, studentName, eventType, timestamp, deviceSerial], function() {
        if (mainWindow) {
          mainWindow.webContents.send('new-event', { id: this.lastID, studentId, studentName, eventType, timestamp, deviceSerial });
        }
    });
  });
}

server.listen(7660, '0.0.0.0', () => {
  logInfo('ISUP Server listening on port 7660');
});

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// ----------------------------------------------------
// SYNC ENGINE
// ----------------------------------------------------
async function syncEvents() {
  if (isSyncing) return;
  isSyncing = true;
  
  const apiKey = await getConfig('apiKey');
  const schoolId = await getConfig('schoolId');
  if (!apiKey || !schoolId) {
    isSyncing = false;
    return;
  }

  db.all(`SELECT * FROM attendance WHERE synced = 0 LIMIT 50`, async (err, rows) => {
    if (err || rows.length === 0) {
      isSyncing = false;
      return;
    }

    try {
      const resp = await axios.post(`${mainBackend}/api/attendance/sync`, {
        events: rows.map(r => ({
          syncKey: `MPC_${r.id}_${r.timestamp}`,
          studentId: r.studentId,
          timestamp: r.timestamp,
          type: r.eventType
        }))
      }, {
        headers: { 'X-Api-Key': apiKey },
        timeout: 10000
      });

      if (resp.status === 200) {
        const ids = rows.map(r => r.id).join(',');
        db.run(`UPDATE attendance SET synced = 1 WHERE id IN (${ids})`);
      }
    } catch (e) {
      logInfo('Sync failed:', e.message);
    }
    isSyncing = false;
  });
}

// Sync school data loop every 5 minutes
async function syncSchoolData() {
  const apiKey = await getConfig('apiKey');
  const schoolId = await getConfig('schoolId');
  if (!apiKey || !schoolId) return;

  try {
    // Sync Students
    const respStudents = await axios.get(`${mainBackend}/api/attendance/students?schoolId=${schoolId}`, {
      headers: { 'X-Api-Key': apiKey }, timeout: 10000
    });
    if (respStudents.status === 200 && respStudents.data.students) {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM students');
        const stmt = db.prepare('INSERT INTO students (id, fullName, className) VALUES (?, ?, ?)');
        respStudents.data.students.forEach(s => {
          stmt.run(s.id, s.fullName, s.className || '');
        });
        stmt.finalize();
        db.run('COMMIT');
      });
      logInfo(`Synced ${respStudents.data.students.length} students`);
    }

    // Sync Classes
    const respClasses = await axios.get(`${mainBackend}/api/classes?schoolId=${schoolId}`, { timeout: 10000 });
    if (respClasses.status === 200) {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM classes');
        const stmt = db.prepare('INSERT INTO classes (id, name) VALUES (?, ?)');
        respClasses.data.forEach(c => stmt.run(c.id, `${c.grade || ''}${c.section || ''} - ${c.name}`));
        stmt.finalize();
        db.run('COMMIT');
      });
    }

    // Sync Teachers
    const respTeachers = await axios.get(`${mainBackend}/api/users?role=TEACHER&schoolId=${schoolId}`, { timeout: 10000 });
    if (respTeachers.status === 200) {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM teachers');
        const stmt = db.prepare('INSERT INTO teachers (id, fullName, role) VALUES (?, ?, ?)');
        respTeachers.data.forEach(t => stmt.run(t.id, t.fullName, t.role));
        stmt.finalize();
        db.run('COMMIT');
      });
    }
  } catch (e) {
    logInfo('School data sync failed:', e.message);
  }
}

// Initial triggers and intervals
setTimeout(syncSchoolData, 5000);
setInterval(syncSchoolData, 300000);

// Sync loop every 30 seconds
setInterval(syncEvents, 30000);

// Heartbeat loop every 60 seconds
setInterval(async () => {
  const apiKey = await getConfig('apiKey');
  if (apiKey) {
    try {
      const activeCount = Array.from(connectedTerminals.values()).filter(t => t.status === 'ONLINE').length;
      await axios.post(`${mainBackend}/api/devices/heartbeat`, 
        { faceTerminalCount: activeCount }, 
        { headers: { 'X-Api-Key': apiKey }, timeout: 5000 }
      );
    } catch (e) {}
  }
}, 60000);


// ----------------------------------------------------
// ELECTRON WINDOW & IPC
// ----------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // Depending on dev or prod
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Set Auto-Start on Windows Boot
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden']
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, '../public/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ochish', click: () => mainWindow.show() },
    { label: 'Yopish', click: () => { isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Maktab Mini-PC Server');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers for UI
ipcMain.handle('get-config', async () => {
  return {
    apiKey: await getConfig('apiKey'),
    schoolId: await getConfig('schoolId'),
    localIp: getLocalIp()
  };
});

ipcMain.handle('save-config', async (e, { apiKey, schoolId }) => {
  await setConfig('apiKey', apiKey);
  await setConfig('schoolId', schoolId);
  
  // Avtomatik ravishda Backend ga ro'yxatdan o'tkazish
  try {
    await axios.post(`${mainBackend}/api/devices/register`, {
      apiKey: apiKey,
      schoolId: schoolId,
      deviceName: os.hostname() + " (Mini-PC)",
      localIp: getLocalIp()
    }, { timeout: 5000 });
  } catch(err) {
    logInfo("Auto-register failed:", err.message);
  }

  // Darhol sinxronizatsiyani boshlash
  syncSchoolData();
  return true;
});

ipcMain.handle('get-terminals', () => getTerminalsArray());

ipcMain.handle('get-events', async () => {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM attendance ORDER BY id DESC LIMIT 50`, (err, rows) => resolve(rows || []));
  });
});

ipcMain.handle('get-students', async () => {
  return new Promise((resolve) => db.all(`SELECT * FROM students ORDER BY fullName ASC`, (err, rows) => resolve(rows || [])));
});

ipcMain.handle('get-classes', async () => {
  return new Promise((resolve) => db.all(`SELECT * FROM classes ORDER BY name ASC`, (err, rows) => resolve(rows || [])));
});

ipcMain.handle('get-teachers', async () => {
  return new Promise((resolve) => db.all(`SELECT * FROM teachers ORDER BY fullName ASC`, (err, rows) => resolve(rows || [])));
});
