"""
Maktab Platform – Telegram Bot
===============================
Ota-ona uchun Telegram bot.
Vazifalar:
  1. /start – ro'yxatdan o'tish (telefon raqam + parol)
  2. Farzand davomati haqida real-time xabar olish
  3. /stats – kunlik/haftalik davomat statistikasi
"""

import os
import logging
import requests
from flask import Flask, request as flask_request, jsonify
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    ContextTypes,
    filters,
)
import asyncio
import threading

# ──────────────────────────────
# Config
# ──────────────────────────────
BOT_TOKEN = os.environ.get("BOT_TOKEN", "YOUR_BOT_TOKEN")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
PORT = int(os.environ.get("PORT", 5000))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ──────────────────────────────
# Flask – webhook receiver
# ──────────────────────────────
flask_app = Flask(__name__)

# Telegram app (global)
tg_app = None


@flask_app.route("/webhook/attendance", methods=["POST"])
def attendance_webhook():
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

    student_name = data.get("studentName", "Noma'lum")
    event_type = data.get("type", "IN")
    timestamp = data.get("timestamp", "")
    photo_url = data.get("photoUrl")
    school_name = data.get("schoolName", "")
    guardians = data.get("guardians", [])

    # Emoji va xabar matni
    if event_type == "IN":
        emoji = "🟢"
        action = "maktabga kirdi"
    else:
        emoji = "🔴"
        action = "maktabdan chiqdi"

    # Vaqtni formatlash
    time_str = timestamp[11:16] if len(timestamp) >= 16 else timestamp
    date_str = timestamp[:10] if len(timestamp) >= 10 else ""

    caption = (
        f"{emoji} *{student_name}* {action}\n\n"
        f"🏫 Maktab: {school_name}\n"
        f"📅 Sana: {date_str}\n"
        f"🕐 Vaqt: {time_str}\n\n"
        f"_Maktab Platform tizimi_"
    )

    # Har bir guardian(vasiy)ga xabar yuborish
    for guardian in guardians:
        tg_user_id = guardian.get("telegramUserId")
        if tg_user_id:
            try:
                asyncio.run(_send_attendance_notification(
                    int(tg_user_id), caption, photo_url
                ))
                logger.info(f"Sent notification to {tg_user_id} for {student_name}")
            except Exception as e:
                logger.error(f"Failed to send to {tg_user_id}: {e}")

    return jsonify({"success": True}), 200


@flask_app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "telegram-bot", "status": "running"}), 200


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
PHONE, PASSWORD = range(2)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Boshlang'ich buyruq – telefon raqamni so'raydi"""
    keyboard = [[KeyboardButton("📱 Telefon raqamni yuborish", request_contact=True)]]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

    await update.message.reply_text(
        "🏫 **Maktab Platform** botiga xush kelibsiz!\n\n"
        "Farzandingiz davomati haqida real vaqtda xabar olish uchun "
        "ro'yxatdan o'ting.\n\n"
        "📱 Telefon raqamingizni yuboring:",
        reply_markup=reply_markup,
        parse_mode="Markdown",
    )
    return PHONE


async def receive_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Telefon raqamni qabul qilish"""
    contact = update.message.contact
    if contact:
        phone = contact.phone_number
    else:
        phone = update.message.text

    context.user_data["phone"] = phone
    await update.message.reply_text(
        f"📞 Raqam qabul qilindi: `{phone}`\n\n"
        "🔑 Endi parolingizni kiriting (maktab tomonidan berilgan):",
        parse_mode="Markdown",
    )
    return PASSWORD


