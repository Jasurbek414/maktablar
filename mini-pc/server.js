/**
 * Mini-PC Bridge Server
 * =====================
 * Face ID qurilma ↔ Backend o'rtasidagi ko'prik.
 *
 * Vazifalar:
 *   1. Face ID qurilmadan eventlarni qabul qilib backendga jo'natadi
 *   2. Backenddan buyruqlarni qabul qilib Face ID qurilmaga uzatadi
 *   3. Qurilma holatini kuzatadi (health check)
 *   4. Yuzlarni qurilmaga qo'shish / o'chirish
 *   5. Qurilmani qayta ishga tushirish
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // yuz rasmi katta bo'lishi mumkin

// ──────────────────────────────────────
// Configuration
// ──────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const FACE_DEVICE_URL = process.env.FACE_DEVICE_URL || 'http://192.168.1.100'; // Hikvision terminal IP
const DEVICE_USERNAME = process.env.DEVICE_USERNAME || 'admin';
const DEVICE_PASSWORD = process.env.DEVICE_PASSWORD || 'admin123';
const PORT = process.env.PORT || 3001;

// Hikvision digest auth config
const deviceAuth = {
  username: DEVICE_USERNAME,
  password: DEVICE_PASSWORD,
};

// ──────────────────────────────────────
// 1. FACE ID EVENT – qurilmadan keladi
// ──────────────────────────────────────
/**
 * Face ID terminal o'quvchi yuzini taniganda shu endpointga jo'natadi.
 * 
 * Body (JSON yoki XML – Hikvision formatiga bog'liq):
 * {
 *   "faceId": "string",       // qurilmadagi yuz identifikatori
 *   "timestamp": "ISO8601",   // vaqt
 *   "deviceId": "string",     // qurilma seriya raqami (ixtiyoriy)
 *   "temperature": 36.5       // harorat (ixtiyoriy)
 * }
 */
