import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

def run(ssh, cmd):
    print(f"$ {cmd[:150]}")
    _, o, e = ssh.exec_command(cmd)
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

print("\n=== MAKTAB BACKEND DEPLOY ===")
run(ssh, "cd /root/maktab-platforma && git pull origin main")
run(ssh, "cd /root/maktab-platforma/backend && chmod +x mvnw && ./mvnw clean package -DskipTests")
run(ssh, "pkill -f 'java -jar target/backend-0.0.1-SNAPSHOT.jar' || true")
run(ssh, "cd /root/maktab-platforma/backend && nohup java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update > /var/log/maktab-backend.log 2>&1 &")
run(ssh, "sleep 5 && pgrep -f 'java -jar'")

ssh.close()
proxy.terminate()
print("\nBACKEND SERVERGA YUKLANDI VA ISHGA TUSHDI!")
