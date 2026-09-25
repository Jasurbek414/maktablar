package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.util.VpnAddressing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * WireGuard markaziy server (alohida, ko'chma joylashtiriladigan — bugun shu noutbukda
 * sinov uchun, ertaga VPS'da) shu endpoint orqali davriy so'rov qilib, qaysi peer'lar
 * (routerlar) ro'yxatdan o'tganini bilib oladi va o'z wg0 interfeysiga qo'shadi
 * (`wg syncconf`). Umumiy Docker volume EMAS — HTTPS orqali, shuning uchun server
 * qayerda joylashishidan qat'i nazar (shu mashina yoki uzoqdagi VPS) ishlaydi.
 *
 * JWT talab qilinmaydi (WireGuard serverida foydalanuvchi sessiyasi yo'q) — guardian/bot
 * endpointlari kabi o'z ichida X-Wg-Sync-Key header orqali autentifikatsiya qiladi.
 */
@RestController
@RequestMapping("/api/internal")
public class WireguardSyncController {

    private static final Logger log = LoggerFactory.getLogger(WireguardSyncController.class);

    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private VpnAddressing vpn;
    @Autowired(required = false) private com.maktab.service.DeviceAlertService alerts;

    @Value("${app.wireguard.gateway-public-key:}")
    private String gatewayPublicKey;

    @Value("${app.wireguard.sync-secret:}")
    private String syncSecret;

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isValidSyncKey(String key) {
        return syncSecret != null && !syncSecret.isBlank() && constantTimeEquals(key, syncSecret);
    }

    @GetMapping("/wg-peers")
    public ResponseEntity<?> getPeers(@RequestHeader(value = "X-Wg-Sync-Key", required = false) String syncKey) {
        if (!isValidSyncKey(syncKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid sync key"));
        }
        List<Map<String, Object>> peers = new ArrayList<>();
        for (MikrotikRouter r : routerRepo.findAll()) {
            // OpenVPN'dagi router WireGuard peer bo'lmasligi kerak — aks holda hub 10.30.N.0/24 ni
            // ikki joyga yo'naltirishi mumkin edi (bitta router — bitta VPN).
            if (r.effectiveTransport() != MikrotikRouter.Transport.WIREGUARD) continue;
            if (r.getWgPublicKey() == null || r.getWgPublicKey().isBlank()
                    || r.getVpnIp() == null || r.getVpnIp().isBlank()) continue;
            try {
                peers.add(toPeerMap(r));
            } catch (IllegalStateException e) {
                // vpnIp qo'lda noto'g'ri kiritilgan — bitta yozuv butun VPN'ni to'xtatmasin
                log.warn("wg-peers: router {} o'tkazib yuborildi: {}", r.getId(), e.getMessage());
            }
        }
        // Backend gateway (wg-gateway konteyneri) — backend maktab LAN'lariga shu peer orqali chiqadi.
        if (gatewayPublicKey != null && !gatewayPublicKey.isBlank()) {
            Map<String, Object> gw = new LinkedHashMap<>();
            gw.put("routerId", null);
            gw.put("publicKey", gatewayPublicKey);
            gw.put("vpnIp", vpn.gatewayIp() + "/32");
            gw.put("allowedIps", vpn.gatewayIp() + "/32");
            gw.put("role", "gateway");
            peers.add(gw);
        }
        return ResponseEntity.ok(peers);
    }

    /**
     * WireGuard server har sinxronizatsiyada `wg show wg0 latest-handshakes` natijasini
     * shu yerga yuboradi. Router holati (ONLINE/OFFLINE) routerning o'zidan heartbeat
     * so'ramasdan, tunnelning HAQIQIY holatidan aniqlanadi — RouterOS 7 "device-mode=home"
     * rejimida fetch/scheduler o'chiq bo'lgani uchun routerdan heartbeat skripti ishlamaydi
     * va har bir maktabda tugmani jismonan bosishni talab qiladi (2026-09-15 tasdiqlangan).
     *
     * PersistentKeepalive=25s bilan WireGuard kalitni ~120s'da yangilaydi, ya'ni jonli
     * tunnelda oxirgi handshake ~145s'dan eskirmaydi — shu sabab ONLINE chegarasi 180s.
     */
    @PostMapping("/wg-handshakes")
    public ResponseEntity<?> reportHandshakes(@RequestHeader(value = "X-Wg-Sync-Key", required = false) String syncKey,
                                              @RequestBody(required = false) List<Map<String, Object>> handshakes) {
        if (!isValidSyncKey(syncKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid sync key"));
        }
        if (handshakes == null || handshakes.isEmpty()) {
            return ResponseEntity.ok(Map.of("updated", 0));
        }

        Map<String, Long> byKey = new HashMap<>();
        for (Map<String, Object> h : handshakes) {
            Object key = h.get("publicKey");
            Object ts = h.get("latestHandshake");
            if (key instanceof String && ts instanceof Number && ((Number) ts).longValue() > 0) {
                byKey.put((String) key, ((Number) ts).longValue());
            }
        }

        long nowEpoch = Instant.now().getEpochSecond();
        int updated = 0;
        for (MikrotikRouter r : routerRepo.findAll()) {
            if (r.effectiveTransport() != MikrotikRouter.Transport.WIREGUARD) continue;
            Long epoch = r.getWgPublicKey() != null ? byKey.get(r.getWgPublicKey()) : null;
            if (epoch == null) continue;

            LocalDateTime handshakeAt = LocalDateTime.ofInstant(Instant.ofEpochSecond(epoch), ZoneId.systemDefault());
            boolean firstConnection = r.getLastHeartbeat() == null;
            boolean changed = false;
            boolean becameOnline = false;
            if (r.getLastHeartbeat() == null || handshakeAt.isAfter(r.getLastHeartbeat())) {
                r.setLastHeartbeat(handshakeAt);
                changed = true;
            }
            if (nowEpoch - epoch <= ONLINE_HANDSHAKE_MAX_AGE_SECONDS
                    && r.getStatus() != MikrotikRouter.RouterStatus.ONLINE) {
                r.setStatus(MikrotikRouter.RouterStatus.ONLINE);
                changed = true;
                becameOnline = true;
            }
            if (changed) {
                routerRepo.save(r);
                updated++;
            }
            if (becameOnline && alerts != null) alerts.routerOnline(r, firstConnection);
        }
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    private static final long ONLINE_HANDSHAKE_MAX_AGE_SECONDS = 180;

    // ─── OpenVPN zaxira transporti (2026-09-19) ─────────────────────────────────

    /**
     * Hub keshi uchun OpenVPN routerlar ro'yxati. Hub buni har sinxronizatsiyada faylga yozadi va
     * auth/client-connect skriptlari FAQAT shu keshni o'qiydi — backend deploy/restart paytida ham
     * routerlar qayta ulana oladi. Parolning o'zi emas, SHA-256 xeshi uzatiladi.
     */
    @GetMapping("/ovpn-clients")
    public ResponseEntity<?> ovpnClients(@RequestHeader(value = "X-Wg-Sync-Key", required = false) String syncKey) {
        if (!isValidSyncKey(syncKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid sync key"));
        }
        List<Map<String, Object>> clients = new ArrayList<>();
        for (MikrotikRouter r : routerRepo.findAll()) {
            if (r.effectiveTransport() != MikrotikRouter.Transport.OPENVPN) continue;
            if (r.getOvpnPassword() == null || r.getOvpnPassword().isBlank()
                    || r.getVpnIp() == null || r.getVpnIp().isBlank()) continue;
            try {
                String mapped = vpn.mappedSubnet(r); // 10.30.N.0/24
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("routerId", r.getId());
                m.put("cn", r.ovpnUsername());
                m.put("passwordSha256", sha256Hex(r.getOvpnPassword()));
                m.put("tunnelIp", vpn.routerOvpnIp(r));
                m.put("mappedSubnet", mapped);
                m.put("mappedNetwork", mapped.substring(0, mapped.indexOf('/')));
                clients.add(m);
            } catch (IllegalStateException e) {
                log.warn("ovpn-clients: router {} o'tkazib yuborildi: {}", r.getId(), e.getMessage());
            }
        }
        return ResponseEntity.ok(clients);
    }

    /** Hub OpenVPN status faylidagi ulangan common-name'lar — routerning haqiqiy heartbeat'i. */
    @PostMapping("/ovpn-status")
    public ResponseEntity<?> ovpnStatus(@RequestHeader(value = "X-Wg-Sync-Key", required = false) String syncKey,
                                        @RequestBody(required = false) List<String> connected) {
        if (!isValidSyncKey(syncKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid sync key"));
        }
        if (connected == null || connected.isEmpty()) {
            return ResponseEntity.ok(Map.of("updated", 0));
        }
        java.util.Set<String> cns = new java.util.HashSet<>(connected);
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        for (MikrotikRouter r : routerRepo.findAll()) {
            if (r.effectiveTransport() != MikrotikRouter.Transport.OPENVPN || !cns.contains(r.ovpnUsername())) continue;
            boolean wasOnline = r.getStatus() == MikrotikRouter.RouterStatus.ONLINE;
            boolean firstConnection = r.getLastHeartbeat() == null;
            // Har 15s yozmaslik uchun: OFFLINE chegarasi 3 daqiqa, 60s aniqlik yetarli
            boolean stale = r.getLastHeartbeat() == null || r.getLastHeartbeat().isBefore(now.minusSeconds(60));
            if (!wasOnline || stale) {
                r.setStatus(MikrotikRouter.RouterStatus.ONLINE);
                r.setLastHeartbeat(now);
                routerRepo.save(r);
                updated++;
            }
            if (!wasOnline && alerts != null) alerts.routerOnline(r, firstConnection);
        }
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    static String sha256Hex(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private Map<String, Object> toPeerMap(MikrotikRouter r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("routerId", r.getId());
        m.put("publicKey", r.getWgPublicKey());
        m.put("vpnIp", vpn.routerTunnelHost(r));
        // Hub shu router orqali ham tunnel IP'ni, ham maktabning virtual LAN'ini (netmap) yo'naltiradi.
        m.put("allowedIps", vpn.routerTunnelHost(r) + "," + vpn.mappedSubnet(r));
        m.put("role", "router");
        return m;
    }
}
