#!/bin/sh
# OpenVPN "client-connect" — router ulanganda unga o'z tunnel IP'sini (10.21.0.N) beradi va
# maktab LAN'ini (10.30.N.0/24) shu klientga bog'laydi (iroute). $1 = dinamik konfig fayli,
# $common_name = router logini. exit 0 dan boshqasi — ulanish rad etiladi.
#
# Kernel marshruti (10.30.N.0/24 dev tun0) shu yerda darhol, keyin esa entrypoint.sh sync
# siklida ham (backend holatiga qarab) o'rnatiladi. client-disconnect'da ATAYLAB o'chirilmaydi:
# router qayta ulanganda OpenVPN yangi sessiyani eski sessiya uzilishidan OLDIN ochadi — eski
# sessiyaning disconnect'i yangi sessiya marshrutini o'chirib qo'yardi.
CACHE=/etc/wireguard/ovpn-clients.json

cn="$common_name"
[ -n "$cn" ] && [ -f "$CACHE" ] || exit 1

entry=$(jq -c --arg cn "$cn" '.[] | select(.cn == $cn)' "$CACHE" 2>/dev/null | head -1)
[ -n "$entry" ] || { echo "[ovpn-connect] keshda yo'q: $cn"; exit 1; }

ip=$(echo "$entry" | jq -r '.tunnelIp')
net=$(echo "$entry" | jq -r '.mappedNetwork')
subnet=$(echo "$entry" | jq -r '.mappedSubnet')

ipv4='^([0-9]{1,3}\.){3}[0-9]{1,3}$'
if ! echo "$ip" | grep -Eq "$ipv4" || ! echo "$net" | grep -Eq "$ipv4"; then
    echo "[ovpn-connect] noto'g'ri manzil ($cn): ip=$ip net=$net"
    exit 1
fi

printf 'ifconfig-push %s 255.255.255.0\niroute %s 255.255.255.0\n' "$ip" "$net" > "$1"
ip route replace "$subnet" dev tun0 2>/dev/null || true
echo "[ovpn-connect] $cn -> $ip, maktab LAN $subnet"
exit 0
