import paramiko, subprocess, time

proxy = subprocess.Popen(["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"])
time.sleep(5)

def run(ssh, cmd):
    print(f"Running: {cmd[:50]}")
    _, o, e = ssh.exec_command(cmd)
    o.channel.recv_exit_status()

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('localhost', port=2222, username='root', password='testpassword', timeout=15)
    
    run(ssh, 'su - postgres -c "psql -d maktabdb -c \\"ALTER TABLE devices ALTER COLUMN school_id DROP NOT NULL;\\""')
    run(ssh, 'cd /root/maktab-platforma && git pull origin main')
    run(ssh, 'cd /root/maktab-platforma/backend && mvn clean package -DskipTests')
    run(ssh, 'pkill -f "java -jar target/backend-0.0.1-SNAPSHOT.jar" || true')
    run(ssh, 'cd /root/maktab-platforma/backend && nohup java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update > /var/log/maktab-backend.log 2>&1 &')
    print('BACKEND DEPLOYED AND DB FIXED')

finally:
    try: ssh.close()
    except: pass
    proxy.terminate()
