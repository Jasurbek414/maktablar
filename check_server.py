import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('localhost', port=2222, username='team', password='TestServer2026!', timeout=20)
print('CONNECTED!')

cmds = [
    'whoami',
    'ls -la ~',
    'find / -maxdepth 3 -type d \\( -name "maktab*" -o -name "gilam*" \\) 2>/dev/null',
    'which java node npm psql nginx mvn 2>/dev/null || echo "NOT_FOUND"',
    'cat /etc/os-release | head -3',
    'free -h | head -2',
    'df -h / | tail -1',
    'sudo -n ls /root/ 2>/dev/null || echo "NO_SUDO"',
]
for c in cmds:
    print(f'\n>> {c}')
    stdin, o, e = ssh.exec_command(c)
    o.channel.recv_exit_status()
    out = o.read().decode('utf-8','replace').strip()
    err = e.read().decode('utf-8','replace').strip()
    if out: print(out)
    if err: print(f'ERR: {err}')

print('\nCHECK_DONE')
ssh.close()
