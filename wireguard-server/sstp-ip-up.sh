#!/bin/sh
# pppd ip-up (SSTP, 2026-10-03): router ulanganda maktab LAN'ini (10.30.N.0/24) shu ppp
# interfeysiga yo'naltiradi. pppd: $1 = interfeys; PEERNAME = autentifikatsiyadan o'tgan login.
# Kesh entrypoint.sh#sync_sstp_clients tomonidan yoziladi. Router qayta ulanganda yangi sessiya
# marshrutni "replace" bilan o'ziga oladi; eski interfeys yo'qolganda uning marshruti ham yo'qoladi.
CACHE=/etc/wireguard/sstp-clients.json
STATE=/run/sstp-sessions

iface="$1"
cn="$PEERNAME"
[ -n "$iface" ] && [ -n "$cn" ] && [ -f "$CACHE" ] || exit 0

subnet=$(jq -r --arg cn "$cn" '.[] | select(.cn == $cn) | .mappedSubnet' "$CACHE" 2>/dev/null | head -1)
if ! echo "$subnet" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}/24$'; then
    echo "[sstp-up] keshda yo'q yoki noto'g'ri subnet: $cn" >&2
    exit 0
fi

ip route replace "$subnet" dev "$iface"
mkdir -p "$STATE"
echo "$cn" > "$STATE/$iface"
echo "[sstp-up] $cn -> $iface, maktab LAN $subnet" >&2
exit 0
