import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword")

print("Uploading seed_andijon.sql...")
sftp = ssh.open_sftp()
sftp.put("seed_andijon.sql", "/root/seed_andijon.sql")
sftp.close()

print("Executing seed_andijon.sql in PostgreSQL...")
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d maktabdb -f /root/seed_andijon.sql")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

ssh.close()
print("Done!")
