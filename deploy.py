import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

TUNNEL_TOKEN = "eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiYzk4ZmU3YmQtZDJhMi00MmFmLWI3YzItMTcwNWE1NGExMjQ3IiwicyI6Ik16WmpOVFU0TmpZdE5EaGhPUzAwTTJObExUaG1ZMlV0TmpneE56Y3lNVFUwTlRNME56Sm1ZVGcxT0dFdE1HSTJZaTAwTVRZM0xXSTRaamt0TnpjMVpHUm1Zamt4T1RSayJ9"

proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

def run(ssh, cmd, timeout=60):
    print(f"$ {cmd[:150]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    if out.strip():
        for l in out.strip().split("\n")[-10:]: print(f"  {l}")
    if err.strip():
        for l in err.strip().split("\n")[-3:]: print(f"  ! {l}")

def fire(ssh, cmd):
    print(f"$ [bg] {cmd[:120]}")
    ssh.exec_command(cmd)
    time.sleep(2)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

# 1. /etc/hosts — gilam-frontend va gilam-api → localhost
print("[1] /etc/hosts yangilash...")
run(ssh, "sed -i '/gilam-api/d; /gilam-frontend/d' /etc/hosts")
run(ssh, "echo '127.0.0.1 gilam-api gilam-frontend' >> /etc/hosts")
run(ssh, "cat /etc/hosts | tail -5")

# 2. Eski tunnel'larni o'chirish
print("[2] Eski tunnel o'chirish...")
run(ssh, "pkill -f 'cloudflared tunnel' 2>/dev/null; sleep 2; echo 'Killed all tunnels'")

# 3. Gilam tunnel ishga tushirish
print("[3] Gilam tunnel ishga tushirish...")
fire(ssh, f"nohup cloudflared tunnel run --token {TUNNEL_TOKEN} > /var/log/gilam-tunnel.log 2>&1 &")

# 4. Maktab tunnel ham qayta ishga tushirish
MAKTAB_TOKEN = "eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiNTAxY2FmZGMtZmNmZi00NmExLTk4MjctMmU3MTRmMGRjODMwIiwicyI6Ik1XSXdPV0l4TURJdE16QmxNUzAwWW1RekxXSXhZek10TkdJelpUazRZV0pqTmpsbCJ9"
print("[4] Maktab tunnel qayta ishga tushirish...")
fire(ssh, f"nohup cloudflared tunnel run --token {MAKTAB_TOKEN} > /var/log/maktab-tunnel.log 2>&1 &")

time.sleep(10)

# 5. Xizmatlar tekshirish
print("\n=== TEKSHIRISH ===")
run(ssh, "curl -s -o /dev/null -w 'Gilam Backend (3000): HTTP %{http_code}\n' http://gilam-api:3000/api/auth/me")
run(ssh, "curl -s -o /dev/null -w 'Gilam Frontend (3001): HTTP %{http_code}\n' http://gilam-frontend:3001/")
run(ssh, "curl -s -o /dev/null -w 'Maktab Backend (8080): HTTP %{http_code}\n' http://localhost:8080/api/auth/me")
run(ssh, "curl -s -o /dev/null -w 'Maktab Frontend (80): HTTP %{http_code}\n' http://localhost:80/")
run(ssh, "pgrep -af 'cloudflared tunnel' 2>/dev/null | head -5")
run(ssh, "tail -3 /var/log/gilam-tunnel.log")

ssh.close()
proxy.terminate()
print("\nHAMMA TUNNEL ISHLAYAPTI!")
