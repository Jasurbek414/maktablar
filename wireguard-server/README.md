# VPN hub — maktab_davomad (WireGuard + OpenVPN)

> To'liq arxitektura, maktablardagi ma'lum muammolar va tekshiruv buyruqlari:
> **`../VPN-VA-ROUTER.md`**. Bu fayl — faqat hub'ni joylashtirish/yangilash.

Maktablardagi Mikrotik routerlar shu konteynerga ulanadi. Har bir router **bitta** transportda
(panelda "Ulanish turi"):

| | WireGuard (standart) | OpenVPN (zaxira) |
|---|---|---|
| Port | 443/udp | 443/tcp |
| Hub interfeysi | `wg0` (10.20.0.1/24) | `tun0` (10.21.0.1/24) |
| Routerlar ro'yxati | `GET /api/internal/wg-peers` | `GET /api/internal/ovpn-clients` |
| Holat hisoboti | `POST /api/internal/wg-handshakes` | `POST /api/internal/ovpn-status` |

Maktab LAN'lari transportdan qat'i nazar `10.30.N.0/24` orqali ko'rinadi; ularga faqat backend
gateway'i (`10.20.0.254`, `maktab-wg-gateway`) ulanish ochadi — maktablar bir-birini ko'rmaydi.

Hub har `SYNC_INTERVAL` (15 s) da backenddan ro'yxatni oladi (`X-Wg-Sync-Key`). Backend javob
bermasa mavjud tunnellar buzilmaydi; bo'sh yoki gateway'siz ro'yxat kelsa **peer'lar
o'chirilmaydi**. OpenVPN parollarni faqat SHA-256 ko'rinishida oladi va keshdan tekshiradi
(`/etc/wireguard/ovpn-clients.json`) — backend o'chiq bo'lsa ham routerlar qayta ulanadi.

## Joylashuv (prod)

- Server: `62.169.27.106`, papka `/opt/wireguard-server`, konteyner `maktab-wireguard`
- Backend bilan ichki tarmoq orqali: `BACKEND_URL=http://backend:8080` (`maktab_davomad_maktab`)
- `.env`: `WG_SYNC_SECRET` (backend bilan bir xil), `WG_LISTEN_PORT=443`
- OpenVPN sertifikatlari: `./ovpn-pki/{ca.crt,server.crt,server.key,dh.pem}` — faqat serverda,
  repoda `.gitignore` da. Papka bo'lmasa OpenVPN o'chiq qoladi, WireGuard ishlayveradi.
  Sertifikat muddati: **2028-12**.

## Yangilash

```bash
cd /opt/wireguard-server
docker tag wireguard-server-wireguard:latest wireguard-server-wireguard:pre-$(date +%Y%m%d)
docker compose build && docker compose up -d
docker logs --since 2m maktab-wireguard      # "[openvpn] Ishga tushdi" va sinxronizatsiya
docker inspect -f '{{.State.Health.Status}}' maktab-wireguard
```

Qayta yaratishda WireGuard routerlari soniyalar ichida qayta ulanadi (server kaliti `wg-data`
volume'da saqlanadi). 443/tcp band bo'lmasligi shart — host'da boshqa OpenVPN ishlatilmaydi
(2026-09-19 gacha bo'lgan qo'lda qo'yilgan `openvpn-server@maktab` o'chirilgan, fayllari
`/root/ovpn-legacy-backup-20260919.tgz` da).

## Backend `.env` bilan moslik

```
WG_SERVER_PUBLIC_KEY=<hub server_public.key>
WG_SERVER_ENDPOINT=62.169.27.106
WG_SERVER_PORT=443          # WireGuard (udp)
OVPN_PORT=443               # OpenVPN (tcp), standart
OVPN_SUBNET_BASE=10.21.0    # standart
```

`deploy-vps.sh`, `update-public-ip.ps1` — hub noutbukda (CGNAT ortida) turgan davrdan qolgan,
hozirgi VPS joylashuvida ishlatilmaydi.
