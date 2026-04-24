// server.js - Mini PC bridge for Face ID device
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Backend base URL (Docker service name)
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8080';

/**
 * Expected payload from Face ID terminal:
 * {
 *   "faceId": "string",
 *   "timestamp": "2026-04-24T08:30:00Z"
 * }
 */
app.post('/event', async (req, res) => {
  const { faceId, timestamp } = req.body;
  if (!faceId || !timestamp) {
    return res.status(400).json({ error: 'faceId and timestamp required' });
  }
  try {
    // 1️⃣ Find student by faceId
    const studentRes = await axios.get(`${BACKEND_URL}/api/students/face/${faceId}`);
    const student = studentRes.data;
    if (!student || !student.id) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 2️⃣ Record attendance (type IN/OUT based on your logic – here we simply send IN)
    const attendanceDto = {
      studentId: student.id,
      timestamp,
      type: 'IN', // could be determined by device state
    };
    await axios.post(`${BACKEND_URL}/api/attendance`, attendanceDto);

    // 3️⃣ Respond success
    res.json({ message: 'Attendance recorded', studentId: student.id });
  } catch (err) {
    console.error('Error processing event', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Mini‑PC bridge listening on port ${PORT}`));
