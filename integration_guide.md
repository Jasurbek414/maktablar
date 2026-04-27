# Maktab Platformasi: Face ID Qurilmalarini Integratsiya Qilish Qo'llanmasi

Ushbu qo'llanma "Maktab Platformasi" tizimiga yuzni tanish (Face ID) qurilmalarini (xususan Hikvision terminallarini) qanday qilib ikki xil usulda ulash mumkinligini tushuntiradi.

---

## 1-USUL: Mini-PC orqali lokal integratsiya (Joriy usul)

Bu usulda har bir maktabning mahalliy tarmog'iga (LAN) bitta kompyuter (Mini-PC yoki oddiy kompyuter) o'rnatiladi. Face ID terminallar ushbu Mini-PC'ga ulanadi va Mini-PC olingan ma'lumotlarni markaziy serverga jo'natadi.

### 1.1 Afzalliklari
- **Oflayn barqarorlik:** Internet uzilib qolsa ham, Mini-PC davomatni o'z bazasida saqlab turadi. Internet ulanishi bilan barchasini serverga jo'natadi.
- **Tezkorlik:** Mahalliy tarmoq doirasida ishlagani sababli qurilmalar va Mini-PC o'rtasida aloqa juda tez bo'ladi.
- **Qurilmalar yuklamasi kam:** Face ID terminallar og'ir ishlarni emas, faqat yuzni tanib olishni amalga oshiradi, qolgan hamma narsa Mini-PC da bajariladi.

### 1.2 O'rnatish va Sozlash

1. **Maktab tarmog'ini sozlash:**
   - Mini-PC va barcha Face ID terminallar bitta Switch (tarmoq) orqali ulanadi.
   - Mini-PC'ning lokal IP manzili statik bo'lishi kerak (masalan, `192.168.1.100`).

2. **Mini-PC dasturini o'rnatish:**
   - Mini-PC'ga Docker va Docker Compose o'rnatilgan bo'lishi lozim.
   - Platformaning `mini-pc` papkasi ichidagi dastur olinadi.
   - `config.py` (yoki `.env`) faylida quyidagi ma'lumotlar kiritiladi:
     - `SCHOOL_ID` — Maktabning platformadagi noyob ID'si (Masalan: `2`)
     - `API_KEY` — Ushbu Mini-PC uchun generatsiya qilingan maxfiy kalit.
     - `MAIN_BACKEND` — `https://maktab.ecos.uz`

3. **Ishga tushirish:**
   - Dasturni ishga tushirish uchun quyidagi komanda yoziladi:
     ```bash
     docker compose up -d
     ```
   - Dastur ishga tushgach, avtomatik ravishda 7660 portida ISUP/EHome serverni ko'taradi.

4. **Face ID Terminallarni sozlash:**
   - Hikvision qurilmasining menyusiga (yoki web interfeysiga) kirib, **Network -> Advanced -> ISUP (EHome)** bo'limiga o'tiladi.
   - ISUP versiyasini `V5.0` qilib tanlang.
   - Server manziliga Mini-PC'ning IP manzilini yozing (masalan, `192.168.1.100`).
   - Server porti: `7660` (default).
   - Device ID va Password ixtiyoriy (yoki xavfsizlik uchun belgilangan) kiritiladi.
   - Saqlang va qurilmani qayta ishga tushiring.

Mini-PC avtomatik ravishda onlayn qurilmalarni aniqlaydi, yuz skaner qilinganda "IN" yoki "OUT" ma'lumotini shakllantirib, `maktab.ecos.uz` ga jo'natadi!

---

## 2-USUL: Cloud ISUP Server orqali to'g'ridan-to'g'ri integratsiya (Kelajak modeli)

Bu usulda hech qanday lokal Mini-PC ishlatilmaydi. Barcha maktablardagi Face ID terminallar internet orqali to'g'ridan-to'g'ri yagona markaziy bulut (Cloud) ISUP serveriga ulanadi.

### 2.1 Afzalliklari
- **Infratuzilma xarajati arzon:** Maktablarga qo'shimcha Mini-PC xarid qilish shart emas. Bitta router va internet bo'lsa kifoya.
- **Markazlashgan boshqaruv:** Barcha maktablardagi qurilmalar va ularning holatlari bitta serverdan kuzatib boriladi. Xatoliklar oson topiladi.
- **Oson o'rnatish:** Texnik xodim faqatgina IP manzil va Cloud IP kiritishi orqaligina terminallarni ulashi mumkin.

### 2.2 O'rnatish va Sozlash

Platforma 2-usul uchun allaqachon tayyorlangan (Arxitekturada `schoolId` terminallarga to'g'ridan-to'g'ri ulandi va `deviceId` ixtiyoriyga aylantirildi).

1. **Cloud ISUP Serverini yoqish:**
   - Markaziy serverda (VPS yoki Dedicated Server) global darajadagi katta ISUP EHome Server ishga tushiriladi.
   - Ushbu server statik Public IP manzilga ega bo'lishi shart.

2. **Face ID Terminallarni sozlash:**
   - Maktabdagi Hikvision qurilmasi internetga ulangan bo'lishi shart.
   - **Network -> Advanced -> ISUP (EHome)** bo'limiga kiriladi.
   - Server manziliga **Markaziy Cloud ISUP** serverining Public IP manzili (yoki domeni) yoziladi.
   - Device ID (Device Name) maydoniga alohida ahamiyat beriladi. Bu maydon orqali Cloud ISUP server bu terminal qaysi maktabga tegishli ekanini aniqlaydi. Masalan, maktab ID si va eshik ID si: `SCH002_ENTRANCE_01`.

3. **Cloud ISUP Server logikasi:**
   - Yuz tasdiqlanganda Cloud ISUP Server olingan ma'lumotni darhol o'qib, `POST https://maktab.ecos.uz/api/attendance` API'siga yuboradi:
     ```json
     {
       "studentId": 105,
       "type": "IN",
       "timestamp": "2026-04-27T08:00:00+05:00",
       "deviceSerial": "SCH002_ENTRANCE_01"
     }
     ```

### 2.3 Mumkin bo'lgan xatarlar va tavsiyalar
- **Internet uzilishi:** Agar maktabda internet uzilib qolsa, ma'lumotlar qurilmaning o'z xotirasida yig'ilib turadi. Internet kelganda ularni yig'ib jo'natish imkoni ISUP v5 protokolida mavjud, biroq uni Cloud Server to'g'ri ishlashi uchun maxsus bufer arxitekturasi kerak bo'ladi.
- **Katta yuklama (High Load):** O'zbekiston bo'ylab minglab maktablar ulansa, Cloud ISUP Server minglab ochiq TCP socketlarni ushlab turishi kerak. Bu Linux yadrosida ulanishlar sonini (ulimit) ko'tarish va Async/Go kabi kuchli texnologiyalardan foydalanishni talab etadi.
