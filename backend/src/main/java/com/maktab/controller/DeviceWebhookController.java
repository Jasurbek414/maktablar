package com.maktab.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maktab.model.FaceTerminal;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.service.FaceAttendanceIngestService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Hikvision Face ID terminallaridan to'g'ridan-to'g'ri (HTTP Webhook yoki EHome/ISUP orqali)
 * keladigan real-vaqtli hodisalarni qabul qilish uchun ochiq API endpoint.
 */
@RestController
@RequestMapping("/api/public/devices")
public class DeviceWebhookController {

    private static final Logger log = LoggerFactory.getLogger(DeviceWebhookController.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final FaceTerminalRepository terminalRepo;
    private final FaceAttendanceIngestService ingest;

    public DeviceWebhookController(FaceTerminalRepository terminalRepo, FaceAttendanceIngestService ingest) {
        this.terminalRepo = terminalRepo;
        this.ingest = ingest;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> receiveWebhook(@RequestBody(required = false) String rawBody,
                                           @RequestParam(required = false) String serial) {
        if (rawBody == null || rawBody.isBlank()) {
            return ResponseEntity.ok(Map.of("status", "ok", "message", "empty body ignored"));
        }

        try {
            JsonNode root = JSON.readTree(rawBody);

            // Heartbeat tekshiruvi
            if (root.has("heartbeat") || "heartbeat".equalsIgnoreCase(root.path("eventType").asText(""))) {
                return ResponseEntity.ok(Map.of("status", "ok", "heartbeat", true));
            }

            // Terminalni aniqlash (serial, mac, ip yoki query orqali)
            String targetSerial = serial;
            if (targetSerial == null || targetSerial.isBlank()) {
                if (root.has("serialNo") && root.get("serialNo").isTextual()) {
                    targetSerial = root.get("serialNo").asText();
                } else if (root.has("devSerialNum")) {
                    targetSerial = root.get("devSerialNum").asText();
                } else if (root.has("macAddress")) {
                    String mac = root.get("macAddress").asText();
                    Optional<FaceTerminal> byMac = terminalRepo.findByMacAddress(mac);
                    if (byMac.isPresent()) targetSerial = byMac.get().getSerialNumber();
                } else if (root.has("ipAddress")) {
                    String ip = root.get("ipAddress").asText();
                    Optional<FaceTerminal> byIp = terminalRepo.findByIpAddress(ip);
                    if (byIp.isPresent()) targetSerial = byIp.get().getSerialNumber();
                }
            }

            FaceTerminal terminal = null;
            if (targetSerial != null && !targetSerial.isBlank()) {
                terminal = terminalRepo.findBySerialNumber(targetSerial).orElse(null);
            }

            if (terminal == null) {
                // Agar bitta maktabda faqat bitta faol terminal bo'lsa yoki test bo'lsa
                terminal = terminalRepo.findAll().stream()
                        .filter(t -> t.getStatus() == FaceTerminal.TerminalStatus.ONLINE)
                        .findFirst()
                        .orElse(null);
            }

            if (terminal == null) {
                log.warn("Webhook: mos Face ID terminal topilmadi (serial={})", targetSerial);
                return ResponseEntity.ok(Map.of("status", "skipped", "reason", "terminal not found"));
            }

            // Hodisa tafsilotlarini ajratish
            JsonNode acs = root.has("AccessControllerEvent") ? root.get("AccessControllerEvent") : root;

            int major = acs.path("majorEventType").asInt(acs.path("major").asInt(5));
            int minor = acs.path("subEventType").asInt(acs.path("minor").asInt(75));

            // Faqat o'tish hodisalari (major=5; minor: 75=yuz, 1=karta, 38=barmoq izi)
            if (major != 5 || (minor != 75 && minor != 1 && minor != 38)) {
                return ResponseEntity.ok(Map.of("status", "ignored", "major", major, "minor", minor));
            }

            String employeeNo = acs.path("employeeNoString").asText(
                    acs.path("employeeNo").asText(acs.path("cardNo").asText(""))
            );

            if (employeeNo.isBlank()) {
                return ResponseEntity.ok(Map.of("status", "ignored", "reason", "empty employeeNo"));
            }

            // Vaqtni olish
            String timeStr = root.path("dateTime").asText(acs.path("time").asText(""));
            OffsetDateTime time;
            try {
                if (!timeStr.isBlank()) {
                    time = OffsetDateTime.parse(timeStr);
                } else {
                    time = OffsetDateTime.now();
                }
            } catch (Exception e) {
                time = OffsetDateTime.now();
            }

            Long serialNo = acs.has("serialNo") && acs.get("serialNo").isNumber() ? acs.get("serialNo").asLong() : null;

            // Terminalni ONLINE holatga yangilash
            terminalRepo.touchOnline(terminal.getId(), FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());

            // Davomatga yozish
            FaceAttendanceIngestService.Result result = ingest.recordFaceEvent(terminal, employeeNo, time, serialNo, () -> null);

            log.info("Webhook orqali Face ID hodisasi yozildi: terminal={}, emp={}, time={}, natija={}",
                    terminal.getName(), employeeNo, time, result);

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "result", result.name(),
                    "terminal", terminal.getName(),
                    "employeeNo", employeeNo
            ));
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
