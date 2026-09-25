#!/bin/bash
# ==============================================================================
# GitHub'dan avtomatik deploy — cron orqali ishga tushiriladi
# ==============================================================================
# Nima qiladi:
#   1. origin/$BRANCH'da yangi commit bor-yo'qligini tekshiradi (git fetch)
#   2. Yangi commit topilsa: git pull (fast-forward) + docker compose up -d --build
#   3. Ishlatilmay qolgan eski docker image'larni tozalaydi
#
# O'rnatish (production serverda, BIR MARTA):
#   1. Ushbu skriptni ishga tushirish huquqiga ega qiling:
#        chmod +x /home/team/maktab-platforma/deploy/auto-deploy.sh
#   2. Crontab'ga qo'shing (har 2 daqiqada tekshiradi):
#        crontab -e
#        */2 * * * * /home/team/maktab-platforma/deploy/auto-deploy.sh >> /home/team/maktab-platforma/deploy/deploy.log 2>&1
#
# Eslatma: .env fayli git'ga kirmaydi (.gitignore'da), shuning uchun
# git pull/reset uni o'chirmaydi — u serverda saqlanib qoladi.
# ==============================================================================
set -euo pipefail

# --- Sozlamalar (kerak bo'lsa o'zgartiring) ---
REPO_DIR="${REPO_DIR:-/home/team/maktab-platforma}"
BRANCH="${BRANCH:-main}"
LOCK_FILE="/tmp/maktab-auto-deploy.lock"

# Bir vaqtda faqat bitta nusxa ishlashi uchun (cron overlapping'ning oldini olish)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Oldingi deploy hali tugamagan, o'tkazib yuborildi."
    exit 0
fi

cd "$REPO_DIR"

git fetch origin "$BRANCH" --quiet

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    # Yangilik yo'q — jim chiqamiz (log'ni to'ldirmaslik uchun)
    exit 0
fi

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yangi commit topildi: $LOCAL_HEAD -> $REMOTE_HEAD"

if ! git merge --ff-only "origin/$BRANCH"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] XATO: fast-forward qilib bo'lmadi (serverda lokal commit/o'zgarish bor?). To'xtatildi." >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] docker compose up -d --build ..."
docker compose up -d --build

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Eski image'lar tozalanmoqda..."
docker image prune -f --filter "until=72h" >/dev/null 2>&1 || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy muvaffaqiyatli tugadi: $REMOTE_HEAD"
echo "=========================================="
