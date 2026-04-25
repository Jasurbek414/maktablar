import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

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

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

# 1. Git pull
print("[1] Git pull...")
run(ssh, "cd /root/maktab-platforma && git pull origin main 2>&1 | tail -5")

# 2. Frontend rebuild
print("[2] Frontend rebuild...")
run(ssh, "cd /root/maktab-platforma/frontend && npm run build 2>&1 | tail -5")

# 3. Nginx reload
print("[3] Nginx reload...")
run(ssh, "service nginx reload")

print("[4] Tekshirish...")
run(ssh, "curl -s http://localhost/ | grep 'select' | head -3 || echo 'Frontend OK'")

ssh.close()
proxy.terminate()
print("\nCSS TUZATILDI!")
