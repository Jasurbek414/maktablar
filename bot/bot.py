"""
Maktab Platform – Telegram Bot
===============================
Ota-ona uchun Telegram bot.
Vazifalar:
  1. /start – til tanlash + ro'yxatdan o'tish (telefon raqam + parol)
  2. Farzand davomati haqida real-time xabar olish
  3. /stats – kunlik/haftalik davomat statistikasi
"""

import os
import re
import sys
import time
import hmac
import logging
import requests
from flask import Flask, request as flask_request, jsonify
from telegram import (
    Update,
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters,
)
from telegram.error import InvalidToken, NetworkError, TimedOut
import asyncio
import threading

# ──────────────────────────────
# Ko'p tillilik (i18n)
# ──────────────────────────────
MESSAGES = {
    "uz": {
        "choose_language": (
            "🌐 Tilni tanlang / Выберите язык / Choose language:"
        ),
        "welcome_ask_phone": (
            "🏫 **Maktab Platform** botiga xush kelibsiz!\n\n"
            "Farzandingiz davomati haqida real vaqtda xabar olish uchun "
            "ro'yxatdan o'ting.\n\n"
            "📱 Telefon raqamingizni yuboring:"
        ),
        "phone_received": (
            "📞 Raqam qabul qilindi: `{phone}`\n\n"
            "🔑 Endi o'zingiz uchun parol o'ylab toping va kiriting — bu birinchi marta "
            "ro'yxatdan o'tayotganingiz uchun shu parol keyingi safarlarda ham ishlatiladi:"
        ),
        "reg_success": (
            "✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n"
            "Farzandlaringiz:\n{children_list}\n\n"
            "Endi farzandingiz maktabga kirgan/chiqqanda "
            "avtomatik xabar olasiz! 🔔"
        ),
        "reg_child_item": "  👦 {name}",
        "reg_child_unknown": "Noma'lum",
        "reg_wrong_password": (
            "❌ Parol noto'g'ri. Qaytadan urinib ko'ring.\n"
            "🔑 Parolingizni kiriting:"
        ),
        "reg_not_found": (
            "❌ Bu telefon raqam tizimda topilmadi.\n"
            "Maktab ma'muriyatiga murojaat qiling."
        ),
        "reg_error": "⚠️ Xatolik yuz berdi. Keyinroq urinib ko'ring.",
        "reg_no_connection": "⚠️ Server bilan aloqa yo'q. Keyinroq urinib ko'ring.",
        "stats_no_children": "📊 Farzand ma'lumotlari topilmadi.",
        "stats_header": "📊 **Davomat statistikasi**\n\n",
        "stats_child_block": (
            "👦 **{name}**\n"
            "   📅 Jami kunlar: {total}\n"
            "   ✅ Kelgan: {present}\n"
            "   ❌ Kelmagan: {absent}\n"
            "   📈 Foiz: {pct}%\n\n"
        ),
        "stats_error": "❌ Ma'lumotlarni olishda xatolik. Avval /start buyrug'ini yuboring.",
        "stats_no_connection": "⚠️ Server bilan aloqa yo'q. Keyinroq urinib ko'ring.",
        "cancel_msg": "❌ Bekor qilindi. Qayta boshlash uchun /start yuboring.",
        "help_msg": (
            "🏫 **Maktab Platform Bot**\n\n"
            "Buyruqlar:\n"
            "/start – Ro'yxatdan o'tish\n"
            "/stats – Davomat statistikasi\n"
            "/menu – Asosiy menyuni ko'rsatish\n"
            "/help – Yordam\n\n"
            "Yoki pastdagi menyudan foydalaning:\n"
            "📊 Statistika, 💬 Xabar yozish, 🌐 Til, ℹ️ Yordam\n\n"
            "Bot farzandingiz maktabga kirgan/chiqqanda "
            "avtomatik xabar yuboradi. 🔔"
        ),
        "menu_stats": "📊 Statistika",
        "menu_message": "💬 Xabar yozish",
        "menu_language": "🌐 Til",
        "menu_help": "ℹ️ Yordam",
        "menu_intro": "Quyidagi menyudan foydalaning 👇",
        "lang_changed": "✅ Til o'zgartirildi!",
        "msg_choose_child": "Qaysi farzandingiz haqida xabar yozmoqchisiz?",
        "msg_ask_text": "✍️ Xabaringizni yozing (maktab xodimlariga yuboriladi):",
        "msg_sent": "✅ Xabaringiz maktabga yuborildi! Javob kelganda sizga xabar beramiz.",
        "msg_disabled": "⚠️ Xabar yozish funksiyasi hozircha o'chirilgan.",
        "msg_no_children": "❌ Sizga bog'langan farzand topilmadi. Avval /start bilan ro'yxatdan o'ting.",
        "msg_error": "⚠️ Xabar yuborishda xatolik yuz berdi. Keyinroq urinib ko'ring.",
        "msg_no_connection": "⚠️ Server bilan aloqa yo'q. Keyinroq urinib ko'ring.",
        "attendance_in": "maktabga kirdi",
        "attendance_out": "maktabdan chiqdi",
        "attendance_unknown_name": "Noma'lum",
        "attendance_caption": (
            "{emoji} *{student_name}* {action}\n\n"
            "🏫 Maktab: {school_name}\n"
            "📅 Sana: {date_str}\n"
            "🕐 Vaqt: {time_str}\n\n"
            "_Maktab Platform tizimi_"
        ),
        "staff_reply_caption": (
            "💬 *Maktabdan javob* — {student_name}\n\n"
            "👤 {sender_name}:\n{text}"
        ),
        "broadcast_caption": (
            "📢 *Maktab e'loni*\n\n{text}"
        ),
    },
    "ru": {
        "choose_language": (
            "🌐 Tilni tanlang / Выберите язык / Choose language:"
        ),
        "welcome_ask_phone": (
            "🏫 Добро пожаловать в бот **Maktab Platform**!\n\n"
            "Зарегистрируйтесь, чтобы получать уведомления о посещаемости "
            "вашего ребёнка в реальном времени.\n\n"
            "📱 Отправьте ваш номер телефона:"
        ),
        "phone_received": (
            "📞 Номер получен: `{phone}`\n\n"
            "🔑 Теперь придумайте пароль и введите его — так как вы регистрируетесь "
            "впервые, этот пароль будет использоваться и в следующий раз:"
        ),
        "reg_success": (
            "✅ Вы успешно зарегистрированы!\n\n"
            "Ваши дети:\n{children_list}\n\n"
            "Теперь вы будете автоматически получать уведомления, когда "
            "ваш ребёнок приходит в школу или уходит из неё! 🔔"
        ),
        "reg_child_item": "  👦 {name}",
        "reg_child_unknown": "Неизвестно",
        "reg_wrong_password": (
            "❌ Неверный пароль. Попробуйте ещё раз.\n"
            "🔑 Введите пароль:"
        ),
        "reg_not_found": (
            "❌ Этот номер телефона не найден в системе.\n"
            "Обратитесь в администрацию школы."
        ),
        "reg_error": "⚠️ Произошла ошибка. Попробуйте позже.",
        "reg_no_connection": "⚠️ Нет связи с сервером. Попробуйте позже.",
        "stats_no_children": "📊 Данные о детях не найдены.",
        "stats_header": "📊 **Статистика посещаемости**\n\n",
        "stats_child_block": (
            "👦 **{name}**\n"
            "   📅 Всего дней: {total}\n"
            "   ✅ Присутствовал: {present}\n"
            "   ❌ Отсутствовал: {absent}\n"
            "   📈 Процент: {pct}%\n\n"
        ),
        "stats_error": "❌ Ошибка при получении данных. Сначала отправьте команду /start.",
        "stats_no_connection": "⚠️ Нет связи с сервером. Попробуйте позже.",
        "cancel_msg": "❌ Отменено. Чтобы начать заново, отправьте /start.",
        "help_msg": (
            "🏫 **Бот Maktab Platform**\n\n"
            "Команды:\n"
            "/start – Регистрация\n"
            "/stats – Статистика посещаемости\n"
            "/menu – Показать главное меню\n"
            "/help – Помощь\n\n"
            "Или используйте меню внизу:\n"
            "📊 Статистика, 💬 Написать сообщение, 🌐 Язык, ℹ️ Помощь\n\n"
            "Бот автоматически отправляет уведомления, когда ваш ребёнок "
            "приходит в школу или уходит из неё. 🔔"
        ),
        "menu_stats": "📊 Статистика",
        "menu_message": "💬 Написать сообщение",
        "menu_language": "🌐 Язык",
        "menu_help": "ℹ️ Помощь",
        "menu_intro": "Используйте меню ниже 👇",
        "lang_changed": "✅ Язык изменён!",
        "msg_choose_child": "О каком ребёнке вы хотите написать сообщение?",
        "msg_ask_text": "✍️ Напишите ваше сообщение (будет отправлено сотрудникам школы):",
        "msg_sent": "✅ Ваше сообщение отправлено в школу! Мы уведомим вас, когда придёт ответ.",
        "msg_disabled": "⚠️ Функция отправки сообщений временно отключена.",
        "msg_no_children": "❌ У вас нет привязанных детей. Сначала зарегистрируйтесь через /start.",
        "msg_error": "⚠️ Ошибка при отправке сообщения. Попробуйте позже.",
        "msg_no_connection": "⚠️ Нет связи с сервером. Попробуйте позже.",
        "attendance_in": "пришёл(-ла) в школу",
        "attendance_out": "ушёл(-ла) из школы",
        "attendance_unknown_name": "Неизвестно",
        "attendance_caption": (
            "{emoji} *{student_name}* {action}\n\n"
            "🏫 Школа: {school_name}\n"
            "📅 Дата: {date_str}\n"
            "🕐 Время: {time_str}\n\n"
            "_Система Maktab Platform_"
        ),
        "staff_reply_caption": (
            "💬 *Ответ из школы* — {student_name}\n\n"
            "👤 {sender_name}:\n{text}"
        ),
        "broadcast_caption": (
            "📢 *Объявление школы*\n\n{text}"
        ),
    },
    "en": {
        "choose_language": (
            "🌐 Tilni tanlang / Выберите язык / Choose language:"
        ),
        "welcome_ask_phone": (
            "🏫 Welcome to the **Maktab Platform** bot!\n\n"
            "Register to receive real-time notifications about your "
            "child's attendance.\n\n"
            "📱 Please send your phone number:"
        ),
        "phone_received": (
            "📞 Number received: `{phone}`\n\n"
            "🔑 Now think of a password and enter it — since this is your first time "
            "registering, this password will also be used next time:"
        ),
        "reg_success": (
            "✅ You have successfully registered!\n\n"
            "Your children:\n{children_list}\n\n"
            "You will now automatically receive notifications when your "
            "child arrives at or leaves school! 🔔"
        ),
        "reg_child_item": "  👦 {name}",
        "reg_child_unknown": "Unknown",
        "reg_wrong_password": (
            "❌ Incorrect password. Please try again.\n"
            "🔑 Enter your password:"
        ),
        "reg_not_found": (
            "❌ This phone number was not found in the system.\n"
            "Please contact the school administration."
        ),
        "reg_error": "⚠️ An error occurred. Please try again later.",
        "reg_no_connection": "⚠️ No connection to the server. Please try again later.",
        "stats_no_children": "📊 No children's data found.",
        "stats_header": "📊 **Attendance Statistics**\n\n",
        "stats_child_block": (
            "👦 **{name}**\n"
            "   📅 Total days: {total}\n"
            "   ✅ Present: {present}\n"
            "   ❌ Absent: {absent}\n"
            "   📈 Percentage: {pct}%\n\n"
        ),
        "stats_error": "❌ Error retrieving data. Please send /start first.",
        "stats_no_connection": "⚠️ No connection to the server. Please try again later.",
        "cancel_msg": "❌ Cancelled. Send /start to begin again.",
        "help_msg": (
            "🏫 **Maktab Platform Bot**\n\n"
            "Commands:\n"
            "/start – Register\n"
            "/stats – Attendance statistics\n"
            "/menu – Show main menu\n"
            "/help – Help\n\n"
            "Or use the menu below:\n"
            "📊 Statistics, 💬 Write a message, 🌐 Language, ℹ️ Help\n\n"
            "The bot automatically sends a notification when your child "
            "arrives at or leaves school. 🔔"
        ),
        "menu_stats": "📊 Statistics",
        "menu_message": "💬 Write a message",
        "menu_language": "🌐 Language",
        "menu_help": "ℹ️ Help",
        "menu_intro": "Use the menu below 👇",
        "lang_changed": "✅ Language changed!",
        "msg_choose_child": "Which child is this message about?",
        "msg_ask_text": "✍️ Write your message (it will be sent to school staff):",
        "msg_sent": "✅ Your message has been sent to the school! We'll notify you when there's a reply.",
        "msg_disabled": "⚠️ The messaging feature is currently disabled.",
        "msg_no_children": "❌ No children are linked to your account. Please register with /start first.",
        "msg_error": "⚠️ Failed to send the message. Please try again later.",
        "msg_no_connection": "⚠️ No connection to the server. Please try again later.",
        "attendance_in": "arrived at school",
        "attendance_out": "left school",
        "attendance_unknown_name": "Unknown",
        "attendance_caption": (
            "{emoji} *{student_name}* {action}\n\n"
            "🏫 School: {school_name}\n"
            "📅 Date: {date_str}\n"
            "🕐 Time: {time_str}\n\n"
            "_Maktab Platform system_"
        ),
        "staff_reply_caption": (
            "💬 *Reply from school* — {student_name}\n\n"
            "👤 {sender_name}:\n{text}"
        ),
        "broadcast_caption": (
            "📢 *School announcement*\n\n{text}"
        ),
    },
}