app.post('/event', async (req, res) => {
  const { faceId, timestamp, deviceId, temperature } = req.body;

  if (!faceId) {
    return res.status(400).json({ error: 'faceId majburiy' });
  }

  const eventTime = timestamp || new Date().toISOString();

  console.log(`[EVENT] Face detected: ${faceId} at ${eventTime} from device ${deviceId || 'unknown'}`);

  try {
    // 1. Backenddan studentni topish
    const studentRes = await axios.get(`${BACKEND_URL}/api/students/face/${faceId}`);
    const student = studentRes.data;

    if (!student || !student.id) {
      console.warn(`[EVENT] Student not found for faceId: ${faceId}`);
      return res.status(404).json({ error: 'O\'quvchi topilmadi' });
    }

    // 2. Attendance yozish
    const attendanceDto = {
      studentId: student.id,
      timestamp: eventTime,
      type: 'IN', // backend tomonida IN/OUT avtomatik aniqlanadi
      deviceId: deviceId || null,
      temperature: temperature || null,
    };

    const attendanceRes = await axios.post(`${BACKEND_URL}/api/attendance`, attendanceDto);

    console.log(`[EVENT] Attendance recorded for student ${student.fullName} (ID: ${student.id})`);

    return res.json({
      success: true,
      message: 'Davomat qayd etildi',
      student: {
        id: student.id,
        fullName: student.fullName,
      },
      attendance: attendanceRes.data,
    });
  } catch (err) {
    console.error(`[EVENT] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Ichki server xatosi', details: err.message });
  }
});

// ──────────────────────────────────────
// 2. YUZ QO'SHISH – backenddan buyruq
// ──────────────────────────────────────
/**
 * Backend yangi o'quvchi qo'shganda yuzni qurilmaga yuklash uchun chaqiradi.
 *
 * Body:
 * {
 *   "faceId": "string",        // qurilmadagi identifikator
 *   "fullName": "string",      // o'quvchi ismi
 *   "faceImage": "base64..."   // yuz rasmi base64 formatda
 * }
 */
app.post('/face/add', async (req, res) => {
  const { faceId, fullName, faceImage } = req.body;

  if (!faceId || !fullName || !faceImage) {
    return res.status(400).json({ error: 'faceId, fullName va faceImage majburiy' });
  }

  console.log(`[FACE/ADD] Adding face for: ${fullName} (${faceId})`);

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

    // Hikvision ISAPI - yuz rasmi yuklash
    const facePayload = {
      FaceDataRecord: {
        faceLibType: 'blackFD',
        FDID: '1',
        FPID: faceId,
      },
    };

    const imageBuffer = Buffer.from(faceImage, 'base64');

    // Multipart form data
    const FormData = require('form-data');
    const form = new FormData();
    form.append('FaceDataRecord', JSON.stringify(facePayload), {
      contentType: 'application/json',
    });
    form.append('img', imageBuffer, {
      filename: `${faceId}.jpg`,
      contentType: 'image/jpeg',
    });

    await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`,
      form,
      {
        auth: deviceAuth,
        headers: form.getHeaders(),
        timeout: 15000,
      }
    );

    console.log(`[FACE/ADD] Successfully added face for ${fullName}`);
    return res.json({ success: true, message: `${fullName} yuz muvaffaqiyatli qo'shildi` });
  } catch (err) {
    console.error(`[FACE/ADD] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Yuz qo\'shishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 3. YUZ O'CHIRISH – backenddan buyruq
// ──────────────────────────────────────
/**
 * Body:
 * {
 *   "faceId": "string"
 * }
 */
app.delete('/face/:faceId', async (req, res) => {
  const { faceId } = req.params;

  console.log(`[FACE/DELETE] Removing face: ${faceId}`);

  try {
    // Hikvision ISAPI - foydalanuvchini o'chirish
    const payload = {
      UserInfoDelCond: {
        EmployeeNoList: [{ employeeNo: faceId }],
      },
    };

    await axios.put(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
      payload,
      { auth: deviceAuth, timeout: 10000 }
    );

    console.log(`[FACE/DELETE] Successfully removed face: ${faceId}`);
    return res.json({ success: true, message: `${faceId} yuz o'chirildi` });
  } catch (err) {
    console.error(`[FACE/DELETE] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Yuz o\'chirishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 4. QURILMA HOLATI – health check
// ──────────────────────────────────────
app.get('/device/status', async (req, res) => {
  console.log(`[DEVICE/STATUS] Checking device health...`);

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
        macAddress: info.macAddress || 'Unknown',
      },
    });
  } catch (err) {
    console.error(`[DEVICE/STATUS] Device offline or unreachable:`, err.message);
    return res.json({
      success: false,
      online: false,
      error: err.message,
    });
  }
});

// ──────────────────────────────────────
// 5. QURILMANI QAYTA ISHGA TUSHIRISH
// ──────────────────────────────────────
app.post('/device/reboot', async (req, res) => {
  console.log(`[DEVICE/REBOOT] Rebooting device...`);

  try {
    await axios.put(
      `${FACE_DEVICE_URL}/ISAPI/System/reboot`,
      null,
      { auth: deviceAuth, timeout: 10000 }
    );

    console.log(`[DEVICE/REBOOT] Reboot command sent successfully`);
    return res.json({ success: true, message: 'Qurilma qayta ishga tushirilmoqda' });
  } catch (err) {
    console.error(`[DEVICE/REBOOT] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Qayta ishga tushirishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 6. BARCHA YUZLAR RO'YXATI
// ──────────────────────────────────────
app.get('/face/list', async (req, res) => {
  console.log(`[FACE/LIST] Fetching all faces from device...`);

  try {
    const payload = {
      UserInfoSearchCond: {
        searchID: '1',
        maxResults: 1000,
        searchResultPosition: 0,
      },
    };

    const response = await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Search?format=json`,
      payload,
      { auth: deviceAuth, timeout: 15000 }
    );

    const users = response.data?.UserInfoSearch?.UserInfo || [];

    return res.json({
      success: true,
      total: users.length,
      users: users.map((u) => ({
        employeeNo: u.employeeNo,
        name: u.name,
        userType: u.userType,
      })),
    });
  } catch (err) {
    console.error(`[FACE/LIST] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Ro\'yxatni olishda xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 7. BACKEND BILAN SINXRONIZATSIYA
// ──────────────────────────────────────
/**
 * Backend chaqiradi – qurilmadagi yuzlarni backend DB bilan solishtirib
 * yangilarini qo'shadi, eskilarini o'chiradi.
 */
app.post('/sync', async (req, res) => {
  console.log(`[SYNC] Starting sync between device and backend...`);

  try {
    // 1. Qurilmadagi barcha yuzlarni olish
    const devicePayload = {
      UserInfoSearchCond: {
        searchID: '1',
        maxResults: 5000,
        searchResultPosition: 0,
      },
    };

    const deviceRes = await axios.post(
      `${FACE_DEVICE_URL}/ISAPI/AccessControl/UserInfo/Search?format=json`,
      devicePayload,
      { auth: deviceAuth, timeout: 15000 }
    );

    const deviceUsers = deviceRes.data?.UserInfoSearch?.UserInfo || [];
    const deviceFaceIds = new Set(deviceUsers.map((u) => u.employeeNo));

    // 2. Backenddan barcha studentlarni olish
    const backendRes = await axios.get(`${BACKEND_URL}/api/students`);
    const backendStudents = backendRes.data || [];
    const backendFaceIds = new Set(backendStudents.map((s) => s.faceId));

    // 3. Backendda bor, qurilmada yo'q – qo'shish kerak
    const toAdd = backendStudents.filter((s) => !deviceFaceIds.has(s.faceId));

    // 4. Qurilmada bor, backendda yo'q – o'chirish kerak
    const toRemove = deviceUsers.filter((u) => !backendFaceIds.has(u.employeeNo));

    const results = { added: [], removed: [], errors: [] };

    // Qo'shish
    for (const student of toAdd) {
      try {
        // Yuz rasmini backenddan olish
        const imgRes = await axios.get(`${BACKEND_URL}/api/students/${student.id}/face-image`, {
          responseType: 'arraybuffer',
        });
        const base64Image = Buffer.from(imgRes.data).toString('base64');

        await axios.post(`http://localhost:${PORT}/face/add`, {
          faceId: student.faceId,
          fullName: student.fullName,
          faceImage: base64Image,
        });

        results.added.push(student.faceId);
      } catch (err) {
        results.errors.push({ faceId: student.faceId, error: err.message });
      }
    }

    // O'chirish
    for (const user of toRemove) {
      try {
        await axios.delete(`http://localhost:${PORT}/face/${user.employeeNo}`);
        results.removed.push(user.employeeNo);
      } catch (err) {
        results.errors.push({ faceId: user.employeeNo, error: err.message });
      }
    }

    console.log(`[SYNC] Done. Added: ${results.added.length}, Removed: ${results.removed.length}, Errors: ${results.errors.length}`);

    return res.json({
      success: true,
      message: 'Sinxronizatsiya tugadi',
      results,
    });
  } catch (err) {
    console.error(`[SYNC] Error:`, err.response?.data || err.message);
    return res.status(500).json({ error: 'Sinxronizatsiyada xatolik', details: err.message });
  }
});

// ──────────────────────────────────────
// 8. MINI-PC HEALTH – o'zi haqida
// ──────────────────────────────────────
app.get('/health', (req, res) => {
  return res.json({
    service: 'mini-pc-bridge',
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    config: {
      backendUrl: BACKEND_URL,
      faceDeviceUrl: FACE_DEVICE_URL,
      port: PORT,
    },
  });
});

// ──────────────────────────────────────
// Start
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   Mini-PC Bridge Server                  ║`);
  console.log(`║   Port: ${PORT}                             ║`);
  console.log(`║   Backend: ${BACKEND_URL.padEnd(28)}║`);
  console.log(`║   Device:  ${FACE_DEVICE_URL.padEnd(28)}║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});
