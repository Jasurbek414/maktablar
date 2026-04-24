package com.maktab.service;

import com.maktab.model.Guardian;
import com.maktab.model.Student;
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
 * O'quvchi Face ID dan o'tganda ota-onaga Telegram bot orqali xabar yuborish.
 * Backend → Bot /webhook/attendance → Telegram
 * 
 * Yuboriladi: o'quvchi ismi, rasmi, vaqt, kirdi/chiqdi holati
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${BOT_WEBHOOK_URL:http://bot:5000}")
    private String botUrl;

    @Value("${BACKEND_PUBLIC_URL:https://maktab.ecos.uz}")
    private String publicUrl;

    /**
     * Davomat eventi bo'lganda ota-onalarga xabar yuborish.
     * Async — javobni kutmasdan ishlaydi
     */
    @Async
    public void notifyGuardians(Student student, OffsetDateTime timestamp, String type, String snapshotUrl) {
        List<Guardian> guardians = student.getGuardians();
        if (guardians == null || guardians.isEmpty()) {
            log.info("Student {} has no guardians, skipping notification", student.getId());
            return;
        }

        // Guardian ma'lumotlari
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

        // Rasm URL
        String photoUrl = null;
        if (snapshotUrl != null && !snapshotUrl.isEmpty()) {
            // Mini-PC dan kelgan real vaqtdagi rasm
            photoUrl = snapshotUrl;
        } else if (student.getPhotoUrl() != null) {
            // Profil rasmi
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
            log.info("Notification sent for student {}: status={}", student.getId(), response.statusCode());
        } catch (Exception e) {
            log.error("Failed to notify guardians for student {}: {}", student.getId(), e.getMessage());
        }
    }
}
