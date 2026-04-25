import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

def run(ssh, cmd, timeout=60):
    print(f"$ {cmd[:120]}")
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

# Fix Nginx - proper config
print("[1] Nginx config tuzatish...")
nginx_conf = '''server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /root/maktab-platforma/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}'''
run(ssh, f"cat > /etc/nginx/sites-available/default << 'NGINXEOF'\n{nginx_conf}\nNGINXEOF")
run(ssh, "nginx -t && service nginx restart")

# Fix root home permissions for Nginx
print("[2] Ruxsatlar...")
run(ssh, "chmod 755 /root && chmod -R 755 /root/maktab-platforma/frontend/dist")

# Restart nginx
run(ssh, "service nginx restart")

# Test
print("\n=== TEST ===")
run(ssh, "curl -s -o /dev/null -w 'Frontend: HTTP %{http_code}\n' http://localhost:80/")
run(ssh, "curl -s -o /dev/null -w 'Backend:  HTTP %{http_code}\n' http://localhost:80/api/auth/me")
run(ssh, "curl -s http://localhost:80/ | head -5")

ssh.close()
proxy.terminate()
print("\nTUGADI!")
