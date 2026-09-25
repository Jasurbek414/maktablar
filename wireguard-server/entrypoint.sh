#!/usr/bin/env bash
# Markaziy WireGuard server — maktab_davomad platformasidagi Mikrotik routerlar shu
# konteynerga ulanadi. Peer ro'yxati (qaysi router qaysi ochiq kalit/VPN IP'ga ega)
# umumiy Docker volume ORQALI EMAS, balki backend'ning /api/internal/wg-peers
# endpointidan HTTPS orqali davriy so'ralib olinadi — shu sabab bu konteyner
# istalgan joyda (shu mashina yoki uzoqdagi VPS) backend kodiga tegmasdan ishlaydi.
set -euo pipefail

CONF_DIR="/etc/wireguard"
IFACE="wg0"
PRIV_KEY_FILE="$CONF_DIR/server_private.key"
PUB_KEY_FILE="$CONF_DIR/server_public.key"
WG_CONF="$CONF_DIR/${IFACE}.conf"

BACKEND_URL="${BACKEND_URL:-https://maktab.ecos.uz}"
WG_SYNC_SECRET="${WG_SYNC_SECRET:?WG_SYNC_SECRET environment variable is required}"
WG_LISTEN_PORT="${WG_LISTEN_PORT:-51820}"
WG_SERVER_SUBNET="${WG_SERVER_SUBNET:-10.20.0.1/24}"
SYNC_INTERVAL="${SYNC_INTERVAL:-15}"
# Maktab LAN'lari (Mikrotik netmap orqali 10.30.N.0/24) va ularga kira oladigan yagona peer —
# backend gateway'i. Backend'dagi app.wireguard.mapped-base / gateway-ip bilan bir xil bo'lishi shart.
WG_MAPPED_SUPERNET="${WG_MAPPED_SUPERNET:-10.30.0.0/16}"
WG_GATEWAY_IP="${WG_GATEWAY_IP:-10.20.0.254}"

# OpenVPN zaxira transporti (2026-09-19) — UDP ishlamaydigan maktablar uchun, SHU konteyner
# ichida (wg0 va tun0 bitta tarmoq nomlar fazosida -> host marshrutlari/ko'priklari kerak emas).
# Routerlar ro'yxati backenddan (/api/internal/ovpn-clients) keladi va OVPN_CACHE'ga yoziladi —
# auth/connect skriptlari faqat shu keshni o'qiydi (ovpn-auth.sh, ovpn-connect.sh).
OVPN_ENABLED="${OVPN_ENABLED:-1}"
OVPN_PORT="${OVPN_PORT:-443}"
OVPN_NETWORK="${OVPN_NETWORK:-10.21.0.0}"
OVPN_PKI_DIR="${OVPN_PKI_DIR:-/etc/openvpn/pki}"
OVPN_CACHE="$CONF_DIR/ovpn-clients.json"     # ovpn-*.sh dagi yo'l bilan BIR XIL bo'lishi shart
OVPN_CONF="/etc/openvpn/server.conf"
OVPN_STATUS="/run/openvpn-status.log"
OVPN_IFACE="tun0"
OVPN_PID=""

mkdir -p "$CONF_DIR"

# ── 1. Server kalit juftligini birinchi ishga tushirishda generatsiya qilish ──
if [ ! -f "$PRIV_KEY_FILE" ]; then
    echo "[wireguard] Server kalit juftligi topilmadi — yangi generatsiya qilinmoqda..."
    umask 077
    wg genkey | tee "$PRIV_KEY_FILE" | wg pubkey > "$PUB_KEY_FILE"
    echo "[wireguard] Yaratildi. Ochiq kalit:"
    cat "$PUB_KEY_FILE"
fi

SERVER_PRIVATE_KEY="$(cat "$PRIV_KEY_FILE")"

# ── 2. Boshlang'ich interfeys konfiguratsiyasi (peer'lar keyin dinamik qo'shiladi) ──
cat > "$WG_CONF" <<EOF
[Interface]
PrivateKey = ${SERVER_PRIVATE_KEY}
Address = ${WG_SERVER_SUBNET}
ListenPort = ${WG_LISTEN_PORT}
EOF
chmod 600 "$WG_CONF"

echo "[wireguard] Interfeys ko'tarilmoqda (${IFACE}, port ${WG_LISTEN_PORT})..."
wg-quick up "$IFACE"

