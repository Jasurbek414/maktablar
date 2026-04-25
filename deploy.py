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
        for l in out.strip().split("\n"): print(f"  {l}")
    if err.strip():
        for l in err.strip().split("\n")[-3:]: print(f"  ! {l}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!")

print("\n=== MA'LUMOTLAR BAZASI HOLATI ===")
run(ssh, "psql --version 2>/dev/null || echo 'psql not found'")
run(ssh, "service postgresql status | grep Active 2>/dev/null")

print("\n=== BAZALAR RO'YXATI ===")
run(ssh, "psql -U postgres -c '\\l' 2>/dev/null | grep -E 'maktabdb|gilam_saas|postgres'")

ssh.close()
proxy.terminate()
print("\nTEKSHIRUV TUGADI!")
