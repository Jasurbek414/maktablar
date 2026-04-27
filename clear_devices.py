import paramiko, subprocess, time

proxy = subprocess.Popen(["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"])
time.sleep(5)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('localhost', port=2222, username='root', password='testpassword', timeout=15)
    _, o, e = ssh.exec_command('su - postgres -c "psql -d maktabdb -c \\"DELETE FROM devices;\\""')
    print(o.read().decode())
finally:
    proxy.terminate()
