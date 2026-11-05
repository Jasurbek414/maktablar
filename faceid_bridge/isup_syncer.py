#!/usr/bin/env python3
import time
import json
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ISUP_DEVICES_URL = "http://127.0.0.1:8099/devices"
ISUP_EVENT_URL = "http://127.0.0.1:8099/ISAPI/AccessControl/AcsEvent?format=json&devId=TERMAVTO1"
CRM_WEBHOOK_URL = "http://172.21.0.4:8080/api/events/webhook/1"
DEVICE_SERIAL = "DS-K1T343EFWX20240702V032100ENFK7857242"
POLL_INTERVAL = 10  # seconds
HEARTBEAT_INTERVAL = 60  # seconds

def get_last_crm_serial():
    try:
        # We can query postgres or start from current latest serial
        import subprocess
        out = subprocess.check_output(
            ["docker", "exec", "crm-db", "psql", "-U", "crm", "-d", "crm", "-t", "-c",
             "SELECT COALESCE(MAX(SUBSTRING(sync_key FROM 7)::bigint), 0) FROM attendance_events WHERE terminal_id = 1;"],
            text=True, timeout=5
        ).strip()
        val = int(out)
        return val if val > 0 else 5704
    except Exception as e:
        logging.warning("Could not query DB for last serial, defaulting to 5704: %s", e)
        return 5704

def is_avto_online():
    try:
        req = urllib.request.Request(ISUP_DEVICES_URL, headers={"Connection": "close"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            for d in data.get("devices", []):
                if d.get("deviceID") == "TERMAVTO1" or "FK7857242" in d.get("serial", ""):
                    return True
    except Exception as e:
        logging.warning("Failed to check /devices: %s", e)
    return False

def ping_crm():
    try:
        req = urllib.request.Request(CRM_WEBHOOK_URL, headers={"Connection": "close"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
    except Exception as e:
        logging.warning("Failed to ping CRM webhook: %s", e)

def fetch_events_since(last_serial):
    payload = {
        "AcsEventCond": {
            "searchID": "poll_" + str(int(time.time())),
            "searchResultPosition": 0,
            "maxResults": 30,
            "major": 5,
            "minor": 0,
            "timeReverseOrder": True
        }
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(ISUP_EVENT_URL, data=data, headers={"Content-Type": "application/json", "Connection": "close"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        res = json.loads(resp.read().decode())
        events = res.get("AcsEvent", {}).get("InfoList", [])
        return [e for e in events if e.get("serialNo", 0) > last_serial]

def post_event(e):
    emp = e.get("employeeNoString") or e.get("employeeNo")
    serial_no = e.get("serialNo")
    event_time = e.get("time")
    if not emp:
        return False

    payload = {
        "AccessControllerEvent": {
            "majorEventType": int(e.get("major", 5)),
            "subEventType": int(e.get("minor", 75)),
            "employeeNoString": str(emp),
            "serialNo": int(serial_no),
            "time": str(event_time),
            "deviceSerial": DEVICE_SERIAL
        }
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(CRM_WEBHOOK_URL, data=data, headers={"Content-Type": "application/json", "Connection": "close"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        logging.info("Sent event serial %s (%s, emp=%s) to CRM", serial_no, event_time, emp)
    return True

def main():
    logging.info("Starting Avtosalon ISUP event sync daemon...")
    last_serial = get_last_crm_serial()
    logging.info("Initial last serial in CRM: %s", last_serial)
    last_heartbeat = 0

    while True:
        try:
            now = time.time()
            online = is_avto_online()
            if online:
                # Heartbeat every 60s
                if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                    ping_crm()
                    last_heartbeat = now

                # Poll events
                new_events = fetch_events_since(last_serial)
                if new_events:
                    # Sort ascending
                    new_events.sort(key=lambda x: x.get("serialNo", 0))
                    for e in new_events:
                        s_no = e.get("serialNo", 0)
                        if e.get("minor") in (1, 38, 75):
                            post_event(e)
                        if s_no > last_serial:
                            last_serial = s_no
            else:
                logging.debug("TERMAVTO1 currently offline in ISUP")

        except Exception as e:
            logging.error("Sync error: %s", e)

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