# MUHIM (2026-09-17 aniqlandi): bu konteyner backend'ning ICHKI tarmog'iga ham ulanadi
# (docker-compose.yml'dagi ikkinchi "networks:" yozuvi) — lekin Docker ko'pincha SO'NGGI
# ulangan tarmoqni "default route" qilib belgilaydi. Bu tarmoq FAQAT konteynerlar orasidagi
# lokal aloqa uchun, tashqi internetga chiqish yo'li YO'Q — agar u "default" bo'lib qolsa,
# routerlarning WireGuard javob paketlari tashqariga umuman chiqmay qoladi (routerlar "tx"
# ko'rsatadi, lekin hub'ga hech narsa yetib bormaydi). Shu sabab default route'ni haqiqatan
# ham internetga chiqa oladigan interfeysga qo'lda tekshirib/tuzatib qo'yamiz.
fix_default_route() {
    local current_dev current_gw candidate_dev candidate_gw
    current_dev="$(ip route show default | awk '{print $5; exit}')"
    if [ -n "$current_dev" ] && curl -fsS --max-time 4 -o /dev/null "https://1.1.1.1" 2>/dev/null; then
        return 0
    fi
    local dev_label="${current_dev:-nomalum}"
    echo "[wireguard] Ogohlantirish: joriy default route (${dev_label}) orqali internetga chiqib bo'lmadi — boshqa interfeyslar tekshirilmoqda..."
    for candidate_dev in $(ip -o link show | awk -F': ' '{print $2}' | grep -v '^lo$\|^wg'); do
        [ "$candidate_dev" = "$current_dev" ] && continue
        candidate_gw="$(ip route show | awk -v d="$candidate_dev" '$0 ~ "dev "d" " && /scope link/ {split($1,a,"/"); print a[1]; exit}')"
        [ -z "$candidate_gw" ] && continue
        # O'sha subnetning birinchi hosti odatda gateway (Docker bridge konvensiyasi)
        candidate_gw="$(echo "$candidate_gw" | awk -F. '{print $1"."$2"."$3".1"}')"
        ip route replace default via "$candidate_gw" dev "$candidate_dev" 2>/dev/null || continue
        if curl -fsS --max-time 4 -o /dev/null "https://1.1.1.1" 2>/dev/null; then
            echo "[wireguard] Default route tuzatildi: ${candidate_dev} (${candidate_gw}) orqali internet ishlayapti"
            return 0
        fi
    done
    echo "[wireguard] Ogohlantirish: hech qanday interfeys orqali internetga chiqib bo'lmadi — default route o'zgartirilmadi"
}
fix_default_route

# Peer'lar `wg set` bilan qo'shilgani uchun wg-quick maktab subnetlariga route qo'ymaydi —
# kernel 10.30.x.x trafikni wg0'ga yuborishi kerak, qaysi peer'ga ketishini allowed-ips hal qiladi.
ip route replace "$WG_MAPPED_SUPERNET" dev "$IFACE"

# Izolyatsiya: hub orqali faqat backend gateway <-> routerlar/maktab LAN'lari trafigi o'tadi.
# Bir maktab routeri boshqa maktab routeri yoki LAN'iga yeta olmasligi SHART.
iptables -F FORWARD
iptables -P FORWARD DROP
iptables -A FORWARD -i "$IFACE" -o "$IFACE" -s "$WG_GATEWAY_IP" -j ACCEPT
iptables -A FORWARD -i "$IFACE" -o "$IFACE" -d "$WG_GATEWAY_IP" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
echo "[wireguard] Route ${WG_MAPPED_SUPERNET} va izolyatsiya qoidalari o'rnatildi (faqat ${WG_GATEWAY_IP} forward qila oladi)"

# 2026-09-19: avval shu yerda FAQAT router 8 uchun qo'lda qo'yilgan OpenVPN ko'prigi bor edi
# (eth0 -> host tun9, IP'lar qattiq yozilgan). Endi OpenVPN shu konteyner ichida va hamma
# OpenVPN routerlar uchun bir xil: gateway (wg0) <-> OpenVPN routerlar (tun0). Izolyatsiya o'sha:
# faqat gateway yangi ulanish ochadi, maktablar bir-biriga ham, gateway'ga ham o'zi kira olmaydi.
# tun0 hali yo'q bo'lsa ham iptables interfeys nomini qabul qiladi.
iptables -A FORWARD -i "$IFACE" -o "$OVPN_IFACE" -s "$WG_GATEWAY_IP" -j ACCEPT
iptables -A FORWARD -i "$OVPN_IFACE" -o "$IFACE" -d "$WG_GATEWAY_IP" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

