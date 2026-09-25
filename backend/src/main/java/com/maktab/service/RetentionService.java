package com.maktab.service;

import com.maktab.repository.NotificationRepository;
import com.maktab.repository.PersonRecognitionEventRepository;
import com.maktab.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

/**
 * Eski ma'lumotlarni tozalash (2026-09-25).
 *
 * NEGA: 2026-09-25 auditida uchta jadval CHEKSIZ o'sishi aniqlandi —
 *  - person_recognition_events: {@code deleteByOccurredAtBefore} yozilgan edi, lekin HECH QACHON
 *    chaqirilmasdi. 150 kamera ulanganda kuniga yuz minglab qator yig'iladi.
 *  - refresh_tokens: bekor qilingan/muddati o'tgan tokenlar hech qachon o'chirilmasdi
 *    (2 foydalanuvchi uchun allaqachon 119 qator).
 *  - notifications: qurilma ogohlantirishlari to'planib borardi.
 *
 * Kameradan olingan joylashuv yozuvlari — shaxsiy ma'lumot, shuning uchun ularning muddati
 * ataylab qisqa (foydalanuvchi tanlagan "cheklangan saqlash" siyosati).
 *
 * Har kuni 03:30 da ishlaydi — kunlik zaxira nusxa (03:00) TUGAGANIDAN KEYIN, ya'ni o'chirilgan
 * ma'lumot o'sha kungi zaxirada saqlanib qoladi.
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    @Autowired private PersonRecognitionEventRepository recognitionRepo;
    @Autowired private RefreshTokenRepository refreshTokenRepo;
    @Autowired private NotificationRepository notificationRepo;

    /** Kamera/terminal orqali "kim qayerda ko'rindi" yozuvlari (shaxsiy ma'lumot). */
    @Value("${app.retention.recognition-events-days:30}")
    private int recognitionDays;

    /** Muddati o'tgan yoki bekor qilingan refresh tokenlar. */
    @Value("${app.retention.refresh-tokens-days:7}")
    private int refreshTokenDays;

    /** Panel bildirishnomalari. */
    @Value("${app.retention.notifications-days:90}")
    private int notificationDays;

    @Scheduled(cron = "${app.retention.cron:0 30 3 * * *}", zone = "Asia/Tashkent")
    public void cleanUp() {
        OffsetDateTime now = OffsetDateTime.now();
        try {
            int events = recognitionRepo.deleteByOccurredAtBefore(now.minusDays(recognitionDays));
            int tokens = refreshTokenRepo.deleteExpiredOrRevokedBefore(now.minusDays(refreshTokenDays));
            int notifs = notificationRepo.deleteOlderThan(now.minusDays(notificationDays));
            if (events + tokens + notifs > 0) {
                log.info("Retention: {} ta tanish hodisasi, {} ta token, {} ta bildirishnoma o'chirildi",
                    events, tokens, notifs);
            }
        } catch (Exception e) {
            // Tozalash muvaffaqiyatsiz bo'lsa ham ilova ishlashda davom etadi — keyingi kuni qayta urinadi
            log.error("Retention vazifasi bajarilmadi: {}", e.toString());
        }
    }
}
