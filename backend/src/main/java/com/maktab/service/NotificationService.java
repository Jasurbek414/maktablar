package com.maktab.service;

import com.maktab.model.Guardian;
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
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * O'quvchi Face ID dan o'tganda:
 * 1. Ota-onaga Telegram bot orqali xabar yuborish
 * 2. Web dashboard'ga bildirishnoma yaratish
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private NotificationRepository notifRepo;

    @Value("${BOT_WEBHOOK_URL:http://bot:5000}")
    private String botUrl;

    @Value("${BACKEND_PUBLIC_URL:https://maktab.ecos.uz}")
    private String publicUrl;

    /**
     * Davomat eventi bo'lganda — ota-onalarga Telegram xabar + web bildirishnoma
     */
    @Async
    public void notifyGuardians(Student student, OffsetDateTime timestamp, String type, String snapshotUrl) {
        // 1. Web dashboard bildirishnoma
        createAttendanceNotification(student, timestamp, type);

        // 2. Telegram notification
        List<Guardian> guardians = student.getGuardians();
        if (guardians == null || guardians.isEmpty()) {
            log.info("Student {} has no guardians, skipping Telegram notification", student.getId());
            return;
        }

        List<Map<String, String>> guardianData = new ArrayList<>();
        for (Guardian g : guardians) {
            if (g.getTelegramUserId() != null && !g.getTelegramUserId().isEmpty()) {
                Map<String, String> gMap = new HashMap<>();
                gMap.put("telegramUserId", g.getTelegramUserId());
                gMap.put("name", g.getName());
                guardianData.add(gMap);
            }
        }

        if (guardianData.isEmpty()) {
            log.info("No guardians with Telegram for student {}", student.getId());
            return;
        }

        String photoUrl = null;
        if (snapshotUrl != null && !snapshotUrl.isEmpty()) {
            photoUrl = snapshotUrl;
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
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Telegram notification sent for student {}: status={}", student.getId(), response.statusCode());
        } catch (Exception e) {
            log.error("Failed to send Telegram notification for student {}: {}", student.getId(), e.getMessage());
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
}

