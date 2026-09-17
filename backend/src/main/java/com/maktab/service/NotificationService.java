package com.maktab.service;

import com.maktab.model.Guardian;
import com.maktab.model.Message;
import com.maktab.model.Notification;
import com.maktab.model.Student;
import com.maktab.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * O'quvchi Face ID dan o'tganda:
 * 1. Ota-onaga Telegram bot orqali xabar yuborish
 * 2. Web dashboard'ga bildirishnoma yaratish
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    // MUHIM (2026-09-15 audit): avval HttpClient.newHttpClient() edi — na ulanish, na
    // so'rov timeout'i bor edi. Bot konteyneri qotib qolsa (Flask dev-server bitta
    // thread'da bloklanishi mumkin), httpClient.send() CHEKSIZ kutardi va Spring'ning
    // @Async pool'i (standart 8 thread) to'lib, keyingi barcha bildirishnomalar navbatda
    // o'lib qolardi. Endi ulanish 5s, butun so'rov 15s bilan cheklangan.
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();
    private static final java.time.Duration REQUEST_TIMEOUT = java.time.Duration.ofSeconds(15);
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private NotificationRepository notifRepo;

    @Autowired
    private BotConfigService botConfigService;

    @Value("${BOT_WEBHOOK_URL:http://bot:5000}")
    private String botUrl;

    // MUHIM (2026-09-18 audit): bot.py'ning /webhook/* endpointlari endi X-Bot-Key talab
    // qiladi (avval hech qanday sekret tekshirmasdi) — shu bilan bir xil BOT_SHARED_SECRET
    // env o'zgaruvchisi (bot ham, GuardianController ham shuni ishlatadi).
    @Value("${app.bot.shared-secret:}")
    private String botSharedSecret;

    @Value("${BACKEND_PUBLIC_URL:https://maktab.ecos.uz}")
    private String publicUrl;

    /**
     * Davomat eventi bo'lganda — ota-onalarga Telegram xabar + web bildirishnoma.
     *
     * MUHIM: avval bu metod {@code void} qaytarardi — @Async proxy chaqiruvchiga DARHOL
     * qaytgani uchun chaqiruvchi (AttendanceController) haqiqiy natijani bilmasdan
     * "notificationSent = true" deb belgilardi (real xabar yuborilgan-yubormaganidan
     * qat'i nazar). Endi {@link CompletableFuture}&lt;Boolean&gt; qaytaradi — chaqiruvchi
     * shu future tugagach (haqiqiy HTTP javobidan keyin) natijani yozadi.
     */
    @Async
    public CompletableFuture<Boolean> notifyGuardians(Student student, OffsetDateTime timestamp, String type, String snapshotUrl) {
        // 1. Web dashboard bildirishnoma
        createAttendanceNotification(student, timestamp, type);

        // MUHIM (2026-09-15 audit): panel'dagi "Davomat bildirishnomalari" tugmasi
        // (BotConfig.attendanceNotificationsEnabled) hech qayerda tekshirilmasdi — superadmin
        // uni o'chirsa ham xabarlar ketaverardi. Endi tekshiriladi.
        if (!botConfigService.isAttendanceNotificationsEnabled()) {
            log.info("Davomat bildirishnomalari panel orqali o'chirilgan — xabar yuborilmadi");
            return CompletableFuture.completedFuture(true);
        }

        // 2. Telegram notification
        List<Guardian> guardians = student.getGuardians();
        if (guardians == null || guardians.isEmpty()) {
            log.info("Student {} has no guardians, skipping Telegram notification", student.getId());
            return CompletableFuture.completedFuture(true); // yuborishga hech narsa yo'q — bu xato emas
        }

        List<Map<String, String>> guardianData = new ArrayList<>();
        for (Guardian g : guardians) {
            // MUHIM (2026-09-15 audit): avval faqat telegramUserId tekshirilardi —
            // notificationsEnabled=false qilgan ota-ona ham davomat xabarini olaverardi
            // (notifyGuardianReply va broadcast to'g'ri tekshirardi, faqat eng ko'p
            // ishlatiladigan shu oqim tekshirmasdi).
            if (g.getTelegramUserId() != null && !g.getTelegramUserId().isEmpty()
                    && Boolean.TRUE.equals(g.getNotificationsEnabled())) {
                Map<String, String> gMap = new HashMap<>();
                gMap.put("telegramUserId", g.getTelegramUserId());
                gMap.put("name", g.getName());
                // MUHIM (2026-09-15 audit): bot USER_LANGUAGES ni faqat XOTIRADA saqlaydi va
                // DB'dan hech qachon o'qimaydi — bot qayta ishga tushgach barcha ota-onalar
                // yana o'zbekcha xabar olardi. Endi til har bir xabar bilan birga yuboriladi.
                gMap.put("language", g.getLanguagePreference() != null ? g.getLanguagePreference() : "uz");
                guardianData.add(gMap);
            }
        }

        if (guardianData.isEmpty()) {
            log.info("No guardians with Telegram for student {}", student.getId());
            return CompletableFuture.completedFuture(true); // yuborishga hech narsa yo'q — bu xato emas
        }

        String photoUrl = null;
        if (snapshotUrl != null && !snapshotUrl.isEmpty()) {
            // MUHIM (2026-09-15 audit): batchSync (offline sinxronizatsiya) nisbiy yo'l
            // yuboradi ("/api/files/x.jpg") va u avval prefikslanmasdan Telegram'ga
            // uzatilardi — Telegram serverlari uni ocha olmay, rasm HECH QACHON
            // yetib bormasdi (jimgina matnga tushib ketardi). Endi student.photoUrl
            // bilan bir xil qoida: nisbiy bo'lsa ochiq domen bilan to'ldiriladi.
            photoUrl = snapshotUrl.startsWith("http") ? snapshotUrl : publicUrl + snapshotUrl;
        } else if (student.getPhotoUrl() != null) {
            photoUrl = student.getPhotoUrl().startsWith("http")
                ? student.getPhotoUrl()
                : publicUrl + student.getPhotoUrl();
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("studentId", student.getId());
            payload.put("studentName", student.getFullName());
            payload.put("type", type);
            payload.put("timestamp", timestamp.toString());
            payload.put("photoUrl", photoUrl);
            payload.put("schoolName", student.getSchool() != null ? student.getSchool().getName() : null);
            payload.put("guardians", guardianData);

            String json = mapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(botUrl + "/webhook/attendance"))
                    .header("Content-Type", "application/json")
                    .header("X-Bot-Key", botSharedSecret)
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Telegram notification sent for student {}: status={}", student.getId(), response.statusCode());
            return CompletableFuture.completedFuture(response.statusCode() >= 200 && response.statusCode() < 300);
        } catch (Exception e) {
            log.error("Failed to send Telegram notification for student {}: {}", student.getId(), e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    /**
     * Davomat uchun web bildirishnoma yaratish
     */
    public void createAttendanceNotification(Student student, OffsetDateTime timestamp, String type) {
        try {
            Notification n = new Notification();
            String emoji = "IN".equals(type) ? "🟢" : "🔴";
            String action = "IN".equals(type) ? "maktabga kirdi" : "maktabdan chiqdi";
            String time = timestamp.toLocalTime().toString().substring(0, 5);

            n.setTitle(emoji + " " + student.getFullName() + " " + action);
            n.setMessage(student.getFullName() + " soat " + time + " da " + action
                + (student.getSchool() != null ? " (" + student.getSchool().getName() + ")" : ""));
            n.setType(Notification.NotificationType.ATTENDANCE);
            n.setLevel(Notification.NotificationLevel.INFO);
            n.setSchoolId(student.getSchool() != null ? student.getSchool().getId() : null);
            n.setRelatedEntity("STUDENT");
            n.setRelatedId(student.getId());
            n.setIsRead(false);
            n.setCreatedAt(OffsetDateTime.now());
            notifRepo.save(n);
        } catch (Exception e) {
            log.error("Failed to create web notification: {}", e.getMessage());
        }
    }

    /**
     * Qurilma holati bildirishnomasi
     */
    public void createDeviceNotification(String deviceName, Long schoolId, boolean online) {
        try {
            Notification n = new Notification();
            n.setTitle(online ? "🟢 " + deviceName + " onlayn" : "🔴 " + deviceName + " oflayn");
            n.setMessage(deviceName + " " + (online ? "serverga ulandi" : "serverdan uzildi"));
            n.setType(Notification.NotificationType.DEVICE_STATUS);
            n.setLevel(online ? Notification.NotificationLevel.SUCCESS : Notification.NotificationLevel.WARNING);
            n.setSchoolId(schoolId);
            n.setRelatedEntity("DEVICE");
            n.setIsRead(false);
            n.setCreatedAt(OffsetDateTime.now());
            notifRepo.save(n);
        } catch (Exception e) {
            log.error("Failed to create device notification: {}", e.getMessage());
        }
    }

    /**
     * Umumiy tizim bildirishnomasi
     */
    public void createSystemNotification(String title, String message, Notification.NotificationLevel level) {
        try {
            Notification n = new Notification();
            n.setTitle(title);
            n.setMessage(message);
            n.setType(Notification.NotificationType.SYSTEM);
            n.setLevel(level);
            n.setIsRead(false);
            n.setCreatedAt(OffsetDateTime.now());
            notifRepo.save(n);
        } catch (Exception e) {
            log.error("Failed to create system notification: {}", e.getMessage());
        }
    }

    /**
     * Xodim StudentController#sendMessage orqali javob yozganda — shu farzandning botga
     * ulangan guardian'lariga Telegram orqali real-vaqtda yetkazish. notifyGuardians'dagi
     * bilan bir xil HTTP-POST naqshi, faqat marshrut va payload boshqa (matn xabar, rasm yo'q).
     */
    @Async
    public void notifyGuardianReply(Message message, Student student) {
        if (student.getGuardians() == null || student.getGuardians().isEmpty()) return;
        List<String> telegramIds = new ArrayList<>();
        for (Guardian g : student.getGuardians()) {
            if (g.getTelegramUserId() != null && !g.getTelegramUserId().isEmpty()
                    && Boolean.TRUE.equals(g.getNotificationsEnabled())) {
                telegramIds.add(g.getTelegramUserId());
            }
        }
        if (telegramIds.isEmpty()) return;

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("studentId", student.getId());
            payload.put("studentName", student.getFullName());
            payload.put("senderName", message.getSenderName());
            payload.put("text", message.getText());
            payload.put("guardianTelegramIds", telegramIds);

            String json = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(botUrl + "/webhook/message"))
                    .header("Content-Type", "application/json")
                    .header("X-Bot-Key", botSharedSecret)
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Guardian reply push sent for student {}: status={}", student.getId(), response.statusCode());
        } catch (Exception e) {
            log.error("Failed to push staff reply to bot for student {}: {}", student.getId(), e.getMessage());
        }
    }

    /**
     * Admin panel'dan ommaviy xabar (broadcast) — BroadcastController shu metodni chaqiradi,
     * qamrovdagi guardian'lar ro'yxatini o'zi hisoblab kelgan bo'ladi (schoolId bo'yicha
     * cheklangan yoki cheklovsiz — CurrentUserService.resolveSchoolScope orqali).
     * Muvaffaqiyatli yuborilgan qabul qiluvchilar sonini qaytaradi (audit log uchun).
     */
    public int broadcastToGuardians(List<Guardian> guardians, String text) {
        List<String> telegramIds = guardians.stream()
            .map(Guardian::getTelegramUserId)
            .filter(id -> id != null && !id.isEmpty())
            .collect(java.util.stream.Collectors.toList());
        if (telegramIds.isEmpty()) return 0;

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("telegramUserIds", telegramIds);
            payload.put("text", text);

            String json = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(botUrl + "/webhook/broadcast"))
                    .header("Content-Type", "application/json")
                    .header("X-Bot-Key", botSharedSecret)
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Broadcast sent to {} guardians: status={}", telegramIds.size(), response.statusCode());
            return response.statusCode() >= 200 && response.statusCode() < 300 ? telegramIds.size() : 0;
        } catch (Exception e) {
            log.error("Failed to send broadcast: {}", e.getMessage());
            return 0;
        }
    }
}

