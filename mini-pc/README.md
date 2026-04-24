# 🖥️ Mini-PC Bridge – O'rnatish yo'riqnomasi

## Talablar
- Windows 10/11 yoki Linux
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Face ID terminal (Hikvision) lokal tarmoqda

## O'rnatish

### 1. Fayllarni nusxalash
`mini-pc` papkasini kompyuterga nusxalang.

### 2. Modullarni o'rnatish
```bash
cd mini-pc
npm install
```

### 3. config.json sozlash
```json
{
  "serverUrl": "https://maktab.ecos.uz",
  "faceDevice": {
    "ip": "192.168.1.100",   // ← Face ID qurilma IP
    "port": 80,
    "username": "admin",
    "password": "admin123"
  },
  "port": 3001
}
```

### 4. Ishga tushirish
```bash
npm start
```

### 5. Ro'yxatdan o'tish (birinchi marta)
```bash
curl -X POST http://localhost:3001/setup -H "Content-Type: application/json" -d '{
  "serverUrl": "https://maktab.ecos.uz",
  "schoolId": "1",
  "username": "director_login",
  "password": "director_parol",
  "faceDeviceIp": "192.168.1.100"
}'
```

Yoki brauzerda `http://localhost:3001/health` orqali holatini tekshiring.

## Windows da avtomatik ishga tushirish (service sifatida)

### PM2 bilan:
```bash
npm install -g pm2
pm2 start server.js --name maktab-bridge
pm2 startup
pm2 save
```

## Endpointlar

| Endpoint | Metod | Vazifa |
|----------|-------|--------|
| `/setup` | POST | Birinchi marta ro'yxatdan o'tish |
| `/event` | POST | Face ID event qabul qilish |
| `/face/add` | POST | Qurilmaga yuz qo'shish |
| `/face/:id` | DELETE | Qurilmadan yuz o'chirish |
| `/face/list` | GET | Qurilmadagi yuzlar ro'yxati |
| `/sync` | POST | Server bilan sinxronizatsiya |
| `/device/status` | GET | Face ID qurilma holati |
| `/device/reboot` | POST | Qurilmani qayta ishga tushirish |
| `/health` | GET | Mini-PC holati |
