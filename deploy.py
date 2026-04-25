import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

TUNNEL_TOKEN = "eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiNTAxY2FmZGMtZmNmZi00NmExLTk4MjctMmU3MTRmMGRjODMwIiwicyI6Ik1XSXdPV0l4TURJdE16QmxNUzAwWW1RekxXSXhZek10TkdJelpUazRZV0pqTmpsbCJ9"

proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

def run(ssh, cmd, timeout=120):
    print(f"$ {cmd[:150]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    if out.strip():
        for l in out.strip().split("\n")[-10:]: print(f"  {l}")
    if err.strip():
        for l in err.strip().split("\n")[-3:]: print(f"  ! {l}")

def fire(ssh, cmd):
    print(f"$ [fire] {cmd[:120]}")
    ssh.exec_command(cmd)
    time.sleep(2)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

# 1. /etc/hosts — Docker service nomlari localhost ga
print("[1] /etc/hosts sozlash (frontend, backend, bot, device -> localhost)...")
run(ssh, """grep -q 'frontend' /etc/hosts || echo '127.0.0.1 frontend backend bot device' >> /etc/hosts && cat /etc/hosts | tail -3""")

# 2. Xizmatlar ishlayotganini tekshirish
print("[2] Xizmatlar tekshirish...")
run(ssh, "service postgresql status | head -1")
run(ssh, "service nginx status | head -1")
run(ssh, "pgrep -f 'java -jar' > /dev/null && echo 'Backend: OK' || echo 'Backend: OFF'")

# 3. Backend ishga tushirish (agar to'xtagan bo'lsa)
run(ssh, "pgrep -f 'java -jar' > /dev/null || (cd /root/maktab-platforma/backend && nohup java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update > /var/log/maktab-backend.log 2>&1 &)")
time.sleep(3)

# 4. Cloudflared o'rnatish
print("[3] Cloudflared o'rnatish...")
run(ssh, "which cloudflared > /dev/null 2>&1 && echo 'cloudflared mavjud' || (curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb && dpkg -i /tmp/cloudflared.deb && echo 'Installed')", timeout=60)
run(ssh, "cloudflared --version")

# 5. Eski tunnel to'xtatish
print("[4] Eski tunnel to'xtatish...")
run(ssh, "pkill -f 'cloudflared tunnel' 2>/dev/null; sleep 2; echo 'OK'")

# 6. Tunnel ishga tushirish
print("[5] Cloudflare Tunnel ishga tushirish...")
fire(ssh, f"nohup cloudflared tunnel run --token {TUNNEL_TOKEN} > /var/log/cloudflared.log 2>&1 &")

time.sleep(10)

# 7. Tekshirish
print("\n=== YAKUNIY TEKSHIRISH ===")
run(ssh, "pgrep -f 'cloudflared tunnel' > /dev/null && echo 'Tunnel: ISHLAYAPTI' || echo 'Tunnel: ISHLAMAYAPTI'")
run(ssh, "curl -s -o /dev/null -w 'Frontend (localhost:80): HTTP %{http_code}\n' http://localhost:80/")
run(ssh, "curl -s -o /dev/null -w 'Backend  (localhost:8080): HTTP %{http_code}\n' http://localhost:8080/api/auth/me")
run(ssh, "tail -5 /var/log/cloudflared.log")

ssh.close()
proxy.terminate()
print("\nTUGADI! maktab.ecos.uz ni brauzerda tekshiring!")
