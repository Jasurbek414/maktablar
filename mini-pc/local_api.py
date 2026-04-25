"""
Local API — Mini-PC lokal Flask server
Maktab LAN ichida admin paneldan foydalanish uchun

Port: 8090
"""
import logging
from flask import Flask, request, jsonify
from config import SCHOOL_ID, LOCAL_API_PORT
from db import get_attendance_stats, get_cached_students, save_attendance
from isup_server import get_terminals_info, get_terminal_count

logger = logging.getLogger(__name__)
app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "service": "mini-pc-server",
        "schoolId": SCHOOL_ID,
        "status": "running",
        "terminals": get_terminal_count(),
    })


@app.route("/status", methods=["GET"])
def status():
    """Mini-PC holati — barcha ma'lumotlar"""
    stats = get_attendance_stats()
    terminals = get_terminals_info()
    students = get_cached_students()
    return jsonify({
        "schoolId": SCHOOL_ID,
        "terminals": terminals,
        "terminalCount": get_terminal_count(),
        "attendance": stats,
        "studentsCached": len(students),
    })


@app.route("/terminals", methods=["GET"])
def terminals():
    """Ulangan Face ID terminallar"""
    return jsonify(get_terminals_info())


@app.route("/students", methods=["GET"])
def students():
    """Keshdagi o'quvchilar ro'yxati"""
    return jsonify(get_cached_students())


@app.route("/attendance/manual", methods=["POST"])
def manual_attendance():
    """Qo'lda davomatni kiritish (Face ID ishlamasa)"""
    data = request.json
    sync_key = save_attendance(
        student_id=data["studentId"],
        student_name=data.get("studentName", ""),
        event_type=data.get("type", "IN"),
        timestamp=data.get("timestamp", ""),
    )
    return jsonify({"success": True, "syncKey": sync_key})


@app.route("/stats", methods=["GET"])
def stats():
    """Bugungi statistika"""
    return jsonify(get_attendance_stats())


def start_local_api():
    """Local API serverni ishga tushirish"""
    logger.info(f"🌐 Local API started on port {LOCAL_API_PORT}")
    app.run(host="0.0.0.0", port=LOCAL_API_PORT, debug=False)
