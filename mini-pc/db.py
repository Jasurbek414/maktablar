"""
Mini-PC Local SQLite Database
Offline-first: barcha eventlar avval bu yerga yoziladi
"""
import sqlite3
import os
import logging
from config import DB_PATH

logger = logging.getLogger(__name__)

def init_db():
    """Database yaratish"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS attendance_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            student_name TEXT,
            type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            device_serial TEXT,
            photo_path TEXT,
            temperature REAL,
            sync_key TEXT UNIQUE,
            synced INTEGER DEFAULT 0,
            synced_at TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS students_cache (
            id INTEGER PRIMARY KEY,
            full_name TEXT,
            class_id INTEGER,
            photo_url TEXT,
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS face_terminals (
            device_id TEXT PRIMARY KEY,
            name TEXT,
            ip_address TEXT,
            status TEXT DEFAULT 'OFFLINE',
            last_seen TEXT
        )
    """)

    conn.commit()
    conn.close()
    logger.info(f"Local DB initialized: {DB_PATH}")


def get_conn():
    return sqlite3.connect(DB_PATH)


def save_attendance(student_id, student_name, event_type, timestamp,
                    device_serial=None, photo_path=None, temperature=None):
    """Yangi davomatni lokal DB ga saqlash"""
    from config import SCHOOL_ID
    sync_key = f"{SCHOOL_ID}-{student_id}-{timestamp}-{event_type}"

    conn = get_conn()
    try:
        conn.execute("""
            INSERT OR IGNORE INTO attendance_events
            (student_id, student_name, type, timestamp, device_serial, photo_path, temperature, sync_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (student_id, student_name, event_type, timestamp,
              device_serial, photo_path, temperature, sync_key))
        conn.commit()
        logger.info(f"✅ Attendance saved: {student_name} - {event_type} at {timestamp}")
        return sync_key
    except Exception as e:
        logger.error(f"❌ Attendance save error: {e}")
        return None
    finally:
        conn.close()


def get_unsynced_events(limit=50):
    """Sync bo'lmagan eventlarni olish"""
    conn = get_conn()
    cursor = conn.execute("""
        SELECT id, student_id, student_name, type, timestamp,
               device_serial, photo_path, temperature, sync_key
        FROM attendance_events
        WHERE synced = 0
        ORDER BY id ASC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0], "studentId": r[1], "studentName": r[2],
            "type": r[3], "timestamp": r[4], "deviceSerial": r[5],
            "photoPath": r[6], "temperature": r[7], "syncKey": r[8]
        }
        for r in rows
    ]


def mark_as_synced(sync_keys):
    """Sync bo'lgan eventlarni belgilash"""
    if not sync_keys:
        return
    conn = get_conn()
    placeholders = ",".join(["?"] * len(sync_keys))
    conn.execute(f"""
        UPDATE attendance_events
        SET synced = 1, synced_at = datetime('now', 'localtime')
        WHERE sync_key IN ({placeholders})
    """, sync_keys)
    conn.commit()
    conn.close()


def get_attendance_stats():
    """Bugungi statistika"""
    conn = get_conn()
    cursor = conn.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
            SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as pending
        FROM attendance_events
        WHERE date(timestamp) = date('now', 'localtime')
    """)
    row = cursor.fetchone()
    conn.close()
    return {"total": row[0], "synced": row[1], "pending": row[2]}


def cache_students(students):
    """O'quvchilar ro'yxatini keshga saqlash"""
    conn = get_conn()
    conn.execute("DELETE FROM students_cache")
    for s in students:
        conn.execute("""
            INSERT OR REPLACE INTO students_cache (id, full_name, class_id, photo_url)
            VALUES (?, ?, ?, ?)
        """, (s["id"], s["fullName"], s.get("classId"), s.get("photoUrl")))
    conn.commit()
    conn.close()
    logger.info(f"📋 Cached {len(students)} students")


def get_cached_students():
    """Keshdagi o'quvchilar ro'yxati"""
    conn = get_conn()
    cursor = conn.execute("SELECT id, full_name, class_id FROM students_cache")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "fullName": r[1], "classId": r[2]} for r in rows]
