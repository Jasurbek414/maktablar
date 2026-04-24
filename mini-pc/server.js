/**
 * Mini-PC Bridge – Mustaqil o'rnatiladigan dastur
 * ================================================
 * Har bir maktabdagi kompyuterga o'rnatiladi.
 * Face ID qurilma ↔ Markaziy server o'rtasidagi ko'prik.
 *
 * O'rnatish:
 *   1. Node.js 18+ o'rnatish
 *   2. npm install
 *   3. config.json sozlash
 *   4. npm start
 *
 * Vazifalar:
 *   - Face ID qurilmadan eventlarni qabul qilib serverga jo'natadi
 *   - Serverdan buyruqlarni qabul qilib qurilmaga uzatadi
 *   - Har 30 soniyada heartbeat yuboradi (online/offline status)
 *   - Qurilma bilan sinxronizatsiya qiladi
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ──────────────────────────────────────
// Configuration – config.json dan o'qiladi
// ──────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  // Markaziy server URL (Cloudflare tunnel orqali)
  serverUrl: 'https://maktab.ecos.uz',

  // Qurilma API kaliti (serverdan ro'yxatdan o'tganda beriladi)
  deviceApiKey: '',

  // Qurilma ID (serverda ro'yxatdan o'tganda beriladi)
  deviceId: '',

  // Maktab ID
  schoolId: '',

  // Face ID terminal sozlamalari (local tarmoq)
  faceDevice: {
    ip: '192.168.1.100',
    port: 80,
    username: 'admin',
    password: 'admin123',
  },

  // Mini-PC server porti
  port: 3001,

  // Heartbeat interval (ms)
  heartbeatInterval: 30000,
};

// Konfiguratsiyani yuklash
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config = { ...config, ...saved };
      console.log('✅ config.json yuklandi');
    } else {
      // Default config yaratish
      saveConfig();
      console.log('📝 config.json yaratildi – sozlamalarni o\'zgartiring va qayta ishga tushiring');
    }
  } catch (err) {
    console.error('❌ config.json o\'qishda xatolik:', err.message);
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

loadConfig();

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────
const FACE_DEVICE_URL = `http://${config.faceDevice.ip}:${config.faceDevice.port}`;
const deviceAuth = {
  username: config.faceDevice.username,
  password: config.faceDevice.password,
};

// Serverga so'rov yuborish (API key bilan)
async function serverRequest(method, path, data = null) {
  const url = `${config.serverUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Device-Key': config.deviceApiKey,
    'X-Device-Id': config.deviceId,
  };

  try {
    const res = await axios({ method, url, data, headers, timeout: 15000 });
    return res.data;
  } catch (err) {
    console.error(`[SERVER] ${method.toUpperCase()} ${path} xatolik:`, err.response?.data || err.message);
    throw err;
  }
}

// ──────────────────────────────────────
// 1. RO'YXATDAN O'TISH (birinchi marta)
// ──────────────────────────────────────
app.post('/setup', async (req, res) => {
  const { serverUrl, schoolId, username, password, faceDeviceIp } = req.body;

  console.log('[SETUP] Ro\'yxatdan o\'tish boshlandi...');

  try {
    // Serverga login qilish
    const loginRes = await axios.post(`${serverUrl}/api/auth/login`, {
      username,
      password,
    });

    const token = loginRes.data.token;

    // Qurilmani ro'yxatdan o'tkazish
    const registerRes = await axios.post(
      `${serverUrl}/api/devices/register`,
      {
        schoolId,
        name: `Mini-PC (${os.hostname()})`,
        ipAddress: getLocalIP(),
        faceDeviceIp: faceDeviceIp || config.faceDevice.ip,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Config yangilash
    config.serverUrl = serverUrl;
    config.schoolId = schoolId;
    config.deviceApiKey = registerRes.data.apiKey;
    config.deviceId = registerRes.data.deviceId;
    if (faceDeviceIp) {
      config.faceDevice.ip = faceDeviceIp;
    }
    saveConfig();

    console.log(`[SETUP] ✅ Ro'yxatdan o'tildi. Device ID: ${config.deviceId}`);

    return res.json({
      success: true,
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tildi',
      deviceId: config.deviceId,
    });
  } catch (err) {
    console.error('[SETUP] Xatolik:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Ro\'yxatdan o\'tishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 2. FACE ID EVENT – qurilmadan keladi
// ──────────────────────────────────────
app.post('/event', async (req, res) => {
  const { faceId, timestamp, deviceId, temperature } = req.body;

  if (!faceId) {
    return res.status(400).json({ error: 'faceId majburiy' });
  }

  const eventTime = timestamp || new Date().toISOString();
  console.log(`[EVENT] Yuz aniqlandi: ${faceId} | ${eventTime}`);

  try {
    // Serverga davomat yuborish
    const result = await serverRequest('post', '/api/attendance/device', {
      faceId,
      timestamp: eventTime,
      temperature: temperature || null,
    });

    console.log(`[EVENT] ✅ Davomat qayd etildi: ${result.studentName || faceId}`);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: 'Serverga yuborishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 3. QURILMAGA YUZ QO'SHISH
// ──────────────────────────────────────
app.post('/face/add', async (req, res) => {
  const { faceId, fullName, faceImage } = req.body;

  if (!faceId || !fullName || !faceImage) {
    return res.status(400).json({ error: 'faceId, fullName va faceImage majburiy' });
  }

  console.log(`[FACE/ADD] Yuz qo'shilmoqda: ${fullName} (${faceId})`);

  try {
    // Hikvision ISAPI - foydalanuvchi qo'shish
    const userPayload = {
      UserInfo: {
        employeeNo: faceId,
        name: fullName,
        userType: 'normal',
        Valid: {
          enable: true,
          beginTime: '2020-01-01T00:00:00',
          endTime: '2030-12-31T23:59:59',
        },
      },
    };

    await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Record?format=json`,
      userPayload,
      { auth: deviceAuth, timeout: 10000 }
    );

    // Yuz rasmini yuklash
    const FormData = require('form-data');
    const form = new FormData();
    const facePayload = { FaceDataRecord: { faceLibType: 'blackFD', FDID: '1', FPID: faceId } };
    form.append('FaceDataRecord', JSON.stringify(facePayload), { contentType: 'application/json' });
    form.append('img', Buffer.from(faceImage, 'base64'), { filename: `${faceId}.jpg`, contentType: 'image/jpeg' });

    await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`,
      form,
      { auth: deviceAuth, headers: form.getHeaders(), timeout: 15000 }
    );

    console.log(`[FACE/ADD] ✅ ${fullName} yuz qo'shildi`);
    return res.json({ success: true, message: `${fullName} yuz qo'shildi` });
  } catch (err) {
    console.error(`[FACE/ADD] ❌ Xatolik:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Yuz qo\'shishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 4. YUZ O'CHIRISH
// ──────────────────────────────────────
app.delete('/face/:faceId', async (req, res) => {
  const { faceId } = req.params;
  console.log(`[FACE/DELETE] O'chirilmoqda: ${faceId}`);

  try {
    await axios.put(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
      { UserInfoDelCond: { EmployeeNoList: [{ employeeNo: faceId }] } },
      { auth: deviceAuth, timeout: 10000 }
    );

    console.log(`[FACE/DELETE] ✅ ${faceId} o'chirildi`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 5. QURILMA HOLATI
// ──────────────────────────────────────
app.get('/device/status', async (req, res) => {
  try {
    const response = await axios.get(
      `${FACE_DEVICE_URL}/ISAPI/System/deviceInfo?format=json`,
      { auth: deviceAuth, timeout: 5000 }
    );
    const info = response.data?.DeviceInfo || response.data;
    return res.json({
      success: true,
      online: true,
      device: {
        name: info.deviceName || 'Unknown',
        model: info.model || 'Unknown',
        serialNumber: info.serialNumber || 'Unknown',
        firmwareVersion: info.firmwareVersion || 'Unknown',
      },
    });
  } catch (err) {
    return res.json({ success: false, online: false, error: err.message });
  }
});

// ──────────────────────────────────────
// 6. QURILMANI REBOOT
// ──────────────────────────────────────
app.post('/device/reboot', async (req, res) => {
  try {
    await axios.put(`${FACE_DEVICE_URL}/ISAPI/System/reboot`, null, { auth: deviceAuth, timeout: 10000 });
    return res.json({ success: true, message: 'Qurilma qayta ishga tushirilmoqda' });
  } catch (err) {
    return res.status(500).json({ error: 'Xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 7. YUZLAR RO'YXATI
// ──────────────────────────────────────
app.get('/face/list', async (req, res) => {
  try {
    const response = await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Search?format=json`,
      { UserInfoSearchCond: { searchID: '1', maxResults: 5000, searchResultPosition: 0 } },
      { auth: deviceAuth, timeout: 15000 }
    );
    const users = response.data?.UserInfoSearch?.UserInfo || [];
    return res.json({ success: true, total: users.length, users: users.map(u => ({ employeeNo: u.employeeNo, name: u.name })) });
  } catch (err) {
    return res.status(500).json({ error: 'Xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 8. SINXRONIZATSIYA
// ──────────────────────────────────────
app.post('/sync', async (req, res) => {
  console.log('[SYNC] Sinxronizatsiya boshlandi...');

  try {
    // Serverdan maktab o'quvchilarini olish
    const students = await serverRequest('get', `/api/devices/${config.deviceId}/students`);

    // Qurilmadagi yuzlarni olish
    const deviceRes = await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Search?format=json`,
      { UserInfoSearchCond: { searchID: '1', maxResults: 5000, searchResultPosition: 0 } },
      { auth: deviceAuth, timeout: 15000 }
    );
    const deviceUsers = deviceRes.data?.UserInfoSearch?.UserInfo || [];
    const deviceFaceIds = new Set(deviceUsers.map(u => u.employeeNo));
    const serverFaceIds = new Set(students.map(s => s.faceId));

    const results = { added: 0, removed: 0, errors: [] };

    // Qo'shish kerak
    for (const student of students) {
      if (!deviceFaceIds.has(student.faceId) && student.faceImage) {
        try {
          await axios.post(`http://localhost:${config.port}/face/add`, {
            faceId: student.faceId,
            fullName: student.fullName,
            faceImage: student.faceImage,
          });
          results.added++;
        } catch (err) {
          results.errors.push({ faceId: student.faceId, error: err.message });
        }
      }
    }

    // O'chirish kerak
    for (const user of deviceUsers) {
      if (!serverFaceIds.has(user.employeeNo)) {
        try {
          await axios.delete(`http://localhost:${config.port}/face/${user.employeeNo}`);
          results.removed++;
        } catch (err) {
          results.errors.push({ faceId: user.employeeNo, error: err.message });
        }
      }
    }

    console.log(`[SYNC] ✅ Qo'shildi: ${results.added}, O'chirildi: ${results.removed}`);
    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ error: 'Sinxronizatsiyada xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 9. HEALTH
// ──────────────────────────────────────
app.get('/health', (req, res) => {
  return res.json({
    service: 'mini-pc-bridge',
    status: 'running',
    deviceId: config.deviceId,
    schoolId: config.schoolId,
    serverUrl: config.serverUrl,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────
// 10. HEARTBEAT – serverga har 30 sek
// ──────────────────────────────────────
async function sendHeartbeat() {
  if (!config.deviceApiKey) return; // ro'yxatdan o'tmagan

  try {
    // Qurilma online/offline tekshirish
    let deviceOnline = false;
    try {
      await axios.get(`${FACE_DEVICE_URL}/ISAPI/System/deviceInfo?format=json`, {
        auth: deviceAuth, timeout: 3000,
      });
      deviceOnline = true;
    } catch {}

    await serverRequest('post', '/api/devices/heartbeat', {
      uptime: Math.floor(process.uptime()),
      deviceOnline,
      localIp: getLocalIP(),
      faceDeviceIp: config.faceDevice.ip,
    });
  } catch (err) {
    // Silent – server yo'q bo'lsa ham ishlashda davom etadi
  }
}

// ──────────────────────────────────────
// Helper – local IP olish
// ──────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ──────────────────────────────────────
// START
// ──────────────────────────────────────
app.listen(config.port, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         🖥️  Mini-PC Bridge v2.0                 ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Port:       ${String(config.port).padEnd(36)}║`);
  console.log(`║  Server:     ${config.serverUrl.padEnd(36)}║`);
  console.log(`║  Device ID:  ${(config.deviceId || 'Ro\'yxatdan o\'tilmagan').padEnd(36)}║`);
  console.log(`║  School ID:  ${(config.schoolId || '-').padEnd(36)}║`);
  console.log(`║  Face IP:    ${config.faceDevice.ip.padEnd(36)}║`);
  console.log(`║  Local IP:   ${getLocalIP().padEnd(36)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  if (!config.deviceApiKey) {
    console.log('⚠️  Qurilma ro\'yxatdan o\'tmagan!');
    console.log('   POST http://localhost:' + config.port + '/setup');
    console.log('   Body: { "serverUrl": "https://maktab.ecos.uz", "schoolId": "1", "username": "...", "password": "...", "faceDeviceIp": "192.168.1.100" }');
    console.log('');
  }

  // Heartbeat boshlash
  setInterval(sendHeartbeat, config.heartbeatInterval);
  sendHeartbeat();
});
