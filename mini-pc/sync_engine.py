"""
Sync Engine — Mini-PC ↔ Main Backend sinxronlash
Background thread — har N sekundda batch sync
"""
import logging
import requests
import socket
from config import MAIN_BACKEND, API_KEY, SCHOOL_ID, SYNC_INTERVAL
from db import get_unsynced_events, mark_as_synced, cache_students

logger = logging.getLogger(__name__)


def register_device():
    """Mini-PC ni main backend'ga ro'yxatdan o'tkazish"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "unknown"

    try:
        resp = requests.post(
            f"{MAIN_BACKEND}/api/devices/register",
            json={
                "apiKey": API_KEY,
                "schoolId": SCHOOL_ID,
                "deviceName": f"MiniPC-{SCHOOL_ID}",
                "localIp": local_ip,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            logger.info(f"✅ Device registered: {data}")
            return True
        else:
            logger.error(f"❌ Registration failed: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Registration error (backend offline?): {e}")
        return False


def send_heartbeat(face_terminal_count=0):
    """Heartbeat yuborish"""
    try:
        resp = requests.post(
            f"{MAIN_BACKEND}/api/devices/heartbeat",
            headers={"X-Api-Key": API_KEY},
            json={"faceTerminalCount": face_terminal_count},
            timeout=5,
        )
        if resp.status_code == 200:
            logger.debug("💓 Heartbeat OK")
            return True
        else:
            logger.warning(f"💓 Heartbeat failed: {resp.status_code}")
            return False
    except Exception as e:
        logger.warning(f"💓 Heartbeat error: {e}")
        return False


def sync_events():
    """Sync bo'lmagan eventlarni main backend'ga yuborish"""
    events = get_unsynced_events(limit=50)
    if not events:
        return 0

    logger.info(f"📤 Syncing {len(events)} events...")

    try:
        resp = requests.post(
            f"{MAIN_BACKEND}/api/attendance/sync",
            headers={"X-Api-Key": API_KEY},
            json={"events": events},
            timeout=15,
        )

        if resp.status_code == 200:
            data = resp.json()
            synced = data.get("synced", 0)
            skipped = data.get("skipped", 0)

            # Sync bo'lganlarni belgilash
            results = data.get("results", [])
            synced_keys = [r["syncKey"] for r in results if r.get("status") in ("synced", "duplicate")]
            mark_as_synced(synced_keys)

            logger.info(f"✅ Synced: {synced}, Skipped: {skipped}")
            return synced
        else:
            logger.error(f"❌ Sync failed: {resp.status_code} {resp.text}")
            return 0
    except Exception as e:
        logger.error(f"❌ Sync error (offline?): {e}")
        return 0


def sync_students():
    """Main backend dan o'quvchilar ro'yxatini olish va keshga saqlash"""
    try:
        resp = requests.get(
            f"{MAIN_BACKEND}/api/attendance/students",
            headers={"X-Api-Key": API_KEY},
            params={"schoolId": SCHOOL_ID},
            timeout=10,
        )

        if resp.status_code == 200:
            data = resp.json()
            students = data.get("students", [])
            cache_students(students)
            logger.info(f"📋 Students synced: {len(students)}")
            return students
        else:
            logger.error(f"❌ Student sync failed: {resp.status_code}")
            return []
    except Exception as e:
        logger.error(f"❌ Student sync error: {e}")
        return []