echo "════════════════════════════════════════════════════════════════"
echo " WireGuard server tayyor. Backend'ga shu qiymatlarni bering:"
echo "   WG_SERVER_PUBLIC_KEY=$(cat "$PUB_KEY_FILE")"
echo "   WG_SERVER_ENDPOINT=<bu server ochiq IP yoki domeni>"
echo "   WG_SERVER_PORT=${WG_LISTEN_PORT}"
echo "════════════════════════════════════════════════════════════════"

term_handler() {
    echo "[wireguard] To'xtatilmoqda..."
    if [ -n "$OVPN_PID" ]; then kill "$OVPN_PID" 2>/dev/null || true; fi
    wg-quick down "$IFACE" || true
    exit 0
}
trap term_handler SIGTERM SIGINT

# ── 3. Davriy peer sinxronizatsiyasi ──
sync_peers() {
    local response
    if ! response="$(curl -fsS --max-time 8 \
            -H "X-Wg-Sync-Key: ${WG_SYNC_SECRET}" \
            "${BACKEND_URL%/}/api/internal/wg-peers")"; then
        echo "[wireguard] Ogohlantirish: backend'dan peer ro'yxatini olib bo'lmadi ($(date -u +%FT%TZ))"
        return
    fi
    if ! echo "$response" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "[wireguard] Ogohlantirish: backend kutilmagan javob qaytardi — peer'lar o'zgartirilmadi"
        return
    fi

    # Backend'dan kelgan joriy ochiq kalitlar ro'yxati
    local desired_keys
    desired_keys="$(echo "$response" | jq -r '.[].publicKey' | sort -u)"

    # HIMOYA (2026-09-19): 09-18 da backend qayta ishga tushayotgan paytda to'liq bo'lmagan ro'yxat
    # qaytgan va hub GATEWAY peer'ini o'chirib tashlagan — barcha maktablar uzilgan. Ro'yxat bo'sh
    # yoki unda gateway yo'q bo'lsa, bu backend'ning g'ayritabiiy holati: HECH NARSA o'chirilmaydi.
    local safe_to_remove=1
    if [ "$(echo "$response" | jq 'length')" -eq 0 ] \
            || [ "$(echo "$response" | jq '[.[] | select(.role == "gateway")] | length')" -eq 0 ]; then
        echo "[wireguard] Ogohlantirish: backend ro'yxati to'liq emas (bo'sh yoki gateway yo'q) — peer'lar o'chirilmaydi"
        safe_to_remove=0
    fi

    # Hozir wg0'da ro'yxatdan o'tgan (lekin backend endi qaytarmayotgan) peer'larni olib tashlash
    local current_keys
    current_keys="$(wg show "$IFACE" peers 2>/dev/null || true)"
    if [ "$safe_to_remove" = "1" ] && [ -n "$current_keys" ]; then
        while IFS= read -r key; do
            [ -z "$key" ] && continue
            if ! echo "$desired_keys" | grep -qxF "$key"; then
                echo "[wireguard] Peer olib tashlanmoqda (backendda endi yo'q): $key"
                wg set "$IFACE" peer "$key" remove || true
            fi
        done <<< "$current_keys"
    fi

    # Backend'dagi har bir routerni peer sifatida qo'shish/yangilash (idempotent).
    # Bitta noto'g'ri yozuv butun tsiklni to'xtatib qo'ymasligi uchun har bir
    # `wg set` xatosi faqat ogohlantirish sifatida yoziladi (|| true).
    echo "$response" | jq -c '.[]' | while read -r peer; do
        pubkey="$(echo "$peer" | jq -r '.publicKey')"
        # allowedIps: router tunnel IP + maktab virtual LAN (eski backend faqat vpnIp qaytarardi)
        allowed="$(echo "$peer" | jq -r '.allowedIps // .vpnIp')"
        if [ -z "$pubkey" ] || [ "$pubkey" = "null" ] || [ -z "$allowed" ] || [ "$allowed" = "null" ]; then
            continue
        fi
        wg set "$IFACE" peer "$pubkey" allowed-ips "$allowed" \
            || echo "[wireguard] Ogohlantirish: peer qo'shib bo'lmadi ($pubkey)"
    done
}

