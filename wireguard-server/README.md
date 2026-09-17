# WireGuard markaziy server — maktab_davomad

> ## ⏸ QOLDIRILGAN QAROR (2026-09-15) — maktablardagi Mikrotik'lar hozircha ULANA OLMAYDI
>
> **Holat:** hub (shu papka) hozir asosiy kompyuterda ishlaydi, kompyuter esa provayder
> **CGNAT** ortida (yo'lda `100.98.0.1` — umumiy ochiq IP). Tashqi tarmoqdagi (maktabdagi)
> Mikrotik internet orqali hub'ga yeta olmaydi. Shu yerda, bir LAN'da hammasi ishlaydi va
> sinalgan (tunnel, netmap, backend → Face ID `10.30.2.253`).
>
> **Foydalanuvchi qaror qabul qilishi kerak — ikki yo'l:**
> 1. **VPS (tavsiya)** — ~$4–6/oy, 1 vCPU/1 GB Ubuntu. Hub VPS'ga ko'chadi (`./deploy-vps.sh`),
>    backend/DB/sayt kompyuterda qoladi. Kompyuter ham, Mikrotik'lar ham VPS'ga o'zi ulanadi.
> 2. **Provayderdan oq (statik) IP** — modemda UDP 51820 → shu kompyuter port forward.
>    Kamchilik: barcha maktablar ofis interneti/elektriga bog'liq.
>
> **Qaror qabul qilingach qilinadigan ishlar:**
> - hub'ni ko'chirish (yoki port forward), `vpn.maktab.ecos.uz` A-yozuvini yangi IP'ga yo'naltirish
>   (VPS bo'lsa `update-public-ip.ps1` Task Scheduler vazifasini o'chirish);
> - asosiy `.env`: `WG_HUB_ENDPOINT=vpn.maktab.ecos.uz:51820` (hozir `host.docker.internal:51820`),
>   so'ng `docker compose up -d wg-gateway`;
> - Mikrotik'ga paneldagi skriptni qayta qo'yish (endpoint domen bo'ladi — hozir sinov uchun
>   qo'lda `192.168.88.254` qo'yilgan);
> - ⚠️ hEX S hozir shu kompyuterning internet shlyuzi — jo'natishdan oldin kompyuterni modemga/
>   boshqa routerga ulash;
> - maktabda: ether1 = internet, qolgan portlar = Face ID/kameralar; panelda ONLINE tekshirish.

Bu papka **atayin** asosiy `maktab_davomad` docker-compose.yml'dan ALOHIDA — istalgan
mashinada (VPS tavsiya etiladi) hech qanday backend kodi o'zgarishisiz ishga tushirilishi
mumkin.

Peer ro'yxati (qaysi Mikrotik router qaysi ochiq kalit/VPN IP'ga ega) umumiy Docker volume
orqali EMAS — backend'ning `/api/internal/wg-peers` endpointidan HTTPS orqali har 15
sekundda so'raladi. Shu sabab bu server backend bilan bir xil mashinada bo'lishi SHART EMAS.

Konteyner production uchun sozlangan: `restart: always`, Docker `HEALTHCHECK` (wg0
interfeysi va sync loop jonligini tekshiradi), va idempotent peer-sinxronizatsiya
(backend vaqtincha ishlamay qolsa ham mavjud VPN tunnellar buzilmaydi).

## MUHIM — nega VPS shart (noutbuk/lokal server YARAMAYDI)

Bu konteyner UDP 51820 portida tinglaydi — maktablardagi Mikrotik routerlar shu portga
**internet orqali** ulanishi kerak. Agar server uy/ofis noutbugida yoki NAT ortidagi
lokal mashinada qoldirilsa, ISP router/modemida UDP 51820'ni qo'lda forward qilish va
dinamik ochiq IP o'zgarganda uni kuzatib borish kerak bo'ladi — bu ANIQ
[[telefoniya-turn-nat-muammosi]] xotirasidagi muammo bilan bir xil turdagi tuzoq
(coturn'da bu hech qachon qilinmagan va tizim internetdan hech qachon ishlamagan).

**VPS'da bu muammo umuman yo'q**: statik ochiq IP, portlar odatda ochiq (faqat
provayderning firewall/security-group panelida UDP 51820'ni ruxsat berish kifoya).
Shuning uchun bu server **faqat VPS'da** ishga tushirilishi kerak.

## Tez ishga tushirish (bitta buyruq bilan, VPS tayyor bo'lgach)

VPS talablari: istalgan arzon provayder (Hetzner Cloud, Contabo, DigitalOcean, Timeweb
va h.k.), eng kichik tarif yetarli (1 vCPU / 1GB RAM), Ubuntu 22.04/24.04, root SSH
kirish yoqilgan.

```bash
cd wireguard-server
./deploy-vps.sh root@<VPS_OCHIQ_IP>
# yoki alohida SSH kalit bilan:
./deploy-vps.sh root@<VPS_OCHIQ_IP> ~/.ssh/id_ed25519
```

Bu skript avtomatik: SSH ulanishni tekshiradi → Docker yo'q bo'lsa o'rnatadi → fayllarni
VPS'ga nusxalaydi → `.env`ni asosiy loyihadagi `WG_SYNC_SECRET` bilan mos qilib yaratadi →
`ufw` faol bo'lsa UDP 51820'ni ochadi → konteynerni quradi va ishga tushiradi → oxirida
backend `.env`ga yoziladigan tayyor `WG_SERVER_PUBLIC_KEY`/`WG_SERVER_ENDPOINT` qiymatlarini
chiqaradi. Qayta ishga tushirish/yangilash uchun xuddi shu buyruqni yana bajarish yetarli
(idempotent).

## Qo'lda ishga tushirish (deploy-vps.sh ishlatilmasa)

```bash
cp .env.example .env
# .env faylida WG_SYNC_SECRET'ni backend/.env dagi WG_SYNC_SECRET bilan BIR XIL qiling
docker compose up -d --build
docker compose logs -f
```

Loglarda server ochiq kaliti chiqadi:
```
WG_SERVER_PUBLIC_KEY=<...>
WG_SERVER_ENDPOINT=<bu server ochiq IP yoki domeni>
WG_SERVER_PORT=51820
```

## Ikkala usulda ham — oxirgi qadam

Chiqqan qiymatlarni **backend**ning `.env` fayliga yozing:
```
WG_SERVER_PUBLIC_KEY=<yuqoridagi qiymat>
WG_SERVER_ENDPOINT=<VPS'ning ochiq IP'si yoki domeni>
WG_SERVER_PORT=51820
```
va backend'ni qayta ishga tushiring (`docker compose up -d backend` asosiy papkada).
Shundan keyin `/devices` sahifasidagi "Mikrotikka ulanish sozlamalari" paneli
"server hali sozlanmagan" ogohlantirishini ko'rsatmay qo'yadi va yangi yaratilgan
router uchun RouterOS skripti to'g'ri `Endpoint`/`PublicKey` bilan generatsiya bo'ladi.
