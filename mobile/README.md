# Maktab Davomad — mobil ilova (Flutter)

Ikkita foydalanuvchi turi bitta ilova ichida: **Ota-ona** va **Xodim** (Direktor/Mudir/O'qituvchi).
Kirish ekranida qaysi turdan foydalanish tanlanadi.

## Holat: nima tayyor, nima keyingi bosqichda

### Tayyor va ishlaydi (backendga ulangan, sinovdan o'tgan)
- Ota-ona: telefon+parol bilan kirish (birinchi marta kirganda parol shu yerda o'rnatiladi)
- Ota-ona: farzandlar ro'yxati, har biri uchun **haqiqiy davomat tarixi** (statistika + hodisalar jadvali)
- Ota-ona: o'qituvchi/xodim yozgan **izohlarni** ko'rish
- Ota-ona ↔ maktab **ikki tomonlama xabar almashinuvi** (yangi backend: `Message` jadvali, `/api/guardian-app/children/{id}/messages` va veb tomonda `/api/students/{id}/messages`)
- Xodim: login/parol bilan kirish (veb-ilova bilan bir xil `/api/auth/login`)
- Xodim: bosh sahifa (maktab statistikasi), o'quvchilar ro'yxati+profili (davomat, izohlar, xabarlarga javob), o'qituvchilar ro'yxati+profili (izohlar)

### HALI QURILMAGAN — sabab bilan

1. **Push-bildirishnomalar** — kod qisman tayyor (`firebase_messaging` ulangan, `lib/core/push_notifications.dart`), lekin ishlashi uchun **haqiqiy Firebase loyihasi** kerak:
   - [console.firebase.google.com](https://console.firebase.google.com) da yangi loyiha oching
   - Android ilova qo'shing (package nomi: `uz.ecos.maktab.maktab_davomad_mobile` — Dockerfile'dagi `--org` bilan mos)
   - `google-services.json` faylini yuklab, `mobile/android/app/` papkasiga qo'ying
   - Backendda FCM token saqlash va yuborish logikasi ham qo'shilishi kerak (hozircha yo'q)
   - Ilova OCHIQ turgan paytda kelgan xabar uchun banner ko'rsatish (`flutter_local_notifications`) ATAYLAB qo'shilmadi — bu paket Android build'ga qo'shimcha "core library desugaring" sozlamasi talab qiladi, `android/` esa har build'da Docker ichida qaytadan generatsiya qilinadi (repo'da saqlanmaydi), shu sabab bu sozlamani doimiy qilish uchun alohida ish kerak. Fon/tugatilgan holatdagi bildirishnomalarni FCM'ning o'zi ko'rsatadi — shu qismi qo'shimcha ishsiz ishlaydi.
   - Bu API kalitlarni/loyihani men o'zim yarata olmayman — buni faqat siz qila olasiz.

2. **Ota-ona kamera orqali farzandini jonli ko'rishi** — bu ENG katta cheklov. Hozirgi tizimda (backend `CameraController`) haqiqiy video oqim UMUMAN yo'q — kameralar faqat metama'lumot (nomi, IP, xona) va hodisalarni qayd etish uchun. Buni qurish uchun kerak:
   - Haqiqiy jismoniy kameralar tarmoqqa ulangan va RTSP/ONVIF orqali oqim uzatayotgan bo'lishi
   - Server tomonida video-relay/transkodlash xizmati (masalan RTSP→WebRTC yoki RTSP→HLS ko'prigi — bu alohida, og'ir infratuzilma ishi)
   - Kim qaysi kamerani ko'ra olishi ustidan qat'iy nazorat (faqat farzandi shu xonada ekan ota-ona ko'ra olishi kerak — bolalar xavfsizligi masalasi)
   
   Hozircha bu funksiya "hali ulanmagan" ko'rinishida veb-ilovada ham shunday (Kameralar sahifasiga qarang). Bu qism keyingi, alohida katta bosqich.

3. **Til tanlash (uz/ru/en)** — hozircha ilova faqat o'zbek tilida (matnlar kodga yozilgan). Veb-ilovadagi kabi to'liq i18n keyingi bosqichda `easy_localization` yoki shunga o'xshash paket bilan qo'shiladi.

4. **iOS** — Docker build faqat Android (APK) uchun sozlangan. iOS uchun Mac va Apple Developer hisobi kerak.

## Qurish (build)

Bu noutbukda Flutter SDK o'rnatilmagan — Docker orqali quriladi (Inventarizatsiya loyihasidagi bir xil usul):

```bash
cd mobile
docker build -t maktab-mobile-build .
docker create --name mdmb maktab-mobile-build
docker cp mdmb:/app/build/app/outputs/flutter-apk/app-release.apk ./app-release.apk
docker rm mdmb
```

Backend manzilini o'zgartirish uchun (standart: `https://maktab.ecos.uz`):

```bash
docker build --build-arg API_BASE_URL=https://sizning-domeningiz.uz -t maktab-mobile-build .
```

Tayyor APK'ni avvalgi loyihadagi kabi `downloads/` orqali tarqatish mumkin.

## Backend API (yangi qo'shilganlar)

- `POST /api/guardian-app/login` — {phone, password} → JWT (birinchi kirishda parol shu yerda o'rnatiladi)
- `GET /api/guardian-app/children` — bog'langan farzandlar ro'yxati
- `GET /api/guardian-app/children/{id}/attendance` — haqiqiy davomat hodisalari
- `GET /api/guardian-app/children/{id}/notes` — xodim yozgan izohlar
- `GET|POST /api/guardian-app/children/{id}/messages` — xabar almashinuv
- `GET|POST /api/students/{id}/messages` — xodim tomonidan (veb va mobil xodim ilovasi) bir xil suhbatni ko'rish/javob berish

Barcha `/children/{id}/...` endpointlar ota-onaning HAQIQATAN shu bolaga bog'langanligini tekshiradi (403 aks holda) — boshqa ota-onaning farzandi ma'lumoti hech qachon ko'rinmaydi.
