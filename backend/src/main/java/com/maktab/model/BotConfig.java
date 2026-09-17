package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.Instant;

/**
 * Telegram bot tokeni — superadmin panelidan boshqariladi, bot.py uni
 * BotConfigController#internalToken orqali oladi. Bitta qatordan iborat
 * (generic key-value emas, faqat shu sozlama kerak bo'lgani uchun).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "bot_config")
public class BotConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String botToken;

    @Column(nullable = false)
    private Instant updatedAt;

    // Bot funksiyalarini panel'dan yoqish/o'chirish (nazorat) — superadmin uchun.
    @Column(nullable = false)
    private Boolean broadcastEnabled = true;

    @Column(nullable = false)
    private Boolean guardianMessagingEnabled = true;

    @Column(nullable = false)
    private Boolean attendanceNotificationsEnabled = true;

    /** Bir xil turdagi (IN yoki OUT) qayta o'tish necha daqiqa "dublikat" hisoblanishi —
     * FaceAttendanceIngestService#DEDUP_WINDOW_SECONDS o'rnini bosadi, superadmin panelidan
     * o'zgartiriladi. Null bo'lsa standart 180 daqiqa (3 soat) qo'llaniladi. */
    @Column
    private Integer attendanceDedupMinutes;
}
