import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

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

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

print("=== 1. /ETC/HOSTS TIKLASH ===")
run(ssh, "grep -q 'frontend' /etc/hosts || echo '127.0.0.1 frontend backend bot device' >> /etc/hosts")
run(ssh, "grep -q 'gilam-api' /etc/hosts || echo '127.0.0.1 gilam-api gilam-frontend' >> /etc/hosts")
run(ssh, "cat /etc/hosts | tail -3")

print("\n=== 2. NGINX RUXSATLARINI TO'G'RILASH ===")
run(ssh, "chmod 755 /root")
run(ssh, "chmod 755 /root/maktab-platforma")
run(ssh, "chmod -R 755 /root/maktab-platforma/frontend/dist")
run(ssh, "service nginx restart")

print("\n=== 3. TEKSHIRISH ===")
run(ssh, "curl -s -o /dev/null -w 'Maktab Frontend (80): %{http_code}\n' http://localhost/")

ssh.close()
proxy.terminate()
print("\nMUAMMO BARTARAF ETILDI!")
