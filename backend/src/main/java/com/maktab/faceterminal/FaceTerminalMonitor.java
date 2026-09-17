package com.maktab.faceterminal;

import com.maktab.model.FaceTerminal;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.service.FaceAttendanceIngestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Face ID terminallarini fonda kuzatadi — backend terminalga VPN orqali O'ZI murojaat qiladi,
 * qurilmada push manzilini sozlash shart emas.
 *
 *  - pollEvents (har 5s): oxirgi o'qilgan serialNo'dan keyingi voqealar olinadi va "tanildi"
 *    voqealari davomatga yoziladi. serialNo DB'da saqlangani uchun backend/VPN uzilib qolsa
 *    ham qayta ulanganda to'plangan voqealar yo'qotishsiz olinadi.
 *  - refreshStatuses (har 60s): holat, foydalanuvchi/yuz soni; bir martalik uzilishda darhol
 *    OFFLINE qilinmaydi (OFFLINE_AFTER), lekin xato matni darhol ko'rinadi.
 *
 * Bitta terminal bilan bir vaqtda faqat bitta oqim ishlaydi (so'rov, qo'lda tiklash) — aks
 * holda bir voqea ikki marta o'qilishi mumkin edi.
 */
@Component
public class FaceTerminalMonitor {

    private static final Logger log = LoggerFactory.getLogger(FaceTerminalMonitor.class);

    /**
     * "O'tdi" voqealari (major=5): 1 — karta, 38 — barmoq izi, 75 — yuz tanildi.
     * 76 (yuz tanilmadi) va boshqalar davomat emas.
     */
    static final Set<Integer> PASS_MINORS = Set.of(1, 38, 75);
    static final int MAJOR_EVENT = 5;
    /** Bitta so'rov siklida ko'pi bilan shuncha sahifa (30 tadan) — katta to'plam bir necha siklda olinadi. */
    static final int MAX_PAGES_PER_CYCLE = 20;
    static final long OFFLINE_AFTER_MINUTES = 3;

    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private TerminalEndpointResolver resolver;
    @Autowired private FaceAttendanceIngestService ingest;

    private final Map<Long, ReentrantLock> locks = new ConcurrentHashMap<>();

