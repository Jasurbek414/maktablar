"""
ISUP Server — Hikvision Face ID terminallari uchun TCP server
Terminal LAN orqali bu serverga ulanadi va face eventlarni yuboradi.

Protocol: Hikvision ISUP (EHome) v5
Port: 7660 (default)
"""
import socket
import struct
import threading
import logging
import json
import os
from datetime import datetime
from config import ISUP_PORT, PHOTO_DIR, SCHOOL_ID
from db import save_attendance, get_cached_students

logger = logging.getLogger(__name__)

# Ulangan terminallar
connected_terminals = {}


class ISUPHeader:
    """ISUP paket header parser"""
    MAGIC = b'\x49\x53\x55\x50'  # "ISUP"
    HEADER_SIZE = 32

    @staticmethod
    def parse(data):
        if len(data) < ISUPHeader.HEADER_SIZE:
            return None
        if data[:4] != ISUPHeader.MAGIC:
            return None
        return {
            "magic": data[:4],
            "version": struct.unpack("<H", data[4:6])[0],
            "msg_type": struct.unpack("<H", data[6:8])[0],
            "body_len": struct.unpack("<I", data[8:12])[0],
            "seq": struct.unpack("<I", data[12:16])[0],
            "device_id": data[16:32].decode("utf-8", errors="ignore").strip("\x00"),
        }


def handle_face_event(device_id, event_data):
    """
    Face ID terminaldan kelgan eventni qayta ishlash

    Event data (Hikvision format):
    - employeeNo: o'quvchi ID
    - name: o'quvchi ismi
    - dateTime: vaqt
    - eventType: kirish/chiqish
    - pictureURL yoki binary rasm
    """
    try:
        student_id = event_data.get("employeeNo")
        student_name = event_data.get("name", "Noma'lum")
        timestamp = event_data.get("dateTime", datetime.now().isoformat())
        event_type = "IN"  # default

        # Hikvision event type → IN/OUT
        major_type = event_data.get("major", 0)
        minor_type = event_data.get("minor", 0)
        if minor_type in [0x4B, 0x4D]:  # entry events
            event_type = "IN"
        elif minor_type in [0x4C, 0x4E]:  # exit events
            event_type = "OUT"

        # Rasm saqlash
        photo_path = None
        photo_data = event_data.get("photoData")
        if photo_data:
            os.makedirs(PHOTO_DIR, exist_ok=True)
            fname = f"{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            photo_path = os.path.join(PHOTO_DIR, fname)
            with open(photo_path, "wb") as f:
                f.write(photo_data)
            logger.info(f"📸 Photo saved: {fname}")

        # Lokal DB ga saqlash
        sync_key = save_attendance(
            student_id=int(student_id) if student_id else 0,
            student_name=student_name,
            event_type=event_type,
            timestamp=timestamp,
            device_serial=device_id,
            photo_path=photo_path,
        )

        if sync_key:
            logger.info(
                f"🟢 Face event: {student_name} ({student_id}) "
                f"- {event_type} at {timestamp} from {device_id}"
            )

    except Exception as e:
        logger.error(f"❌ Face event processing error: {e}")


def handle_client(conn, addr):
    """Har bir terminal uchun alohida thread"""
    device_id = "unknown"
    logger.info(f"📡 Terminal connected: {addr}")

    try:
        while True:
            # Header o'qish
            header_data = conn.recv(ISUPHeader.HEADER_SIZE)
            if not header_data:
                break

            header = ISUPHeader.parse(header_data)
            if not header:
                # Non-ISUP data — Hikvision HTTP-style event
                remaining = conn.recv(4096)
                full_data = header_data + remaining
                try:
                    # JSON event parse
                    text = full_data.decode("utf-8", errors="ignore")
                    if "AccessControllerEvent" in text or "employeeNo" in text:
                        json_start = text.find("{")
                        if json_start >= 0:
                            event = json.loads(text[json_start:])
                            handle_face_event(device_id, event)
                except Exception:
                    pass
                continue

            device_id = header["device_id"] or device_id
            body_len = header["body_len"]
            msg_type = header["msg_type"]

            # Body o'qish
            body = b""
            while len(body) < body_len:
                chunk = conn.recv(min(body_len - len(body), 8192))
                if not chunk:
                    break
                body += chunk

            # Terminal ro'yxatga olish
            if device_id not in connected_terminals:
                connected_terminals[device_id] = {
                    "addr": addr,
                    "connected_at": datetime.now().isoformat(),
                    "status": "ONLINE",
                }
                logger.info(f"📷 Terminal registered: {device_id} from {addr}")

            # Event turini aniqlash
            if msg_type == 0x0001:  # Registration
                logger.info(f"📋 Terminal {device_id} registration request")
                # Send ack
                ack = ISUPHeader.MAGIC + struct.pack("<HHI", 5, 0x0002, 0)
                ack += b"\x00" * (ISUPHeader.HEADER_SIZE - len(ack))
                conn.send(ack)

            elif msg_type in [0x0003, 0x0005, 0x1100]:  # Event/Alarm
                try:
                    text = body.decode("utf-8", errors="ignore")
                    event = json.loads(text) if text.strip() else {}
                    handle_face_event(device_id, event)
                except Exception as e:
                    logger.debug(f"Event parse: {e}")

    except ConnectionResetError:
        logger.info(f"📡 Terminal disconnected: {device_id} ({addr})")
    except Exception as e:
        logger.error(f"❌ Terminal error ({device_id}): {e}")
    finally:
        if device_id in connected_terminals:
            connected_terminals[device_id]["status"] = "OFFLINE"
        conn.close()
        logger.info(f"📡 Terminal connection closed: {device_id}")


def get_terminal_count():
    """Online terminal soni"""
    return sum(1 for t in connected_terminals.values() if t.get("status") == "ONLINE")


def get_terminals_info():
    """Terminal ma'lumotlari"""
    return connected_terminals.copy()


def start_isup_server():
    """ISUP TCP serverni ishga tushirish"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", ISUP_PORT))
    server.listen(10)
    logger.info(f"📡 ISUP Server started on port {ISUP_PORT}")

    while True:
        conn, addr = server.accept()
        thread = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
        thread.start()