def t(lang, key, **kwargs):
    """Berilgan til uchun tarjima matnini qaytaradi (fallback: uz)."""
    template = MESSAGES.get(lang, MESSAGES["uz"]).get(key, MESSAGES["uz"].get(key, key))
    return template.format(**kwargs) if kwargs else template


# Telegram foydalanuvchi -> tanlangan til ("uz"/"ru"/"en").
# Bot hech qanday DB'ga ulanmagan (backend bilan faqat HTTP orqali gaplashadi),
# shuning uchun bu ham xotirada saqlanadi (ConversationHandler holatlari kabi) —
# bot qayta ishga tushganda tozalanadi, bu qabul qilingan holat.
USER_LANGUAGES = {}

# ──────────────────────────────
# Config
# ──────────────────────────────
# BOT_TOKEN env orqali berilishi mumkin (eski usul), lekin placeholder holida
# hisoblanmaydi — shunda token BotConfigController#internalToken orqali
# panel'dan olinadi (pastga qarang: resolve_bot_token()).
_ENV_BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
_PLACEHOLDER_TOKENS = {"", "YOUR_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE"}
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
PORT = int(os.environ.get("PORT", 5000))
# Backend GuardianController /api/guardians/** so'rovlarini shu header bo'lmasa rad etadi
# (avval bu endpointlar hech qanday sekretsiz ochiq edi).
BOT_SHARED_SECRET = os.environ.get("BOT_SHARED_SECRET", "")
if not BOT_SHARED_SECRET:
    # MUHIM (2026-09-18 audit): standart holatda bo'sh qatorga tushib jim ishga tushish
    # o'rniga ("fail closed" — JWT_SECRET'dagi bilan bir xil naqsh) darhol xato bilan
    # to'xtaydi. Aks holda /webhook/* endpointlari (pastda) himoyasiz qolar edi.
    logging.critical(
        "BOT_SHARED_SECRET muhit o'zgaruvchisi o'rnatilmagan — bot xavfsiz ishga tushmaydi. "
        ".env faylida BOT_SHARED_SECRET'ni o'rnating."
    )
    sys.exit(1)