async def receive_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parolni tekshirish va farzandga bog'lash"""
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
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            children = data.get("children", [])
            children_list = "\n".join(
                [f"  👦 {c.get('fullName', 'Noma`lum')}" for c in children]
            )
            await update.message.reply_text(
                f"✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n"
                f"Farzandlaringiz:\n{children_list}\n\n"
                f"Endi farzandingiz maktabga kirgan/chiqqanda "
                f"avtomatik xabar olasiz! 🔔",
                parse_mode="Markdown",
            )
        elif response.status_code == 401:
            await update.message.reply_text(
                "❌ Parol noto'g'ri. Qaytadan urinib ko'ring.\n"
                "🔑 Parolingizni kiriting:",
            )
            return PASSWORD
        elif response.status_code == 404:
            await update.message.reply_text(
                "❌ Bu telefon raqam tizimda topilmadi.\n"
                "Maktab ma'muriyatiga murojaat qiling.",
            )
        else:
            await update.message.reply_text(
                "⚠️ Xatolik yuz berdi. Keyinroq urinib ko'ring.",
            )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await update.message.reply_text(
            "⚠️ Server bilan aloqa yo'q. Keyinroq urinib ko'ring.",
        )

    return ConversationHandler.END


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Farzand davomati statistikasi"""
    telegram_user_id = str(update.effective_user.id)

    try:
        response = requests.get(
            f"{BACKEND_URL}/api/guardians/telegram/{telegram_user_id}/stats",
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            children = data.get("children", [])

            if not children:
                await update.message.reply_text("📊 Farzand ma'lumotlari topilmadi.")
                return

            msg = "📊 **Davomat statistikasi**\n\n"
            for child in children:
                name = child.get("fullName", "Noma'lum")
                total = child.get("totalDays", 0)
                present = child.get("presentDays", 0)
                absent = child.get("absentDays", 0)
                pct = round((present / total * 100) if total > 0 else 0, 1)

                msg += (
                    f"👦 **{name}**\n"
                    f"   📅 Jami kunlar: {total}\n"
                    f"   ✅ Kelgan: {present}\n"
                    f"   ❌ Kelmagan: {absent}\n"
                    f"   📈 Foiz: {pct}%\n\n"
                )

            await update.message.reply_text(msg, parse_mode="Markdown")
        else:
            await update.message.reply_text(
                "❌ Ma'lumotlarni olishda xatolik. Avval /start buyrug'ini yuboring."
            )
    except Exception as e:
        logger.error(f"Stats error: {e}")
        await update.message.reply_text(
            "⚠️ Server bilan aloqa yo'q. Keyinroq urinib ko'ring.",
        )


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bekor qilish"""
    await update.message.reply_text("❌ Bekor qilindi. Qayta boshlash uchun /start yuboring.")
    return ConversationHandler.END


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yordam"""
    await update.message.reply_text(
        "🏫 **Maktab Platform Bot**\n\n"
        "Buyruqlar:\n"
        "/start – Ro'yxatdan o'tish\n"
        "/stats – Davomat statistikasi\n"
        "/help – Yordam\n\n"
        "Bot farzandingiz maktabga kirgan/chiqqanda "
        "avtomatik xabar yuboradi. 🔔",
        parse_mode="Markdown",
    )


# ──────────────────────────────
# Main
# ──────────────────────────────
def run_flask():
    """Flask serverni alohida threadda ishga tushirish"""
    flask_app.run(host="0.0.0.0", port=PORT, debug=False)


def main():
    global tg_app

    # Telegram bot application
    tg_app = Application.builder().token(BOT_TOKEN).build()

    # Conversation handler – ro'yxatdan o'tish
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            PHONE: [
                MessageHandler(filters.CONTACT, receive_phone),
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_phone),
            ],
            PASSWORD: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_password),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    tg_app.add_handler(conv_handler)
    tg_app.add_handler(CommandHandler("stats", stats))
    tg_app.add_handler(CommandHandler("help", help_command))

    # Flask webhook serverni alohida threadda ishga tushirish
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    logger.info(f"Flask webhook server started on port {PORT}")

    # Telegram botni polling rejimida ishga tushirish
    logger.info("Telegram bot polling mode started...")
    tg_app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
