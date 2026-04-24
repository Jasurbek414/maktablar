# Maktab Platform – Universal School Attendance System

**Live Demo**: _(to be added when deployed)_

## Overview
A modern, premium‑grade platform that manages **provinces → districts → schools → students** and provides **real‑time attendance tracking** via Face‑ID terminals.  Role‑based dashboards (Super‑admin, Admin, Director, Teacher) give statistical insights, while parents receive instant Telegram notifications.

## Tech Stack
- **Frontend** – React + Vite, TailwindCSS, Inter font – dark‑mode, glass‑morphism UI.
- **Backend** – Spring Boot (Java 17) + Maven, JPA, Spring Security (JWT).
- **Database** – PostgreSQL (Docker).
- **Face‑ID Bridge** – Node.js Express mini‑PC service.
- **Telegram Bot** – Python (`python‑telegram‑bot`).
- **DevOps** – Docker‑Compose, Cloudflare Tunnel.

## Quick Start (local development)
```bash
# clone repo (if you already have it)
git clone <repo‑url>
cd "maktab platforma"

# start all services
docker compose up -d

# Backend (Spring Boot)
cd backend
./mvnw spring-boot:run   # runs on http://localhost:8080

# Frontend (Vite)
cd ../frontend
npm install
npm run dev               # http://localhost:5173

# Mini‑PC bridge
cd ../mini-pc
npm install
npm start                 # http://localhost:3001/event

# Telegram bot
cd ../bot
pip install -r requirements.txt
python bot.py              # runs and listens for attendance events
```

## Project Structure
```
root/
├─ frontend/          # React UI
├─ backend/           # Spring Boot API
├─ mini-pc/           # Face‑ID bridge service
├─ bot/               # Telegram notification bot
├─ db/                # PostgreSQL init scripts
└─ docker-compose.yml
```

---
*All code follows the implementation plan in `implementation_plan.md`.*