BACKEND_HEADERS = {"X-Bot-Key": BOT_SHARED_SECRET}
TOKEN_RETRY_SECONDS = 30


def resolve_bot_token():
    """
    Tokenni topishga urinadi: avval BOT_TOKEN env (placeholder bo'lmasa),
    aks holda backend'dan (superadmin panel orqali kiritilgan bo'lishi mumkin).
    Topilmasa None qaytaradi — chaqiruvchi kutib qayta urinadi.
    """
    if _ENV_BOT_TOKEN not in _PLACEHOLDER_TOKENS:
        return _ENV_BOT_TOKEN
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/internal/bot-config/token",
            headers=BACKEND_HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            token = resp.json().get("botToken", "")
            return token if token else None
    except requests.RequestException as exc:
        logger.warning(f"Backend'dan bot tokenini olishda xatolik: {exc}")
    return None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# XAVFSIZLIK (2026-09-25 audit): httpx har bir so'rov URL'ini INFO darajasida yozadi, Telegram
# URL'i esa BOT TOKENINI o'z ichiga oladi ("api.telegram.org/bot<TOKEN>/getUpdates"). Natijada
# "docker logs maktab-bot" ni ko'ra oladigan har kim botni to'liq egallab olardi (ota-onalarga
# soxta xabar yuborish). Shu sabab shu kutubxonalarning so'rov loglari o'chiriladi —
# xatolar (WARNING va yuqorisi) baribir yoziladi.
for _noisy in ("httpx", "httpcore", "telegram.request"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

# ──────────────────────────────
# Flask – webhook receiver
# ──────────────────────────────
flask_app = Flask(__name__)

# Telegram app (global)
tg_app = None

# Bot'ning asosiy (polling) event loop'i — _post_init'da o'rnatiladi. Flask thread'idagi
# webhook'lar korutinani shu loop'ga uzatadi (asyncio.run bilan yangi loop yaratmaydi).
BOT_LOOP = None


def _run_on_bot_loop(coro, timeout=20):
    """
    Korutinani bot'ning O'Z event loop'ida bajaradi (Flask thread'idan xavfsiz).
    Loop hali tayyor bo'lmasa (bot token kutayotgan bo'lsa) — False qaytaradi.
    """
    if BOT_LOOP is None or not BOT_LOOP.is_running():
        logger.warning("Bot loop hali tayyor emas — xabar yuborilmadi")
        coro.close()
        return False
    future = asyncio.run_coroutine_threadsafe(coro, BOT_LOOP)
    future.result(timeout=timeout)  # xato bo'lsa exception chaqiruvchiga uzatiladi
    return True


def _authorized_webhook():
    """
    MUHIM (2026-09-18 audit): /webhook/* endpointlari avval hech qanday sekret
    tekshirmasdi — backend ularga X-Bot-Key yuborsa ham, bot buni tasdiqlamasdi.
    Natijada Docker tarmog'idagi istalgan jarayon (yoki noto'g'ri konfiguratsiya
    tufayli tashqaridan yetib bo'lsa) soxta "farzandingiz keldi"/ommaviy xabar
    yuborishga majburlashi mumkin edi. hmac.compare_digest — vaqt asosidagi
    (timing) hujumlardan himoya uchun oddiy == solishtirish o'rniga ishlatiladi.
    """
    key = flask_request.headers.get("X-Bot-Key", "")
    return hmac.compare_digest(key, BOT_SHARED_SECRET)


@flask_app.route("/webhook/attendance", methods=["POST"])
def attendance_webhook():
    if not _authorized_webhook():
        return jsonify({"error": "unauthorized"}), 401
    """
    Backend attendance event yuz berganda shu endpointga POST qiladi.
    Body:
    {
      "studentId": 1,
      "studentName": "Ali Valiyev",
      "type": "IN",
      "timestamp": "2026-04-24T08:30:00+05:00",
      "photoUrl": "https://maktab.ecos.uz/api/files/abc123.jpg",
      "schoolName": "135-maktab",
      "guardians": [
        {"telegramUserId": "123456789", "name": "Ota"}
      ]
    }
    """
    data = flask_request.json
    if not data:
        return jsonify({"error": "No data"}), 400

    event_type = data.get("type", "IN")
    timestamp = data.get("timestamp", "")
    photo_url = data.get("photoUrl")
    school_name = data.get("schoolName", "")
    guardians = data.get("guardians", [])

    # Vaqtni formatlash
    time_str = timestamp[11:16] if len(timestamp) >= 16 else timestamp
    date_str = timestamp[:10] if len(timestamp) >= 10 else ""

    # Har bir guardian(vasiy)ga o'z tilida xabar yuborish
    for guardian in guardians:
        tg_user_id = guardian.get("telegramUserId")
        if tg_user_id:
            lang = guardian.get("language") or USER_LANGUAGES.get(tg_user_id, "uz")
            student_name = data.get("studentName", t(lang, "attendance_unknown_name"))
            emoji = "🟢" if event_type == "IN" else "🔴"
            action = t(lang, "attendance_in") if event_type == "IN" else t(lang, "attendance_out")

            caption = t(
                lang,
                "attendance_caption",
                emoji=emoji,
                student_name=student_name,
                action=action,
                school_name=school_name,
                date_str=date_str,
                time_str=time_str,
            )

            try:
                _run_on_bot_loop(_send_attendance_notification(
                    int(tg_user_id), caption, photo_url
                ))
                logger.info(f"Sent notification to {tg_user_id} for {student_name}")
            except Exception as e:
                logger.error(f"Failed to send to {tg_user_id}: {e}")

    return jsonify({"success": True}), 200


@flask_app.route("/webhook/message", methods=["POST"])
def message_webhook():
    """
    Xodim StudentController orqali javob yozganda backend shu endpointga POST qiladi.
    Body: {"studentId", "studentName", "senderName", "text", "guardianTelegramIds": [...]}
    """
    if not _authorized_webhook():
        return jsonify({"error": "unauthorized"}), 401
    data = flask_request.json
    if not data:
        return jsonify({"error": "No data"}), 400

    student_name = data.get("studentName", "")
    sender_name = data.get("senderName", "")
    text = data.get("text", "")
    guardian_ids = data.get("guardianTelegramIds", [])

    for tg_user_id in guardian_ids:
        lang = USER_LANGUAGES.get(str(tg_user_id), "uz")
        caption = t(lang, "staff_reply_caption", student_name=student_name, sender_name=sender_name, text=text)
        try:
            _run_on_bot_loop(_send_text_notification(int(tg_user_id), caption))
        except Exception as e:
            logger.error(f"Failed to push staff reply to {tg_user_id}: {e}")

    return jsonify({"success": True}), 200


@flask_app.route("/webhook/broadcast", methods=["POST"])
def broadcast_webhook():
    """
    Admin panel'dan ommaviy xabar yuborilganda backend (BroadcastController) shu
    endpointga POST qiladi. Body: {"telegramUserIds": [...], "text"}
    """
    if not _authorized_webhook():
        return jsonify({"error": "unauthorized"}), 401
    data = flask_request.json
    if not data:
        return jsonify({"error": "No data"}), 400

    text = data.get("text", "")
    telegram_ids = data.get("telegramUserIds", [])
    sent = 0

    for tg_user_id in telegram_ids:
        lang = USER_LANGUAGES.get(str(tg_user_id), "uz")
        caption = t(lang, "broadcast_caption", text=text)
        try:
            _run_on_bot_loop(_send_text_notification(int(tg_user_id), caption))
            sent += 1
        except Exception as e:
            logger.error(f"Failed to broadcast to {tg_user_id}: {e}")

    return jsonify({"success": True, "sent": sent}), 200


@flask_app.route("/webhook/admin-alert", methods=["POST"])
def admin_alert_webhook():
    """
    Qurilma aloqasi uzildi/tiklandi (backend DeviceAlertService, 2026-09-19) — superadmin
    kiritgan chat'larga oddiy matn. Body: {"chatIds": [...], "text"}.
    Ota-ona xabarlaridan farqli: sarlavhasiz va parse_mode'siz (maktab nomidagi "_" yoki "*"
    Markdown'ni buzib, xabar umuman ketmay qolmasligi uchun).
    """
    if not _authorized_webhook():
        return jsonify({"error": "unauthorized"}), 401
    data = flask_request.json or {}
    text = str(data.get("text", ""))[:3500]
    chat_ids = data.get("chatIds", [])
    if not text or not chat_ids:
        return jsonify({"error": "chatIds va text kerak"}), 400

    sent = 0
    for chat_id in chat_ids:
        try:
            if _run_on_bot_loop(_send_plain_text(int(chat_id), text)):
                sent += 1
        except Exception as e:
            logger.error(f"Admin ogohlantirishi {chat_id} ga yuborilmadi: {e}")
    return jsonify({"success": sent > 0, "sent": sent}), 200


@flask_app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "telegram-bot", "status": "running"}), 200


