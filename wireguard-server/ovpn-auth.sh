#!/bin/sh
# OpenVPN "auth-user-pass-verify ... via-file" — router login/parolini tekshiradi.
# $1 = vaqtinchalik fayl: 1-qator login (routerN), 2-qator parol. exit 0 = ruxsat.
#
# Parollar backenddan kelmaydi — faqat ularning SHA-256 xeshi, hub har sinxronizatsiyada
# yozadigan keshdan (entrypoint.sh#sync_ovpn_clients). Shu sabab backend o'chiq/deploy
# paytida ham routerlar qayta ulana oladi. OpenVPN skriptlarga konteyner muhitini to'liq
# uzatmaydi — yo'l shu yerda qat'iy yozilgan (entrypoint.sh'dagi OVPN_CACHE bilan bir xil).
CACHE=/etc/wireguard/ovpn-clients.json

user=$(sed -n 1p "$1")
pass=$(sed -n 2p "$1")
[ -n "$user" ] && [ -n "$pass" ] && [ -f "$CACHE" ] || exit 1

expected=$(jq -r --arg cn "$user" '.[] | select(.cn == $cn) | .passwordSha256' "$CACHE" 2>/dev/null | head -1)
[ -n "$expected" ] && [ "$expected" != "null" ] || { echo "[ovpn-auth] noma'lum login: $user"; exit 1; }

actual=$(printf '%s' "$pass" | sha256sum | cut -d' ' -f1)
if [ "$actual" = "$expected" ]; then
    exit 0
fi
echo "[ovpn-auth] noto'g'ri parol: $user"
exit 1