    /** Terminal bilan eksklyuziv ishlash (monitor va qo'lda amallar orasida). */
    public <T> T withTerminalLock(Long terminalId, Supplier<T> action) {
        ReentrantLock lock = locks.computeIfAbsent(terminalId, id -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }

    // ─── Holat ───────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 60_000, initialDelay = 15_000)
    public void refreshStatuses() {
        for (FaceTerminal t : terminalRepo.findAll()) {
            if (!TerminalEndpointResolver.isHikvision(t)) continue;
            try {
                refreshStatus(t);
            } catch (Exception e) {
                log.warn("Terminal {} holatini tekshirishda kutilmagan xato: {}", t.getId(), e.toString());
            }
        }
    }

    /** Bitta terminal holatini hozir tekshiradi. Muvaffaqiyatsiz bo'lsa TerminalException tashlaydi. */
    public HikvisionIsapiClient.DeviceInfo refreshStatus(FaceTerminal t) {
        try {
            HikvisionIsapiClient c = resolver.hikvision(t);
            HikvisionIsapiClient.DeviceInfo info = c.deviceInfo();
            HikvisionIsapiClient.UserCounts counts = c.userCounts();
            terminalRepo.markOnline(t.getId(), FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now(),
                info.model() != null ? info.model() : t.getModel(),
                info.firmwareVersion() != null ? info.firmwareVersion() : t.getFirmwareVersion(),
                counts.users(), counts.usersWithFace());

            // Qurilma zavod sozlamasiga qaytarilsa serialNo qaytadan boshlanadi — aks holda
            // hisoblagich eski katta qiymatda qolib, yangi voqealar hech qachon o'qilmasdi.
            if (t.getLastEventSerial() != null) {
                long latest = c.latestSerial();
                if (latest < t.getLastEventSerial()) {
                    log.warn("Terminal {}: qurilma voqea hisoblagichi qaytadan boshlangan ({} < {}) — {} dan davom etiladi",
                        t.getId(), latest, t.getLastEventSerial(), latest);
                    terminalRepo.updateLastEventSerial(t.getId(), latest);
                }
            }
            return info;
        } catch (TerminalException e) {
            recordFailure(t, e);
            throw e;
        }
    }

    private void recordFailure(FaceTerminal t, TerminalException e) {
        boolean stale = t.getLastSeen() == null
            || t.getLastSeen().isBefore(LocalDateTime.now().minusMinutes(OFFLINE_AFTER_MINUTES));
        FaceTerminal.TerminalStatus status = stale ? FaceTerminal.TerminalStatus.OFFLINE
            : (t.getStatus() != null ? t.getStatus() : FaceTerminal.TerminalStatus.OFFLINE);
        terminalRepo.markError(t.getId(), status, truncate(e.getMessage(), 500));
    }

    // ─── Voqealar ────────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 5_000, initialDelay = 20_000)
    public void pollEvents() {
        for (FaceTerminal t : terminalRepo.findAll()) {
            // Oflayn terminalga har 5 soniyada urinib, rejalashtiruvchini timeout bilan band qilmaymiz —
            // refreshStatuses uni qayta ONLINE qilgach so'rov o'zi tiklanadi.
            if (!TerminalEndpointResolver.isHikvision(t) || t.getStatus() != FaceTerminal.TerminalStatus.ONLINE) continue;
            try {
                withTerminalLock(t.getId(), () -> pollTerminal(t));
            } catch (TerminalException e) {
                recordFailure(t, e);
            } catch (Exception e) {
                log.warn("Terminal {} voqealarini olishda kutilmagan xato: {}", t.getId(), e.toString());
            }
        }
    }

    public record PollResult(int read, int recorded, long lastSerial) {}

    PollResult pollTerminal(FaceTerminal t) {
        HikvisionIsapiClient c = resolver.hikvision(t);
        Long last = terminalRepo.findById(t.getId()).map(FaceTerminal::getLastEventSerial).orElse(null);

        if (last == null) {
            // Birinchi ulanish: qurilmadagi eski voqealar (terminal platformaga qo'shilishidan oldingi)
            // davomat sifatida import qilinmaydi — faqat bundan keyingilari.
            long latest = c.latestSerial();
            terminalRepo.updateLastEventSerial(t.getId(), latest);
            terminalRepo.touchOnline(t.getId(), FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());
            log.info("Terminal {}: voqea kuzatuvi boshlandi (serialNo {} dan keyin)", t.getId(), latest);
            return new PollResult(0, 0, latest);
        }

        int read = 0, recorded = 0;
        // MUHIM (2026-09-18, bugungi davomat yo'qolish xatosining davomi): bitta so'rov
        // ICHIDAGI tartibsizlik bugun tuzatildi (last = Math.max(last, serialNo), pastda),
        // lekin rasm biriktirilgan voqea BIR NECHA POLL SIKLIDAN keyin (5s+) paydo bo'lsa,
        // "last+1" dan boshlab so'rash uni abadiy o'tkazib yuboradi — chunki keyingi safar
        // qidiruv oynasi undan ILGARI o'tib ketgan bo'ladi. Shu sabab har safar oxirgi 10 ta
        // serialNo'dan qayta so'raladi — haqiqiy takrorlanish recordFaceEvent'dagi syncKey
        // orqali xavfsiz aniqlanadi (DUPLICATE), shuning uchun bu xavfsiz va arzon himoya.
        long fetchFrom = Math.max(1, last - 10);
        for (int page = 0; page < MAX_PAGES_PER_CYCLE; page++) {
            HikvisionIsapiClient.EventPage ep = c.eventsFromSerial(fetchFrom, HikvisionIsapiClient.MAX_PAGE);
            if (ep.events().isEmpty()) break;

            for (HikvisionIsapiClient.AcsEvent e : ep.events()) {
                // MUHIM (2026-09-17): qurilma voqealarni har doim ham serialNo o'sish tartibida
                // qaytармайди — rasm biriktirilgan (yuz taniladigan) voqealar odatda 1 pozitsiya
                // KECHIKIB keladi (masalan ...,1495,1494,1496,... — 1494 fiziqiy jihatdan oldinroq
                // sodir bo'lgan, lekin rasm keyinroq tayyor bo'lgani sabab ro'yxatda keyin chiqadi).
                // Avvalgi "himoya" (serialNo <= last bo'lsa o'tkazib yuborish) aynan shu "kech kelgan"
                // voqealarni "eskirgan" deb noto'g'ri o'tkazib yuborardi — bu aynan davomat yozilmay
                // qolishining asosiy sababi edi. Endi HAR bir voqea qayta ishlanadi; haqiqiy
                // takrorlanish recordFaceEvent'dagi syncKey (hik-{terminalId}-{serialNo}) orqali
                // xavfsiz aniqlanadi (DUPLICATE natija), shu sabab qo'shimcha himoyaga hojat yo'q.
                read++;
                if (isPass(e)) {
                    try {
                        byte[] pic = c.downloadPicture(e.pictureUrl());
                        FaceAttendanceIngestService.Result r = ingest.recordFaceEvent(t, e.employeeNo(), e.time(), e.serialNo(), pic);
                        if (r == FaceAttendanceIngestService.Result.RECORDED) {
                            recorded++;
                            terminalRepo.updateLastEventAt(t.getId(), LocalDateTime.now());
                        }
                    } catch (Exception ex) {
                        // Bitta buzuq voqea butun navbatni cheksiz to'xtatib qo'ymasligi uchun o'tkazib yuboriladi
                        log.error("Terminal {} voqea serialNo={} yozilmadi: {}", t.getId(), e.serialNo(), ex.toString());
                    }
                }
                last = Math.max(last, e.serialNo());
            }
            terminalRepo.updateLastEventSerial(t.getId(), last); // har sahifadan keyin — uzilishda qayta o'qish minimal
            // Keyingi sahifa (shu sikl ichida) — "-10 qaytish" faqat siklning birinchi
            // so'roviga tegishli, sahifalanishning o'zi shu sahifadagi haqiqiy natijadan davom etadi.
            fetchFrom = last + 1;
            if (!ep.more() && ep.events().size() < HikvisionIsapiClient.MAX_PAGE) break;
        }
        terminalRepo.touchOnline(t.getId(), FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());
        return new PollResult(read, recorded, last);
    }

    /**
     * Vaqt oralig'idagi voqealarni qayta o'qib davomatga yozadi (masalan terminal qo'shilishidan
     * oldingi kun). Dublikatlar syncKey/60s qoidasi bilan o'tkazib yuboriladi.
     */
    public PollResult backfill(FaceTerminal t, OffsetDateTime from, OffsetDateTime to) {
        return withTerminalLock(t.getId(), () -> {
            HikvisionIsapiClient c = resolver.hikvision(t);
            int read = 0, recorded = 0, position = 0;
            long maxSerial = 0;
            for (int page = 0; page < 200; page++) { // 200*30 = 6000 voqea chegarasi
                HikvisionIsapiClient.EventPage ep = c.eventsBetween(from, to, position, HikvisionIsapiClient.MAX_PAGE);
                if (ep.events().isEmpty()) break;
                for (HikvisionIsapiClient.AcsEvent e : ep.events()) {
                    read++;
                    maxSerial = Math.max(maxSerial, e.serialNo());
                    if (isPass(e)) {
                        byte[] pic = c.downloadPicture(e.pictureUrl());
                        if (ingest.recordFaceEvent(t, e.employeeNo(), e.time(), e.serialNo(), pic)
                                == FaceAttendanceIngestService.Result.RECORDED) {
                            recorded++;
                        }
                    }
                }
                position += ep.events().size();
                if (!ep.more()) break;
            }
            return new PollResult(read, recorded, maxSerial);
        });
    }

    static boolean isPass(HikvisionIsapiClient.AcsEvent e) {
        return e.major() == MAJOR_EVENT && PASS_MINORS.contains(e.minor()) && e.employeeNo() != null;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