async def _send_plain_text(chat_id: int, text: str):
    """Formatlashsiz matn — admin ogohlantirishlari uchun."""
    if not tg_app:
        raise RuntimeError("bot hali tayyor emas")
    await tg_app.bot.send_message(chat_id=chat_id, text=text)


async def chat_id_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/chatid — superadmin qurilma ogohlantirishlari uchun shu chat ID'sini bilib oladi
    (shaxsiy chat yoki guruh). Maxfiy emas: ID bilan bot faqat O'ZI xabar yubora oladi."""
    chat = update.effective_chat
    await update.message.reply_text(
        f"Chat ID: {chat.id}\n\n"
        "Qurilma ogohlantirishlarini shu chatga olish uchun bu raqamni superadmin panelidagi "
        "Bot sozlamalari -> \"Admin ogohlantirish chat ID'lari\" maydoniga kiriting."
    )


async def _send_text_notification(chat_id: int, text: str):
    """Faqat matn (rasmsiz) xabar — javob/broadcast push uchun."""
    global tg_app
    if not tg_app:
        return
    await tg_app.bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")


async def _send_attendance_notification(chat_id: int, caption: str, photo_url: str = None):
    """O'quvchi rasmi bilan xabar yuborish"""
    global tg_app
    if not tg_app:
        return

    if photo_url:
        try:
            await tg_app.bot.send_photo(
                chat_id=chat_id,
                photo=photo_url,
                caption=caption,
                parse_mode="Markdown"
            )
            return
        except Exception as e:
            logger.warning(f"Failed to send photo, falling back to text: {e}")

    # Rasm yo'q bo'lsa yoki rasm yuborishda xato bo'lsa text yuborish
    await tg_app.bot.send_message(chat_id=chat_id, text=caption, parse_mode="Markdown")


