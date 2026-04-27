import paramiko, subprocess, time

proxy = subprocess.Popen(["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"])
time.sleep(5)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('localhost', port=2222, username='root', password='testpassword', timeout=15)
    
    print("=== BACKEND LOG ===")
    _, o, e = ssh.exec_command("tail -n 100 /var/log/maktab-backend.log")
    print(o.read().decode())

finally:
    try: ssh.close()
    except: pass
    proxy.terminate()
