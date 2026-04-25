"""
Maktab Platform — Mini-PC Server
=================================
Har bir maktabda o'rnatiladigan server.

Vazifalar:
  1. ISUP TCP server — Face ID qurilmalarni qabul qilish
  2. Lokal SQLite — offline davomatni saqlash
  3. Sync Engine — main backend bilan sinxronlash
  4. Local API — maktab LAN ichida monitoring

Ishga tushirish:
  docker compose up -d
"""
import logging
import threading
import time
from apscheduler.schedulers.background import BackgroundScheduler

from config import SCHOOL_ID, API_KEY, MAIN_BACKEND, SYNC_INTERVAL
from db import init_db
from sync_engine import register_device, send_heartbeat, sync_events, sync_students
from isup_server import start_isup_server, get_terminal_count
from local_api import start_local_api

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("main")


def main():
    logger.info("=" * 60)
    logger.info(f"🏫 Maktab Mini-PC Server")
    logger.info(f"   School ID : {SCHOOL_ID}")
    logger.info(f"   Backend   : {MAIN_BACKEND}")
    logger.info(f"   Sync      : har {SYNC_INTERVAL} sek")
    logger.info("=" * 60)

    # 1. Database yaratish
    init_db()

    # 2. Main backend'ga ro'yxatdan o'tish
    logger.info("📡 Main backend'ga ulanish...")
    for attempt in range(5):
        if register_device():
            break
        logger.info(f"   Qayta urinish ({attempt + 1}/5)...")
        time.sleep(5)

    # 3. O'quvchilar ro'yxatini yuklab olish
    sync_students()

    # 4. Background scheduler
    scheduler = BackgroundScheduler()

    # Har SYNC_INTERVAL sekundda sync
    scheduler.add_job(sync_events, "interval", seconds=SYNC_INTERVAL, id="sync_events")

    # Har 30 sekundda heartbeat
    scheduler.add_job(
        lambda: send_heartbeat(get_terminal_count()),
        "interval", seconds=30, id="heartbeat"
    )

    # Har 5 daqiqada o'quvchilar ro'yxatini yangilash
    scheduler.add_job(sync_students, "interval", minutes=5, id="sync_students")

    scheduler.start()
    logger.info("⏰ Scheduler started")

    # 5. ISUP TCP server (alohida thread)
    isup_thread = threading.Thread(target=start_isup_server, daemon=True)
    isup_thread.start()

    # 6. Local API (asosiy thread)
    start_local_api()


if __name__ == "__main__":
    main()
