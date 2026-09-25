# VPN va Mikrotik router arxitekturasi

> Oxirgi yangilanish: **2026-09-19 kech**. Hammasi jonli tekshiruv natijasi, taxmin emas.
> `wireguard-server/README.md` dagi port/CGNAT ma'lumotlari eskirgan — to'g'risi shu fayl.

---

## 1. Arxitektura (2026-09-19 dan)

Har bir maktab routeri **bitta** VPN orqali ulanadi — qaysi biri panelda tanlanadi:

| | WireGuard (standart) | OpenVPN (zaxira) |
|---|---|---|
| Qachon | Oddiy holat | Maktab tarmog'i UDP'ni o'tkazmasa |
| Port | 443/**UDP** | 443/**TCP** |
| Router tunnel IP | `10.20.0.N` | `10.21.0.N` |
| Hub interfeysi | `wg0` | `tun0` |
| Router interfeysi | `wg-maktab` | `ovpn-maktab` |
| Maktab LAN (server ko'radigan) | `10.30.N.0/24` | `10.30.N.0/24` (bir xil) |
| RouterOS | 7 (majburiy) | 7 (majburiy) |

**Ikkalasi ham to'liq avtomatik** — serverda qo'lda ish yo'q:
1. Panelda router yaratiladi yoki "Ulanish turi" tanlanadi → backend kalit/parol va IP beradi.
2. Panel skriptni beradi (`GET /api/routers/{id}/script`) → WinBox terminaliga qo'yiladi.
3. Hub (`maktab-wireguard` konteyneri) har 15 s backenddan ro'yxatni oladi:
   `GET /api/internal/wg-peers` (WG peer'lar), `GET /api/internal/ovpn-clients` (OpenVPN keshi).
4. Holat: WG handshake → `POST /api/internal/wg-handshakes`; OpenVPN ulanganlar →
   `POST /api/internal/ovpn-status`. 3 daqiqa aloqa bo'lmasa router OFFLINE
   (`RouterController#checkOfflineRouters`).

**Skript qoidalari** (`RouterController#buildRouterOsScript`):
- boshida RouterOS versiyasi tekshiriladi (7 dan past bo'lsa to'xtaydi), LAN mavjudligi tekshiriladi;
- statik DNS bo'lmasa `8.8.8.8,1.1.1.1` qo'yiladi;
- **boshqa transportning interfeysi o'chiriladi** — bitta router, bitta VPN (bir xil IP ikki
  interfeysda turib qolgani 09-19 dagi 1 soatlik uzilishning sababi edi);
- WireGuard har qo'yishda **yangi tasodifiy port** oladi (`:rndnum`) — skriptni qayta qo'yish
  qotib qolgan oqimni yangilaydi;
- faqat `maktab_davomad` izohli yozuvlar o'zgartiriladi, qayta qo'yish xavfsiz.

**Hub** (`wireguard-server/`): WireGuard va OpenVPN **bitta konteynerda**. OpenVPN parollarni
backenddan faqat SHA-256 ko'rinishida oladi va keshdan tekshiradi (`/etc/wireguard/ovpn-clients.json`)
— backend o'chiq bo'lsa ham routerlar qayta ulana oladi. Sertifikatlar:
`/opt/wireguard-server/ovpn-pki/` (faqat serverda, `.gitignore` da; muddati **2028-12**).

**Himoyalar** (hub `entrypoint.sh`):
- backend bo'sh ro'yxat yoki gateway'siz ro'yxat qaytarsa — **hech bir peer o'chirilmaydi**
  (09-18 da aynan shu sabab gateway o'chirilib, hamma maktab uzilgan);
- OpenVPN jarayoni o'lsa — 15 s ichida o'zi qayta ishga tushadi;
- Docker healthcheck: wg0 + sikl + openvpn.

**Ogohlantirish**: router/terminal holati o'zgarganda panelda bildirishnoma + Telegram
(superadmin → Telegram → Sozlamalar → "Qurilma ogohlantirishlari"; ID botga `/chatid` yozib olinadi).
Router uzilsa uning terminallari haqida alohida xabar ketmaydi.

---

## 2. ⚠️ 1-maktab (router 8) — hal qilinmagan tarmoq muammosi

**Holat 2026-09-19 17:06:** `transport=OPENVPN`, router va terminal **ONLINE** — OpenVPN to'siqdan
keyin o'zi qayta ulanib aloqani tikladi (WireGuard esa to'silgan oqimda qotib qoladi). Shu sababli
bu maktab OpenVPN'da qoldirildi. Aloqa uzilgan paytlardagi Face ID hodisalari terminalda saqlanadi
va aloqa tiklangach avtomatik o'qiladi (tartib raqami bo'yicha).

**Dalil (tcpdump + hisoblagichlar):** VPN ulanishi o'rnatiladi (WG handshake / OpenVPN TLS va
PUSH_REPLY o'tadi), keyin **routerdan chiqqan VPN paketlari serverga yetib bormaydi**:
- router tomonida `tx` o'sadi, serverning `eth0` interfeysida routerdan paket yo'q;
- server→router yo'nalishi ishlaydi (router `rx` o'sadi);
- **shu maktab tarmog'idan oddiy HTTPS va SSH serverga bemalol o'tadi**;
- WireGuard ham, OpenVPN (TCP) ham bir xil to'siladi → protokolga emas, VPN oqimiga qarshi
  to'siq: ofis routeri (`192.168.100.1`, Mikrotik shu orqasida — ikki qavat NAT) yoki provayder
  (DPI) sababchi bo'lishi ehtimoli yuqori.

**Tarix:**
- 09-17: WireGuard shu belgida ishlamay qoldi → qo'lda OpenVPN qo'yildi, 2 kun ishladi.
- 09-19 15:00: WireGuard yangi port bilan 1,5 soat ishladi.
- 09-19 16:30–17:00: OpenVPN 3 daqiqa barqaror ishladi; keyingi har bir yangi ulanish
  (WG ham, OpenVPN ham) 0–30 soniyada to'silgan. Bugungi ko'p qayta ulanishlar to'siqni
  kuchaytirgan bo'lishi ham mumkin.

**Keyingi qadamlar (jismoniy tekshiruv kerak):**
1. Mikrotik'ning `ether1` ni boshqa internetga ulab ko'rish (telefon hotspot/USB modem) —
   ishlasa, to'siq ofis tarmog'i/provayderda.
2. `192.168.100.1` qanday qurilma — "DoS/flood protection", "VPN passthrough", ota-ona nazorati
   kabi sozlamalarini tekshirish.
3. Provayderdan VPN (UDP 443 / OpenVPN) cheklovi haqida so'rash.
4. Agar provayder VPN'ni DPI orqali to'sayotgan bo'lsa — uchinchi transport kerak:
   **SSTP** (RouterOS o'rnatilgan, haqiqiy TLS — oddiy HTTPS'ga o'xshaydi). Tizim transportlar
   uchun tayyor (`MikrotikRouter.Transport`), yangi tur qo'shiladi.

---

## 3. Ma'lum kamchilik: OpenVPN klienti yaratilgandagi birinchi ulanish

RouterOS 7.18.2 da skript `ovpn-maktab` ni **yangi yaratganda** birinchi ulanish
`using encoding` bosqichida osilib qolishi kuzatildi (2 marta). Bir marta o'chirib-yoqish bilan
darhol `connected` bo'ladi.

**Tuzatildi (2026-09-19, prod'da):** skript klientni `disabled=yes` bilan sozlaydi va barcha
marshrut/NAT/firewall'dan keyin, oxirida yoqadi (testda tartib tekshiriladi). 1-maktab tarmog'i
sabab jonli routerda qayta sinalmagan — keyingi yangi OpenVPN routerda kuzatish kerak.
Agar baribir osilsa: `/interface ovpn-client disable ovpn-maktab; enable ovpn-maktab`.

---

## 4. 2026-09-19 da serverda bajarilganlar

- Backend, bot, ikkala frontend yangilandi (testlar: 80 o'tdi, 0 xato; ikkita ataylab kiritilgan
  xato testlar tomonidan ushlandi). Rollback image teglari: `maktab_davomad-{backend,bot,frontend}:pre-ovpn-20260919`.
- Hub yangilandi; rollback: `wireguard-server-wireguard:pre-ovpn-20260919` +
  `/root/hub-backup-pre-ovpn-20260919-1327.tgz`.
- Host'dagi qo'lda OpenVPN (`openvpn-server@maktab`) va `router8-ovpn-heartbeat.timer`
  **to'xtatildi va o'chirildi** (443/tcp endi hub'da).
- Eski qo'lda OpenVPN fayllari (`checkpass.sh` — ochiq parol, `ccd/`, `ipp.txt`, `maktab.conf`,
  `/opt/router8-ovpn-heartbeat.sh` — router API kaliti, heartbeat systemd unit'lari) arxivlanib
  xavfsiz o'chirildi: `/root/ovpn-legacy-backup-20260919.tgz` (600). Sertifikatlar
  `/etc/openvpn/server/` da zaxira sifatida qoldi.
- Routerdagi eski `ovpn-hub` klienti olib tashlandi (hech qanday qoida unga bog'lanmagan edi).
- Telegram ogohlantirish chat ID'si kiritildi, sinov xabari yetib bordi.
- Backend OpenVPN tuzatishi bilan qayta deploy qilindi; rollback teg:
  `maktab_davomad-backend:pre-ovpnfix-20260919`.

---

## 5. Tuzatish: OFFLINE mantiqi

Ilgari "panel routerni hech qachon OFFLINE qilmaydi" deb yozilgan edi — **noto'g'ri**.
`RouterController#checkOfflineRouters` har daqiqada 3 daqiqalik heartbeat'siz routerni OFFLINE
qiladi. Router OFFLINE — faqat ko'rsatish (hech narsa to'xtamaydi). Terminal OFFLINE bo'lsa
hodisa so'rovi to'xtaydi, lekin har 60 s holat tekshiruvi davom etadi va aloqa tiklangach so'rov
o'zi qayta boshlanadi.

---

## 6. Tez-tez kerak bo'ladigan buyruqlar

```bash
ssh -i ~/.ssh/maktab_vps root@62.169.27.106

# Hub holati
docker exec maktab-wireguard wg show wg0                         # WireGuard peer'lar
docker exec maktab-wireguard cat /run/openvpn-status.log         # OpenVPN ulanganlar
docker exec maktab-wireguard ip route | grep 10.30               # qaysi maktab qaysi yo'lda
docker logs --since 10m maktab-wireguard

# Terminalga yetish (401 = tirik)
docker exec maktab-wg-gateway wget -qO- --no-check-certificate \
  https://10.30.2.253/ISAPI/System/deviceInfo

# Routerdan paket keladimi (0 bo'lsa — yuqori tarmoq to'syapti)
timeout 25 tcpdump -n -i eth0 "host <maktab_ochiq_IP> and port 443"
```

Router (maktab LAN'idan, REST): `http://192.168.88.1/rest/...`; bitta qiymatli sozlamalar
(`/ip/dns`, `/system/ntp/client`) uchun `POST .../set` (PATCH 400 qaytaradi).