# ── 4. Handshake hisoboti — router ONLINE/OFFLINE holati shundan aniqlanadi ──
# RouterOS 7 "device-mode=home" rejimida routerning o'zi fetch/scheduler ishlata olmaydi,
# shu sabab heartbeat routerdan emas, tunnelning haqiqiy holatidan (oxirgi handshake) olinadi.
report_handshakes() {
    local payload
    payload="$(wg show "$IFACE" latest-handshakes 2>/dev/null \
        | jq -R -s -c 'split("\n") | map(select(length > 0) | split("\t") | {publicKey: .[0], latestHandshake: (.[1] | tonumber)})')" \
        || return 0
    [ "$payload" = "[]" ] && return 0
    curl -fsS --max-time 8 -o /dev/null \
        -X POST -H "Content-Type: application/json" \
        -H "X-Wg-Sync-Key: ${WG_SYNC_SECRET}" \
        --data "$payload" \
        "${BACKEND_URL%/}/api/internal/wg-handshakes" \
        || echo "[wireguard] Ogohlantirish: handshake hisobotini yuborib bo'lmadi ($(date -u +%FT%TZ))"
}

# ── 5. OpenVPN zaxira transporti ──
start_openvpn() {
    [ "$OVPN_ENABLED" = "1" ] || return 0
    local f
    for f in ca.crt server.crt server.key dh.pem; do
        if [ ! -f "$OVPN_PKI_DIR/$f" ]; then
            echo "[openvpn] Ogohlantirish: $OVPN_PKI_DIR/$f topilmadi — OpenVPN o'chirildi (WireGuard ishlayveradi)"
            OVPN_ENABLED=0
            return 0
        fi
    done
    mkdir -p "$(dirname "$OVPN_CONF")"
    # verify-client-cert none + username-as-common-name: RouterOS klientida sertifikat yo'q,
    # login/parol (routerN) orqali kiriladi. Parollar faqat keshdagi SHA-256 bilan tekshiriladi.
    cat > "$OVPN_CONF" <<EOF
port ${OVPN_PORT}
proto tcp4-server
dev ${OVPN_IFACE}
dev-type tun
topology subnet
server ${OVPN_NETWORK} 255.255.255.0
ca ${OVPN_PKI_DIR}/ca.crt
cert ${OVPN_PKI_DIR}/server.crt
key ${OVPN_PKI_DIR}/server.key
dh ${OVPN_PKI_DIR}/dh.pem
data-ciphers AES-256-GCM:AES-128-GCM
keepalive 10 60
persist-key
verify-client-cert none
username-as-common-name
script-security 2
auth-user-pass-verify /usr/local/bin/ovpn-auth.sh via-file
client-connect /usr/local/bin/ovpn-connect.sh
status ${OVPN_STATUS} 10
status-version 2
verb 3
EOF
    openvpn --config "$OVPN_CONF" &
    OVPN_PID=$!
    echo "[openvpn] Ishga tushdi: TCP ${OVPN_PORT}, ${OVPN_IFACE} ${OVPN_NETWORK}/24 (pid ${OVPN_PID})"
}

ensure_openvpn() {
    [ "$OVPN_ENABLED" = "1" ] || return 0
    if [ -z "$OVPN_PID" ] || ! kill -0 "$OVPN_PID" 2>/dev/null; then
        echo "[openvpn] Ogohlantirish: jarayon to'xtagan — qayta ishga tushirilmoqda"
        start_openvpn
    fi
}

