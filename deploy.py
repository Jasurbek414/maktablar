import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

START_SCRIPT = """#!/bin/bash
# Autostart script for Maktab and Gilam projects

# Nginx
service nginx status | grep -q 'Active: active' || service nginx start

# PostgreSQL
service postgresql status | grep -q 'Active: active' || service postgresql start

# Maktab Backend
pgrep -f 'java -jar' > /dev/null || (cd /root/maktab-platforma/backend && nohup java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update > /var/log/maktab-backend.log 2>&1 &)

# Gilam Backend
pgrep -f 'node dist/main' > /dev/null || (cd /root/gilam-platforma/backend && DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD= DB_NAME=gilam_saas JWT_SECRET=gilam-saas-jwt-secret-key-2026 FIREBASE_SERVICE_ACCOUNT_PATH=/root/gilam-platforma/backend/firebase-service-account.json nohup node dist/main > /var/log/gilam-backend.log 2>&1 &)

# Gilam Frontend
pgrep -f 'next start' > /dev/null || (cd /root/gilam-platforma/frontend-app && BACKEND_URL=http://localhost:3000 PORT=3001 nohup npx next start -p 3001 > /var/log/gilam-frontend.log 2>&1 &)

# Tunnels
GILAM_TOKEN="eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiYzk4ZmU3YmQtZDJhMi00MmFmLWI3YzItMTcwNWE1NGExMjQ3IiwicyI6Ik16WmpOVFU0TmpZdE5EaGhPUzAwTTJObExUaG1ZMlV0TmpneE56Y3lNVFUwTlRNME56Sm1ZVGcxT0dFdE1HSTJZaTAwTVRZM0xXSTRaamt0TnpjMVpHUm1Zemt4T1RSayJ9"
MAKTAB_TOKEN="eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiNTAxY2FmZGMtZmNmZi00NmExLTk4MjctMmU3MTRmMGRjODMwIiwicyI6Ik1XSXdPV0l4TURJdE16QmxNUzAwWW1RekxXSXhZek10TkdJelpUazRZV0pqTmpsbCJ9"

# Gilam tunnel
ps aux | grep cloudflared | grep -q "$GILAM_TOKEN" || nohup cloudflared tunnel run --token $GILAM_TOKEN >> /var/log/gilam-tunnel.log 2>&1 &

# Maktab tunnel
ps aux | grep cloudflared | grep -q "$MAKTAB_TOKEN" || nohup cloudflared tunnel run --token $MAKTAB_TOKEN >> /var/log/maktab-tunnel.log 2>&1 &
"""

print("[1] /root/start_all.sh faylini yaratish...")
sftp = ssh.open_sftp()
with sftp.file('/root/start_all.sh', 'w') as f:
    f.write(START_SCRIPT)
sftp.close()
ssh.exec_command("chmod +x /root/start_all.sh")

print("[2] .bashrc fayliga ulash...")
_, o, _ = ssh.exec_command("grep -q 'start_all.sh' /root/.bashrc || echo 'bash /root/start_all.sh > /dev/null 2>&1' >> /root/.bashrc")
o.read()

print("MUVAFFAQIYATLI YAKUNLANDI!")
ssh.close()
proxy.terminate()
