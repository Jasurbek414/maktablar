#!/usr/bin/env bash
# Backend gateway — backend konteyneri maktab LAN'lariga (Face ID, kameralar) shu konteyner
# orqali chiqadi. Bu konteyner markaziy WireGuard hub'ga ODDIY PEER sifatida TASHQARIGA
# ulanadi (10.20.0.254), shuning uchun backend joylashgan mashina NAT/CGNAT ortida bo'lsa
# ham ishlaydi — hub (VPS) ochiq IP'ga ega bo'lishi kifoya.
#
#   backend --(ip route 10.30.0.0/16 via wg-gateway)--> wg-gateway --wg0--> hub --> Mikrotik --netmap--> qurilma
#
# Hub bu peer'ni backend'ning /api/internal/wg-peers javobidan oladi (WG_GATEWAY_PUBLIC_KEY).
set -euo pipefail

IFACE="wg0"
# Diqqat: ${VAR:?xabar} ichida apostrof ishlatmang — bash uni qo'sh tirnoq ichida ham tirnoq deb o'qiydi.
WG_GATEWAY_PRIVATE_KEY="${WG_GATEWAY_PRIVATE_KEY:?WG_GATEWAY_PRIVATE_KEY .env faylida kerak}"
WG_HUB_PUBLIC_KEY="${WG_HUB_PUBLIC_KEY:?WG_HUB_PUBLIC_KEY .env faylida kerak}"
WG_HUB_ENDPOINT="${WG_HUB_ENDPOINT:?WG_HUB_ENDPOINT host:port .env faylida kerak}"
WG_GATEWAY_IP="${WG_GATEWAY_IP:-10.20.0.254}"
WG_GATEWAY_ROUTES="${WG_GATEWAY_ROUTES:-10.20.0.0/24,10.30.0.0/16}"

mkdir -p /etc/wireguard
umask 077
cat > "/etc/wireguard/${IFACE}.conf" <<EOF
[Interface]
PrivateKey = ${WG_GATEWAY_PRIVATE_KEY}
Address = ${WG_GATEWAY_IP}/32

[Peer]
PublicKey = ${WG_HUB_PUBLIC_KEY}
Endpoint = ${WG_HUB_ENDPOINT}
AllowedIPs = ${WG_GATEWAY_ROUTES}
PersistentKeepalive = 25
EOF

echo "[wg-gateway] Hub'ga ulanmoqda: ${WG_HUB_ENDPOINT} (o'z IP: ${WG_GATEWAY_IP})"
wg-quick up "$IFACE"

# Backend (docker tarmog'idan) kelgan trafik tunnelga gateway IP'si nomidan chiqadi — hub va
# Mikrotik faqat 10.20.0.254 ga ruxsat beradi, docker ichki IP'larini bilishi shart emas.
iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
iptables -P FORWARD DROP
iptables -A FORWARD -o "$IFACE" -j ACCEPT
iptables -A FORWARD -i "$IFACE" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# TCP MSS cheklovi (2026-09-18, jonli nosozlik): backend MSS 1460 e'lon qiladi, terminal ~1500
# baytli segment yuboradi, lekin tunnel yo'li kichikroq (wg0 1420, ba'zi maktablarda OpenVPN) —
# "fragmentatsiya kerak" ICMP xabari qurilmaga yetmaydi va katta javoblar (AcsEvent ro'yxati
# ~1.4KB+) jimgina osilib qoladi. Natijada davomat umuman kelmay qolgan edi. 1300 — wg0 (1380)
# va OpenVPN bo'g'inlari uchun zaxira bilan.
iptables -t mangle -A FORWARD -o "$IFACE" -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1300
iptables -t mangle -A FORWARD -i "$IFACE" -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1300

term_handler() {
    echo "[wg-gateway] To'xtatilmoqda..."
    wg-quick down "$IFACE" || true
    exit 0
}
trap term_handler SIGTERM SIGINT

# WireGuard endpoint domenini faqat bir marta resolve qiladi. Hub IP'si o'zgarsa (DDNS),
# handshake to'xtaydi — shunda endpoint qayta o'rnatilib, domen yangidan resolve qilinadi.
while true; do
    last="$(wg show "$IFACE" latest-handshakes | awk '{print $2}' | head -n1)"
    now="$(date +%s)"
    if [ -z "$last" ] || [ "$last" = "0" ] || [ $(( now - last )) -gt 180 ]; then
        if ! wg set "$IFACE" peer "$WG_HUB_PUBLIC_KEY" endpoint "$WG_HUB_ENDPOINT"; then
            ts="$(date -u +%FT%TZ)"
            echo "[wg-gateway] Ogohlantirish: hub endpoint qayta resolve qilinmadi, vaqt=${ts}"
        fi
    fi
    sleep 60 &
    wait $!
done
