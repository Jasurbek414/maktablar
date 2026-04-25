"""
Mini-PC Server Configuration
Har bir maktabda docker-compose environment orqali sozlanadi
"""
import os

SCHOOL_ID = int(os.environ.get("SCHOOL_ID", "2"))
API_KEY = os.environ.get("API_KEY", "mpc-test-key-12345")
MAIN_BACKEND = os.environ.get("MAIN_BACKEND", "https://maktab.ecos.uz")
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL", "30"))  # sekundda
ISUP_PORT = int(os.environ.get("ISUP_PORT", "7660"))
LOCAL_API_PORT = int(os.environ.get("LOCAL_API_PORT", "8090"))
DB_PATH = os.environ.get("LOCAL_DB", "/app/data/local.db")
PHOTO_DIR = os.environ.get("PHOTO_DIR", "/app/photos")
