package com.maktab.controller;

import com.maktab.model.BotConfig;
import com.maktab.repository.BotConfigRepository;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;

/**
 * Telegram bot tokenini superadmin panelidan boshqarish uchun.
 *
 * /api/admin/bot-config — SecurityConfig'da /api/admin/** allaqachon
 * hasRole("SUPERADMIN") bilan himoyalangan, shu yerda qo'shimcha tekshiruv
 * shart emas.
 *
 * /api/internal/bot-config/token — bot.py uchun, GuardianController'dagi
 * X-Bot-Key/BOT_SHARED_SECRET naqshi bilan bir xil o'z-ichida autentifikatsiya.
 * Token bo'sh/placeholder bo'lsa bot cheksiz "restarting" tsiklida qotib
 * qolardi (Application.builder().token() -> InvalidToken -> process crash);
 * endi bot shu endpointni davriy so'rab, tayyor bo'lganda o'zi topib oladi.
 */
@RestController
public class BotConfigController {

    @Autowired private BotConfigRepository botConfigRepo;
    @Autowired private I18nService i18n;

    @Value("${app.bot.shared-secret:}")
    private String botSharedSecret;

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isValidBotKey(String botKey) {
        return botSharedSecret != null && !botSharedSecret.isBlank() && constantTimeEquals(botKey, botSharedSecret);
    }

    private BotConfig currentConfig() {
        return botConfigRepo.findAll().stream().findFirst().orElse(null);
    }

    private String mask(String token) {
        if (token == null || token.isBlank()) return null;
        if (token.length() <= 8) return "****";
        return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
    }

    /** GET /api/admin/bot-config — panel uchun joriy holat, to'liq token hech qachon qaytarilmaydi. */
    @GetMapping("/api/admin/bot-config")
    public ResponseEntity<?> status() {
        BotConfig config = currentConfig();
        boolean configured = config != null && config.getBotToken() != null && !config.getBotToken().isBlank();
        return ResponseEntity.ok(Map.of(
            "configured", configured,
            "maskedToken", configured ? mask(config.getBotToken()) : "",
            "broadcastEnabled", config == null || config.getBroadcastEnabled(),
            "guardianMessagingEnabled", config == null || config.getGuardianMessagingEnabled(),
            "attendanceNotificationsEnabled", config == null || config.getAttendanceNotificationsEnabled(),
            "attendanceDedupMinutes", config != null && config.getAttendanceDedupMinutes() != null
                ? config.getAttendanceDedupMinutes() : 180
        ));
    }

    /**
     * PUT /api/admin/bot-config { botToken?, broadcastEnabled?, guardianMessagingEnabled?,
     * attendanceNotificationsEnabled? } — panel'dan qisman yangilash: faqat body'da kelgan
     * maydonlar o'zgaradi (masalan faqat toggle almashtirilsa, tokenga tegilmaydi).
     */
    @PutMapping("/api/admin/bot-config")
    public ResponseEntity<?> update(@RequestBody Map<String, Object> body) {
        BotConfig config = currentConfig();
        if (config == null) {
            config = new BotConfig();
        }
        if (body.containsKey("botToken")) {
            config.setBotToken(body.get("botToken") != null ? body.get("botToken").toString().trim() : "");
        }
        if (body.containsKey("broadcastEnabled")) {
            config.setBroadcastEnabled(Boolean.TRUE.equals(body.get("broadcastEnabled")));
        }
        if (body.containsKey("guardianMessagingEnabled")) {
            config.setGuardianMessagingEnabled(Boolean.TRUE.equals(body.get("guardianMessagingEnabled")));
        }
        if (body.containsKey("attendanceNotificationsEnabled")) {
            config.setAttendanceNotificationsEnabled(Boolean.TRUE.equals(body.get("attendanceNotificationsEnabled")));
        }
        if (body.containsKey("attendanceDedupMinutes")) {
            Object v = body.get("attendanceDedupMinutes");
            config.setAttendanceDedupMinutes(v != null ? Integer.valueOf(v.toString()) : null);
        }
        config.setUpdatedAt(Instant.now());
        botConfigRepo.save(config);
        boolean configured = config.getBotToken() != null && !config.getBotToken().isBlank();
        return ResponseEntity.ok(Map.of(
            "configured", configured,
            "broadcastEnabled", config.getBroadcastEnabled(),
            "guardianMessagingEnabled", config.getGuardianMessagingEnabled(),
            "attendanceNotificationsEnabled", config.getAttendanceNotificationsEnabled(),
            "attendanceDedupMinutes", config.getAttendanceDedupMinutes() != null ? config.getAttendanceDedupMinutes() : 180
        ));
    }

    /** GET /api/internal/bot-config/token — bot.py uchun, X-Bot-Key bilan. */
    @GetMapping("/api/internal/bot-config/token")
    public ResponseEntity<?> internalToken(@RequestHeader(value = "X-Bot-Key", required = false) String botKey) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        BotConfig config = currentConfig();
        if (config == null || config.getBotToken() == null || config.getBotToken().isBlank()) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.bot_config.token_not_set")));
        }
        return ResponseEntity.ok(Map.of("botToken", config.getBotToken()));
    }
}