# OpenVPN routerlar keshi + ularning maktab LAN marshrutlari (backend — yagona haqiqat manbai).
# Backend javob bermasa eski kesh qoladi: ulangan routerlar ishlayveradi, qayta ulanganlar ham kiradi.
MAPPED_PREFIX="$(echo "$WG_MAPPED_SUPERNET" | cut -d. -f1-2)."
sync_ovpn_clients() {
    [ "$OVPN_ENABLED" = "1" ] || return 0
    local response
    if ! response="$(curl -fsS --max-time 8 \
            -H "X-Wg-Sync-Key: ${WG_SYNC_SECRET}" \
            "${BACKEND_URL%/}/api/internal/ovpn-clients")"; then
        echo "[openvpn] Ogohlantirish: backend'dan klientlar ro'yxatini olib bo'lmadi — eski kesh ishlatiladi"
        return 0
    fi
    if ! echo "$response" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "[openvpn] Ogohlantirish: kutilmagan javob — kesh o'zgartirilmadi"
        return 0
    fi
    echo "$response" > "${OVPN_CACHE}.tmp" && chmod 600 "${OVPN_CACHE}.tmp" && mv -f "${OVPN_CACHE}.tmp" "$OVPN_CACHE"

    # Marshrutlar: OpenVPN'dagi har bir maktab LAN'i (10.30.N.0/24) tun0'ga. WireGuard'ga qaytgan
    # routerniki tun0'dan olib tashlanadi va yana umumiy "10.30.0.0/16 dev wg0" ga tushadi.
    # tun0'ning o'z tarmog'i (10.21.0.0/24) mapped oralig'ida emas — unga tegilmaydi.
    ip link show "$OVPN_IFACE" >/dev/null 2>&1 || return 0
    local desired current s
    desired="$(jq -r '.[].mappedSubnet' "$OVPN_CACHE" | grep -F "$MAPPED_PREFIX" | sort -u || true)"
    current="$(ip route show dev "$OVPN_IFACE" | awk -v p="$MAPPED_PREFIX" 'index($1, p) == 1 {print $1}' | sort -u || true)"
    while IFS= read -r s; do
        [ -z "$s" ] && continue
        ip route replace "$s" dev "$OVPN_IFACE" 2>/dev/null \
            || echo "[openvpn] Ogohlantirish: marshrut qo'yib bo'lmadi ($s)"
    done <<< "$desired"
    while IFS= read -r s; do
        [ -z "$s" ] && continue
        if ! echo "$desired" | grep -qxF "$s"; then
            echo "[openvpn] Marshrut olib tashlanmoqda (router endi OpenVPN'da emas): $s"
            ip route del "$s" dev "$OVPN_IFACE" 2>/dev/null || true
        fi
    done <<< "$current"
}

# Ulangan OpenVPN routerlar — routerning haqiqiy heartbeat'i (WireGuard handshake hisoboti kabi).
report_ovpn_status() {
    [ "$OVPN_ENABLED" = "1" ] && [ -f "$OVPN_STATUS" ] || return 0
    local payload
    payload="$(awk -F, '$1 == "CLIENT_LIST" && $2 != "UNDEF" {print $2}' "$OVPN_STATUS" \
        | sort -u | jq -R -s -c 'split("\n") | map(select(length > 0))')" || return 0
    [ "$payload" = "[]" ] && return 0
    curl -fsS --max-time 8 -o /dev/null \
        -X POST -H "Content-Type: application/json" \
        -H "X-Wg-Sync-Key: ${WG_SYNC_SECRET}" \
        --data "$payload" \
        "${BACKEND_URL%/}/api/internal/ovpn-status" \
        || echo "[openvpn] Ogohlantirish: holat hisobotini yuborib bo'lmadi ($(date -u +%FT%TZ))"
}

# Kesh avval yangilanadi — birinchi ulangan router darhol autentifikatsiyadan o'tishi uchun
sync_ovpn_clients || true
start_openvpn

echo "[wireguard] Peer sinxronizatsiyasi boshlandi (har ${SYNC_INTERVAL}s, ${BACKEND_URL})"
while true; do
    # Docker HEALTHCHECK shu faylning yangiligini tekshiradi (loop jonligini
    # bildiradi). Backend vaqtincha ishlamay qolsa ham mavjud tunnel buzilmasligi
    # kerak, shuning uchun curl xatosi konteynerni "unhealthy" qilmaydi — faqat
    # loop butunlay to'xtab qolsa (masalan skript ichida kutilmagan chiqish) aniqlanadi.
    date +%s > /tmp/wg-loop-alive
    sync_peers || echo "[wireguard] Ogohlantirish: sync_peers xato bilan tugadi, keyingi urinishda davom etadi"
    ensure_openvpn || true
    sync_ovpn_clients || echo "[openvpn] Ogohlantirish: sync_ovpn_clients xato bilan tugadi"
    report_handshakes || true
    report_ovpn_status || true
    sleep "$SYNC_INTERVAL" &
    wait $!
done