# ──────────────────────────────
# Telegram Bot Handlers
# ──────────────────────────────
LANGUAGE, PHONE, PASSWORD = range(3)


def _user_lang(update: Update) -> str:
    """Foydalanuvchi tanlagan tilni qaytaradi, hali tanlamagan bo'lsa "uz" standart."""
    return USER_LANGUAGES.get(str(update.effective_user.id), "uz")


def main_menu_keyboard(lang: str) -> ReplyKeyboardMarkup:
    """Ro'yxatdan o'tgan foydalanuvchiga doimiy ko'rsatiladigan asosiy menyu."""
    keyboard = [
        [KeyboardButton(t(lang, "menu_stats")), KeyboardButton(t(lang, "menu_message"))],
        [KeyboardButton(t(lang, "menu_language")), KeyboardButton(t(lang, "menu_help"))],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


# Menyu tugmalari har uch tilda ham bosilishi mumkin (foydalanuvchi tilni almashtirgan
# bo'lsa-yu, Telegram klienti eski klaviaturani keshlab qolgan bo'lishi mumkin) —
# shu sabab regex barcha tarjimalarni birdan tekshiradi.
def _menu_pattern(key: str) -> str:
    variants = sorted({MESSAGES[lang][key] for lang in MESSAGES})
    escaped = "|".join(re.escape(v) for v in variants)
    return f"^({escaped})$"


MENU_STATS_PATTERN = _menu_pattern("menu_stats")
MENU_MESSAGE_PATTERN = _menu_pattern("menu_message")
MENU_LANGUAGE_PATTERN = _menu_pattern("menu_language")
MENU_HELP_PATTERN = _menu_pattern("menu_help")

# Istalgan menyu tugmasi (barcha tillarda) — ConversationHandler holatlarida bu matnlarni
# "parol"/"telefon"/"xabar matni" sifatida qabul qilmaslik uchun istisno filtri sifatida
# ishlatiladi.
ANY_MENU_PATTERN = "^(" + "|".join(
    re.escape(MESSAGES[lang][key])
    for key in ("menu_stats", "menu_message", "menu_language", "menu_help")
    for lang in MESSAGES
) + ")$"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Boshlang'ich buyruq – avval tilni so'raydi"""
    keyboard = [
        [
            InlineKeyboardButton("🇺🇿 O'zbek", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        t("uz", "choose_language"),
        reply_markup=reply_markup,
    )
    return LANGUAGE


async def select_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Til tanlanganda ishlaydi – tilni saqlaydi va telefon raqamni so'raydi"""
    query = update.callback_query
    await query.answer()

    lang = query.data.replace("lang_", "")
    if lang not in MESSAGES:
        lang = "uz"

    telegram_user_id = str(update.effective_user.id)
    USER_LANGUAGES[telegram_user_id] = lang

    keyboard = [[KeyboardButton("📱 Telefon raqamni yuborish", request_contact=True)]]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

    await query.message.reply_text(
        t(lang, "welcome_ask_phone"),
        reply_markup=reply_markup,
        parse_mode="Markdown",
    )
    return PHONE


async def receive_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Telefon raqamni qabul qilish"""
    lang = _user_lang(update)
    contact = update.message.contact
    if contact:
        phone = contact.phone_number
    else:
        phone = update.message.text

    context.user_data["phone"] = phone
    await update.message.reply_text(
        t(lang, "phone_received", phone=phone),
        parse_mode="Markdown",
    )
    return PASSWORD


async def receive_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parolni tekshirish va farzandga bog'lash"""
    lang = _user_lang(update)
    password = update.message.text
    phone = context.user_data.get("phone", "")
    telegram_user_id = str(update.effective_user.id)

    try:
        # Backendga ro'yxatdan o'tish so'rovi
        response = requests.post(
            f"{BACKEND_URL}/api/guardians/register",
            json={
                "phone": phone,
                "password": password,
                "telegramUserId": telegram_user_id,
            },
            headers=BACKEND_HEADERS,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            children = data.get("children", [])
            children_list = "\n".join(
                [
                    t(lang, "reg_child_item", name=c.get("fullName", t(lang, "reg_child_unknown")))
                    for c in children
                ]
            )
            await update.message.reply_text(
                t(lang, "reg_success", children_list=children_list),
                parse_mode="Markdown",
                reply_markup=main_menu_keyboard(lang),
            )
            # Til tanlovi endi telegramUserId guardian'ga bog'langach doimiy saqlanadi
            # (bot restart bo'lsa ham yo'qolmasligi uchun) — xatolik jim log qilinadi,
            # chunki bu ikkinchi darajali funksiya, ro'yxatdan o'tishni to'xtatmasligi kerak.
            try:
                requests.patch(
                    f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/language",
                    json={"language": lang},
                    headers=BACKEND_HEADERS,
                    timeout=10,
                )
            except requests.RequestException as exc:
                logger.warning(f"Tilni saqlashda xatolik: {exc}")
        elif response.status_code == 401:
            await update.message.reply_text(
                t(lang, "reg_wrong_password"),
            )
            return PASSWORD
        elif response.status_code == 404:
            await update.message.reply_text(
                t(lang, "reg_not_found"),
            )
        else:
            await update.message.reply_text(
                t(lang, "reg_error"),
            )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await update.message.reply_text(
            t(lang, "reg_no_connection"),
        )

    return ConversationHandler.END


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Farzand davomati statistikasi"""
    lang = _user_lang(update)
    telegram_user_id = str(update.effective_user.id)

    try:
        response = requests.get(
            f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/stats",
            headers=BACKEND_HEADERS,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            children = data.get("children", [])

            if not children:
                await update.message.reply_text(t(lang, "stats_no_children"))
                return

            msg = t(lang, "stats_header")
            for child in children:
                name = child.get("fullName", t(lang, "reg_child_unknown"))
                total = child.get("totalDays", 0)
                present = child.get("presentDays", 0)
                absent = child.get("absentDays", 0)
                pct = round((present / total * 100) if total > 0 else 0, 1)

                msg += t(
                    lang,
                    "stats_child_block",
                    name=name,
                    total=total,
                    present=present,
                    absent=absent,
                    pct=pct,
                )

            await update.message.reply_text(msg, parse_mode="Markdown")
        else:
            await update.message.reply_text(t(lang, "stats_error"))
    except Exception as e:
        logger.error(f"Stats error: {e}")
        await update.message.reply_text(
            t(lang, "stats_no_connection"),
        )


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bekor qilish"""
    lang = _user_lang(update)
    await update.message.reply_text(t(lang, "cancel_msg"))
    return ConversationHandler.END


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yordam"""
    lang = _user_lang(update)
    await update.message.reply_text(
        t(lang, "help_msg"),
        parse_mode="Markdown",
    )


async def show_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/menu — asosiy menyuni (doimiy klaviatura) qayta ko'rsatish."""
    lang = _user_lang(update)
    await update.message.reply_text(t(lang, "menu_intro"), reply_markup=main_menu_keyboard(lang))


# ──────────────────────────────
# Til almashtirish (ro'yxatdan o'tgandan keyin, menyudagi 🌐 tugmasi orqali)
# ──────────────────────────────
CHANGE_LANG = range(100, 101)[0]


async def change_language_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("🇺🇿 O'zbek", callback_data="chlang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="chlang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="chlang_en"),
        ]
    ]
    await update.message.reply_text(
        t("uz", "choose_language"),
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return CHANGE_LANG


async def change_language_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    lang = query.data.replace("chlang_", "")
    if lang not in MESSAGES:
        lang = "uz"
    telegram_user_id = str(update.effective_user.id)
    USER_LANGUAGES[telegram_user_id] = lang

    try:
        requests.patch(
            f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/language",
            json={"language": lang},
            headers=BACKEND_HEADERS,
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning(f"Tilni saqlashda xatolik: {exc}")

    await query.message.reply_text(t(lang, "lang_changed"), reply_markup=main_menu_keyboard(lang))
    return ConversationHandler.END


# ──────────────────────────────
# Ota-ona -> maktab xabar yozish (menyudagi 💬 tugmasi orqali)
# ──────────────────────────────
MSG_CHOOSE_CHILD, MSG_WRITE_TEXT = range(101, 103)


async def message_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = _user_lang(update)
    telegram_user_id = str(update.effective_user.id)

    try:
        response = requests.get(
            f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/children",
            headers=BACKEND_HEADERS,
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error(f"Children fetch error: {exc}")
        await update.message.reply_text(t(lang, "msg_no_connection"))
        return ConversationHandler.END

    if response.status_code == 403:
        await update.message.reply_text(t(lang, "msg_disabled"))
        return ConversationHandler.END
    if response.status_code != 200:
        await update.message.reply_text(t(lang, "msg_no_children"))
        return ConversationHandler.END

    children = response.json().get("children", [])
    if not children:
        await update.message.reply_text(t(lang, "msg_no_children"))
        return ConversationHandler.END

    if len(children) == 1:
        context.user_data["msg_student_id"] = children[0]["id"]
        await update.message.reply_text(t(lang, "msg_ask_text"))
        return MSG_WRITE_TEXT

    keyboard = [
        [InlineKeyboardButton(c.get("fullName", "?"), callback_data=f"msgchild_{c['id']}")]
        for c in children
    ]
    await update.message.reply_text(
        t(lang, "msg_choose_child"), reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return MSG_CHOOSE_CHILD


async def message_child_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = _user_lang(update)
    query = update.callback_query
    await query.answer()
    student_id = query.data.replace("msgchild_", "")
    context.user_data["msg_student_id"] = student_id
    await query.message.reply_text(t(lang, "msg_ask_text"))
    return MSG_WRITE_TEXT


async def message_text_received(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = _user_lang(update)
    telegram_user_id = str(update.effective_user.id)
    student_id = context.user_data.get("msg_student_id")
    text = update.message.text

    try:
        response = requests.post(
            f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/messages",
            json={"studentId": student_id, "text": text},
            headers=BACKEND_HEADERS,
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error(f"Send message error: {exc}")
        await update.message.reply_text(t(lang, "msg_no_connection"))
        return ConversationHandler.END

    if response.status_code == 200:
        await update.message.reply_text(t(lang, "msg_sent"), reply_markup=main_menu_keyboard(lang))
    elif response.status_code == 403:
        await update.message.reply_text(t(lang, "msg_disabled"))
    else:
        await update.message.reply_text(t(lang, "msg_error"))

    return ConversationHandler.END


# ──────────────────────────────
# Main
# ──────────────────────────────
def run_flask():
    """Flask serverni alohida threadda ishga tushirish"""
    flask_app.run(host="0.0.0.0", port=PORT, debug=False)


async def _post_init(app: Application):
    """Telegram '/' buyruqlar ro'yxatini har uch til uchun alohida o'rnatadi."""
    # MUHIM (2026-09-15 audit): Flask webhook'lari boshqa THREAD'da ishlaydi va avval har bir
    # xabar uchun asyncio.run(...) chaqirardi — bu HAR SAFAR YANGI event loop yaratadi, holbuki
    # tg_app.bot ichidagi httpx klienti va uning ulanish pool'i polling loop'iga bog'lanib
    # qolgan. Natija: "attached to a different event loop" / "Event loop is closed" xatolari,
    # yopilgan loop'da qolib ketgan TCP ulanishlar va bir nechta thread bitta httpx klientiga
    # parallel kirishi. Endi polling loop'i shu yerda (bot loop'ining o'zida) saqlanadi va
    # webhook'lar unga run_coroutine_threadsafe orqali xavfsiz uzatadi.
    global BOT_LOOP
    BOT_LOOP = asyncio.get_running_loop()
    logger.info("Bot event loop saqlandi (webhook'lar shu loop orqali yuboradi)")
    commands = {
        "uz": [("start", "Ro'yxatdan o'tish"), ("stats", "Davomat statistikasi"),
               ("menu", "Asosiy menyu"), ("help", "Yordam"), ("cancel", "Bekor qilish")],
        "ru": [("start", "Регистрация"), ("stats", "Статистика посещаемости"),
               ("menu", "Главное меню"), ("help", "Помощь"), ("cancel", "Отмена")],
        "en": [("start", "Register"), ("stats", "Attendance statistics"),
               ("menu", "Main menu"), ("help", "Help"), ("cancel", "Cancel")],
    }
    for lang_code, cmds in commands.items():
        try:
            await app.bot.set_my_commands(cmds, language_code=lang_code)
        except Exception as e:
            logger.warning(f"set_my_commands({lang_code}) failed: {e}")
    # Standart (til ko'rsatilmagan) ro'yxat sifatida ham o'zbekchani o'rnatamiz.
    try:
        await app.bot.set_my_commands(commands["uz"])
    except Exception as e:
        logger.warning(f"set_my_commands(default) failed: {e}")


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE):
    """
    Xato ishlovchisi (2026-09-25 audit). Avval umuman ro'yxatdan o'tkazilmagan edi — natijada
    python-telegram-bot har bir tarmoq uzilishida "No error handlers are registered" bilan
    to'liq traceback chiqarardi (tarixda 10 marta), Telegram'ning vaqtinchalik "Bad Gateway"
    javoblari esa xato sifatida ko'rinardi.

    Tarmoq xatolari — vaqtinchalik, kutubxona o'zi qayta urinadi: faqat qisqa ogohlantirish.
    Qolgan xatolar to'liq yoziladi, lekin bot ishlashda davom etadi.
    """
    err = context.error
    if isinstance(err, (NetworkError, TimedOut)):
        logger.warning(f"Telegram bilan vaqtinchalik aloqa muammosi: {type(err).__name__}: {err}")
        return
    logger.error("Botda kutilmagan xato", exc_info=err)


def build_application(token):
    app = Application.builder().token(token).post_init(_post_init).build()

    # Conversation handler – til tanlash + ro'yxatdan o'tish
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            LANGUAGE: [
                CallbackQueryHandler(select_language, pattern="^lang_"),
            ],
            # MUHIM (2026-09-15 audit): menyu tugmalari bu holatlarda telefon/parol sifatida
            # yutib yuborilardi — masalan ro'yxatdan qayta o'tayotgan ota-ona "📊 Statistika"
            # tugmasini bossa, u PAROL sifatida yuborilib "Parol noto'g'ri" xatosi chiqardi va
            # foydalanuvchi cheksiz siklda qolardi. Endi menyu tugmalari istisno qilinadi.
            PHONE: [
                MessageHandler(filters.CONTACT, receive_phone),
                MessageHandler(filters.TEXT & ~filters.COMMAND & ~filters.Regex(ANY_MENU_PATTERN), receive_phone),
            ],
            PASSWORD: [
                MessageHandler(filters.TEXT & ~filters.COMMAND & ~filters.Regex(ANY_MENU_PATTERN), receive_password),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        # MUHIM (2026-09-15 audit): busiz PHONE/PASSWORD holatida /start bosilsa update
        # HECH QAYERGA tushmasdi (states faqat matn kutadi, fallbacks faqat /cancel) —
        # bot jimgina javob bermay qo'yardi va ota-ona chiqib keta olmasdi.
        allow_reentry=True,
    )

    # Til almashtirish (ro'yxatdan o'tgandan keyin, menyu tugmasi orqali) — registratsiya
    # ConversationHandler'idan ALOHIDA, chunki registratsiya allaqachon tugagan bo'ladi.
    change_lang_handler = ConversationHandler(
        entry_points=[MessageHandler(filters.Regex(MENU_LANGUAGE_PATTERN), change_language_start)],
        states={
            CHANGE_LANG: [CallbackQueryHandler(change_language_selected, pattern="^chlang_")],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    # Ota-ona -> maktab xabar yozish
    message_handler = ConversationHandler(
        entry_points=[MessageHandler(filters.Regex(MENU_MESSAGE_PATTERN), message_start)],
        states={
            MSG_CHOOSE_CHILD: [CallbackQueryHandler(message_child_selected, pattern="^msgchild_")],
            # MUHIM (2026-09-15 audit): menyu tugmalari bu yerda "xabar matni" sifatida
            # yutib yuborilardi (masalan "ℹ️ Yordam" bosilsa, xodimlar inbox'iga "ℹ️ Yordam"
            # degan xabar tushardi). Endi menyu tugmalari bu holatda istisno qilinadi va
            # oddiy menyu handler'lariga o'tadi.
            MSG_WRITE_TEXT: [MessageHandler(
                filters.TEXT & ~filters.COMMAND
                & ~filters.Regex(MENU_STATS_PATTERN) & ~filters.Regex(MENU_MESSAGE_PATTERN)
                & ~filters.Regex(MENU_LANGUAGE_PATTERN) & ~filters.Regex(MENU_HELP_PATTERN),
                message_text_received)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        allow_reentry=True,
        # MUHIM (2026-09-15 audit): timeout'siz "💬 Xabar yozish" bosib, keyin fikridan
        # qaytgan ota-ona ABADIY shu holatda qolardi — bir hafta keyin yozgan har qanday
        # matni ham maktabga xabar sifatida ketardi va menyu tugmalari ishlamasdi.
        conversation_timeout=300,
    )

    app.add_handler(conv_handler)
    app.add_handler(change_lang_handler)
    app.add_handler(message_handler)
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("menu", show_menu))
    app.add_handler(CommandHandler("chatid", chat_id_command))
    app.add_error_handler(on_error)
    app.add_handler(MessageHandler(filters.Regex(MENU_STATS_PATTERN), stats))
    app.add_handler(MessageHandler(filters.Regex(MENU_HELP_PATTERN), help_command))
    return app


def main():
    global tg_app

    # Flask webhook serverni alohida threadda, tokendan mustaqil ishga tushirish —
    # shu tufayli konteyner token hali kiritilmagan bo'lsa ham "Up" holatda turadi
    # va restart:always tsiklini tetiklamaydi.
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    logger.info(f"Flask webhook server started on port {PORT}")

    # Token topilmaguncha jarayonni qulatmasdan kutib qayta urinamiz — token
    # superadmin panelidan istalgan vaqt kiritilishi mumkin. MUHIM: run_polling()
    # shu jarayon ichida faqat BIR MARTA chaqiriladi — PTB 21.x + Python 3.12'da
    # ikkinchi chaqiruv "RuntimeError: Event loop is closed" bilan qulaydi (asyncio
    # signal-handler holati eski yopilgan loop'ga bog'lanib qoladi). Shu sabab token
    # noto'g'ri (InvalidToken) chiqsa, tsiklda qayta urinish O'RNIGA butun jarayon
    # sys.exit bilan tugaydi — docker-compose'dagi `restart: always` uni yangi,
    # toza jarayon (yangi event loop) bilan qayta ko'taradi va token yana tekshiriladi.
    while True:
        token = resolve_bot_token()
        if token:
            break
        logger.warning(
            f"Bot tokeni hali sozlanmagan (panel/env). {TOKEN_RETRY_SECONDS}s dan keyin qayta tekshiraman..."
        )
        time.sleep(TOKEN_RETRY_SECONDS)

    try:
        tg_app = build_application(token)
        logger.info("Telegram bot polling mode started...")
        tg_app.run_polling(allowed_updates=Update.ALL_TYPES)
    except InvalidToken:
        logger.error(
            "Bot tokeni yaroqsiz — jarayon to'xtatilmoqda, 'restart: always' uni "
            "qayta ko'taradi va token yangilangan bo'lsa avtomatik ilib oladi."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
