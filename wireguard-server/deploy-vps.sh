#!/usr/bin/env bash
# Markaziy WireGuard serverini bo'sh (fresh) Ubuntu/Debian VPS'ga bir buyruq bilan
# joylashtiradi. VPS'ga faqat root SSH kirishi bo'lishi kifoya — Docker, firewall,
# konteyner qurish va ishga tushirish shu skript ichida avtomatik bajariladi.
#
# ISHLATISH:
#   ./deploy-vps.sh root@<VPS_IP> [ssh_key_path]
#
# Talablar: local mashinada ssh/scp (Git Bash/WSL/Linux/macOS'da bor), va shu
# papkadagi ../.env faylida WG_SYNC_SECRET (backend'dagi bilan BIR XIL bo'lishi shart).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:?Ishlatish: ./deploy-vps.sh root@<VPS_IP> [ssh_key_path]}"
SSH_KEY="${2:-}"
REMOTE_DIR="/opt/maktab-wireguard"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
[ -n "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY")

VPS_HOST="${TARGET#*@}"

ssh_run() { ssh "${SSH_OPTS[@]}" "$TARGET" "$@"; }
scp_copy() { scp "${SSH_OPTS[@]}" -r "$@"; }

echo "════════════════════════════════════════════════════════════════"
echo " Maktab WireGuard server deploy — nishon: $TARGET"
echo "════════════════════════════════════════════════════════════════"

# ── 0. Backend'dagi WG_SYNC_SECRET bilan bir xilligini ta'minlash ──
MAIN_ENV="$SCRIPT_DIR/../.env"
if [ ! -f "$MAIN_ENV" ]; then
    echo "XATO: $MAIN_ENV topilmadi — asosiy loyiha .env fayli kerak (WG_SYNC_SECRET shu yerdan olinadi)."
    exit 1
fi
WG_SYNC_SECRET="$(grep -E '^WG_SYNC_SECRET=' "$MAIN_ENV" | head -1 | cut -d= -f2-)"
if [ -z "$WG_SYNC_SECRET" ]; then
    echo "XATO: asosiy .env'da WG_SYNC_SECRET bo'sh."
    exit 1
fi
BACKEND_URL="$(grep -E '^BACKEND_PUBLIC_URL=' "$MAIN_ENV" | head -1 | cut -d= -f2-)"
BACKEND_URL="${BACKEND_URL:-https://maktab.ecos.uz}"

echo "[1/6] SSH ulanishi tekshirilmoqda..."
ssh_run "echo OK" >/dev/null

echo "[2/6] Docker VPS'da bor-yo'qligi tekshirilmoqda..."
if ! ssh_run "command -v docker >/dev/null 2>&1"; then
    echo "      Docker topilmadi — o'rnatilmoqda (get.docker.com)..."
    ssh_run "curl -fsSL https://get.docker.com | sh"
fi

echo "[3/6] Fayllar VPS'ga nusxalanmoqda ($REMOTE_DIR)..."
ssh_run "mkdir -p $REMOTE_DIR"
scp_copy "$SCRIPT_DIR"/Dockerfile "$SCRIPT_DIR"/docker-compose.yml "$SCRIPT_DIR"/entrypoint.sh \
    "$TARGET:$REMOTE_DIR/"

echo "[4/6] .env yaratilmoqda (WG_SYNC_SECRET asosiy loyihadan olindi)..."
ssh_run "cat > $REMOTE_DIR/.env" <<EOF
BACKEND_URL=${BACKEND_URL}
WG_SYNC_SECRET=${WG_SYNC_SECRET}
WG_LISTEN_PORT=51820
WG_SERVER_SUBNET=10.20.0.1/24
SYNC_INTERVAL=15
EOF
ssh_run "chmod 600 $REMOTE_DIR/.env"

echo "[5/6] Firewall (agar ufw faol bo'lsa) UDP 51820 uchun ochilmoqda..."
ssh_run "if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then \
    ufw allow 51820/udp comment 'maktab wireguard' && ufw allow OpenSSH; \
    else echo '      ufw faol emas yoki topilmadi — bu qadam o''tkazib yuborildi (provayder firewall panelidan qo''lda ochish kerak bo''lishi mumkin).'; fi"

echo "[6/6] Konteyner qurilmoqda va ishga tushirilmoqda..."
ssh_run "cd $REMOTE_DIR && docker compose up -d --build"

echo "      15 soniya kutilmoqda (server o'z kalitini generatsiya qilishi uchun)..."
sleep 15

PUB_KEY="$(ssh_run "docker exec maktab-wireguard cat /etc/wireguard/server_public.key" 2>/dev/null || true)"

echo "════════════════════════════════════════════════════════════════"
echo " TAYYOR. Asosiy loyihaning .env fayliga (D:\\...\\maktab_davomad\\.env)"
echo " shu qiymatlarni yozing va 'docker compose up -d backend' bilan qayta ishga tushiring:"
echo
echo "   WG_SERVER_PUBLIC_KEY=${PUB_KEY:-<docker logs maktab-wireguard bilan tekshiring>}"
echo "   WG_SERVER_ENDPOINT=${VPS_HOST}"
echo "   WG_SERVER_PORT=51820"
echo
echo " Keyinchalik qayta deploy qilish uchun shu skriptni yana ishga tushirish yetarli —"
echo " idempotent (mavjud konteynerni qayta quradi, kalitlarni saqlab qoladi)."
echo "════════════════════════════════════════════════════════════════"
