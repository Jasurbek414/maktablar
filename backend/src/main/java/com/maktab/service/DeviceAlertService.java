package com.maktab.service;

import com.maktab.model.FaceTerminal;
import com.maktab.model.MikrotikRouter;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.repository.SchoolRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Qurilma aloqasi uzilishi/tiklanishi haqida xabar (2026-09-19): maktab paneliga bildirishnoma
 * + superadmin Telegram chat'lariga (BotConfig.adminAlertChatIds).
 *
 * Faqat holat O'ZGARGANDA chaqiriladi (chaqiruvchi eski holatni solishtiradi) — OFFLINE mantiqining
 * o'zi o'zgarmaydi: router 3 daqiqa (RouterController#checkOfflineRouters), terminal 3 daqiqa
 * (FaceTerminalMonitor) — shu kechikish qisqa uzilishlarda xabar yog'ilishining oldini oladi.
 *
 * Router uzilganda uning terminallari haqida alohida xabar yuborilmaydi (ular ham uziladi — bitta
 * sabab, bitta xabar). Terminal "tiklandi" xabari faqat u uchun "uzildi" yuborilgan bo'lsa ketadi.
 *
 * MUHIM: yuborish alohida oqimda — Telegram/bot osilib qolsa monitoring sikllari to'xtamasligi
 * uchun. Lekin kerakli ma'lumot (nomlar) CHAQIRUVCHI oqimida olinadi: router.school LAZY, boshqa
 * oqimda Hibernate sessiyasi yo'q (LazyInitializationException).
 */
@Service
public class DeviceAlertService {

    private static final Logger log = LoggerFactory.getLogger(DeviceAlertService.class);
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("dd.MM HH:mm");

    @Autowired private NotificationService notificationService;
    @Autowired private BotConfigService botConfigService;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private MikrotikRouterRepository routerRepo;

    // ─── Xabar bo'g'uvchi (2026-09-25) ───────────────────────────────────────────
    //
    // MUAMMO: 2026-09-22 da 1-maktab VPN aloqasi beqaror bo'lgani sabab bitta kunda 33 ta
    // "uzildi" + 32 ta "tiklandi" xabari ketgan (~65 ta Telegram xabari + shuncha panel
    // bildirishnomasi). Beqaror aloqada har tebranish uchun xabar yuborish foydasiz.
    //
    // QOIDA:
    //  1. Ochiq uzilish davomida takroriy "uzildi" yuborilmaydi.
    //  2. Xabar yuborilgach COOLDOWN ichida shu qurilma jim turadi.
    //  3. FLAP_WINDOW ichida FLAP_LIMIT marta uzilsa — bitta "aloqa beqaror" xabari
    //     yuboriladi va qurilma FLAP_WINDOW davomida butunlay jim qoladi.
    //  4. "Tiklandi" faqat haqiqatan "uzildi" yuborilgan bo'lsa ketadi.
    // Eng yomon holatda kuniga ~4 xabar (avval 65 ta edi).
    static final Duration COOLDOWN = Duration.ofMinutes(30);
    static final Duration FLAP_WINDOW = Duration.ofHours(6);
    static final int FLAP_LIMIT = 5;

    /** Uzilish qayd etilgan (xabar yuborilgan-yuborilmaganidan qat'i nazar). */
    private final Set<String> openOutage = ConcurrentHashMap.newKeySet();
    /** Uzilish haqida xabar HAQIQATDA yuborilgan — tiklanish xabari shunga bog'liq. */
    private final Set<String> notifiedOutage = ConcurrentHashMap.newKeySet();
    /** Oxirgi yuborilgan xabar vaqti (qurilma bo'yicha). */
    private final Map<String, Instant> lastSentAt = new ConcurrentHashMap<>();
    /** Oxirgi FLAP_WINDOW ichidagi uzilishlar vaqti. */
    private final Map<String, Deque<Instant>> outageTimes = new ConcurrentHashMap<>();
    /** Beqaror deb topilgan qurilma shu vaqtgacha jim turadi. */
    private final Map<String, Instant> quietUntil = new ConcurrentHashMap<>();

    private enum Decision { SEND, SILENT, UNSTABLE }

    /** Testda vaqtni oldinga surish uchun — jonli kodda haqiqiy soat. */
    java.util.function.Supplier<Instant> clock = Instant::now;

    private synchronized Decision decideOffline(String key) {
        Instant now = clock.get();
        if (!openOutage.add(key)) return Decision.SILENT; // allaqachon uzilgan deb belgilangan

        Deque<Instant> times = outageTimes.computeIfAbsent(key, k -> new ArrayDeque<>());
        times.addLast(now);
        while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(FLAP_WINDOW))) times.pollFirst();

        Instant quiet = quietUntil.get(key);
        if (quiet != null && now.isBefore(quiet)) return Decision.SILENT;

        if (times.size() >= FLAP_LIMIT) {
            quietUntil.put(key, now.plus(FLAP_WINDOW));
            lastSentAt.put(key, now);
            return Decision.UNSTABLE;
        }
        Instant last = lastSentAt.get(key);
        if (last != null && last.isAfter(now.minus(COOLDOWN))) return Decision.SILENT;
        lastSentAt.put(key, now);
        return Decision.SEND;
    }

    /** @return tiklanish haqida xabar berish kerakmi */
    private synchronized boolean decideOnline(String key) {
        openOutage.remove(key);
        if (!notifiedOutage.remove(key)) return false; // uzilish e'lon qilinmagan — tiklanish ham ortiqcha
        lastSentAt.put(key, clock.get());
        return true;
    }

    synchronized int outageCount(String key) {
        Deque<Instant> times = outageTimes.get(key);
        return times == null ? 0 : times.size();
    }

    private final ExecutorService sender = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "device-alert");
        t.setDaemon(true);
        return t;
    });

    @PreDestroy
    void shutdown() {
        sender.shutdownNow();
    }

    // ─── Router ──────────────────────────────────────────────────────────────────

    public void routerOffline(MikrotikRouter r) {
        String key = "router:" + r.getId();
        Decision d = decideOffline(key);
        if (d == Decision.SILENT) return;
        notifiedOutage.add(key);

        Long schoolId = schoolIdOf(r);
        String last = r.getLastHeartbeat() != null ? r.getLastHeartbeat().format(HM) : "-";
        String text = d == Decision.UNSTABLE
            ? "⚠️ Maktab aloqasi BEQAROR\n"
                + "Maktab: " + schoolName(schoolId) + "\n"
                + "Router: " + r.getName() + " (" + transportLabel(r) + ")\n"
                + "6 soatda " + outageCount(key) + " marta uzildi.\n\n"
                + "Keyingi 6 soat davomida bu router haqida alohida xabar yuborilmaydi.\n"
                + "Maktab internetini yoki routerni tekshirish kerak."
            : "🔴 Maktab bilan aloqa uzildi\n"
                + "Maktab: " + schoolName(schoolId) + "\n"
                + "Router: " + r.getName() + " (" + transportLabel(r) + ")\n"
                + "Oxirgi aloqa: " + last + "\n\n"
                + "Face ID hodisalari terminalning o'zida saqlanadi va aloqa tiklangach avtomatik o'qiladi.";
        dispatch("Router " + r.getName(), schoolId, false, text);
    }

    /** @param firstConnection router birinchi marta ulanmoqda (avval hech qachon aloqa bo'lmagan) */
    public void routerOnline(MikrotikRouter r, boolean firstConnection) {
        String key = "router:" + r.getId();
        // Yangi router ulanishi — bir martalik voqea, bo'g'uvchidan qat'i nazar xabar beriladi
        if (!firstConnection && !decideOnline(key)) return;
        if (firstConnection) { openOutage.remove(key); notifiedOutage.remove(key); }

        Long schoolId = schoolIdOf(r);
        String text = (firstConnection ? "🟢 Yangi router serverga ulandi\n" : "🟢 Maktab bilan aloqa tiklandi\n")
            + "Maktab: " + schoolName(schoolId) + "\n"
            + "Router: " + r.getName() + " (" + transportLabel(r) + ")";
        dispatch("Router " + r.getName(), schoolId, true, text);
    }

    // ─── Face ID terminal ────────────────────────────────────────────────────────

    public void terminalOffline(FaceTerminal t, String error) {
        if (routerIsOffline(t.getRouterId())) return; // sabab — router, u haqida xabar allaqachon ketgan
        String key = "terminal:" + t.getId();
        Decision d = decideOffline(key);
        if (d == Decision.SILENT) return;
        notifiedOutage.add(key);

        String text = d == Decision.UNSTABLE
            ? "⚠️ Face ID terminal aloqasi BEQAROR\n"
                + "Maktab: " + schoolName(t.getSchoolId()) + "\n"
                + "Terminal: " + t.getName() + "\n"
                + "6 soatda " + outageCount(key) + " marta uzildi.\n\n"
                + "Keyingi 6 soat davomida bu terminal haqida alohida xabar yuborilmaydi."
            : "🔴 Face ID terminal javob bermayapti\n"
                + "Maktab: " + schoolName(t.getSchoolId()) + "\n"
                + "Terminal: " + t.getName() + (t.getIpAddress() != null ? " (" + t.getIpAddress() + ")" : "") + "\n"
                + "Sabab: " + truncate(error, 200) + "\n\n"
                + "Router aloqasi joyida — terminalning elektr va tarmoq kabelini tekshiring.";
        dispatch("Face ID " + t.getName(), t.getSchoolId(), false, text);
    }

    public void terminalOnline(FaceTerminal t) {
        if (!decideOnline("terminal:" + t.getId())) return;
        String text = "🟢 Face ID terminal qayta ishlayapti\n"
            + "Maktab: " + schoolName(t.getSchoolId()) + "\n"
            + "Terminal: " + t.getName();
        dispatch("Face ID " + t.getName(), t.getSchoolId(), true, text);
    }

    // ─── Ichki ───────────────────────────────────────────────────────────────────

    private void dispatch(String deviceName, Long schoolId, boolean online, String telegramText) {
        try {
            sender.execute(() -> {
                try {
                    notificationService.createDeviceNotification(deviceName, schoolId, online);
                    List<String> chatIds = botConfigService.adminAlertChatIds();
                    if (!chatIds.isEmpty()) notificationService.sendAdminAlert(chatIds, telegramText);
                } catch (Exception e) {
                    log.warn("Qurilma ogohlantirishi yuborilmadi ({}): {}", deviceName, e.toString());
                }
            });
        } catch (Exception e) {
            // executor to'xtagan (ilova o'chmoqda) — monitoringni buzmaslik kerak
            log.warn("Qurilma ogohlantirishi navbatga qo'yilmadi ({}): {}", deviceName, e.toString());
        }
    }

    private boolean routerIsOffline(Long routerId) {
        if (routerId == null) return false;
        return routerRepo.findById(routerId)
            .map(r -> r.getStatus() == MikrotikRouter.RouterStatus.OFFLINE)
            .orElse(false);
    }

    /** Hibernate proksisida id getter'i sessiyasiz ham ishlaydi — nom esa alohida o'qiladi. */
    private static Long schoolIdOf(MikrotikRouter r) {
        try {
            return r.getSchool() != null ? r.getSchool().getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String schoolName(Long schoolId) {
        if (schoolId == null) return "-";
        try {
            return schoolRepo.findById(schoolId).map(s -> s.getName()).orElse("#" + schoolId);
        } catch (Exception e) {
            return "#" + schoolId;
        }
    }

    private static String transportLabel(MikrotikRouter r) {
        return r.effectiveTransport() == MikrotikRouter.Transport.OPENVPN ? "OpenVPN" : "WireGuard";
    }

    private static String truncate(String s, int max) {
        if (s == null || s.isBlank()) return "-";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
