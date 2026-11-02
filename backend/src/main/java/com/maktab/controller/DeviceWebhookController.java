package com.maktab.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maktab.model.FaceTerminal;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.service.FaceAttendanceIngestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hikvision Face ID terminallaridan to'g'ridan-to'g'ri (HTTP Webhook yoki ISUP Listening / Alarm Center orqali)
 * keladigan real-vaqtli hodisalarni qabul qilish uchun ochiq API endpoint.
 *
 * MikroTik yoki VPN talab qilmaydi — qurilmaning o'zi bulutga HTTPS POST orqali yuboradi.
 */
@RestController
@RequestMapping({"/api/public/devices", "/api/events"})
public class DeviceWebhookController {

    private static final Logger log = LoggerFactory.getLogger(DeviceWebhookController.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final FaceTerminalRepository terminalRepo;
    private final FaceAttendanceIngestService ingest;

    public DeviceWebhookController(FaceTerminalRepository terminalRepo, FaceAttendanceIngestService ingest) {
        this.terminalRepo = terminalRepo;
        this.ingest = ingest;
    }

    @GetMapping(value = {"/webhook", "/webhook/{terminalId}"})
    public ResponseEntity<Map<String, Object>> pingWebhook(@PathVariable(required = false) Long terminalId) {
        if (terminalId != null && terminalId > 0) {
            terminalRepo.touchOnline(terminalId, FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());
        }
        return ResponseEntity.ok(Map.of(
                "statusCode", 1,
                "statusString", "OK",
                "service", "ECOS Maktab Device Webhook",
                "terminalId", terminalId != null ? terminalId : 0
        ));
    }

    @PostMapping(value = {"/webhook", "/webhook/{terminalId}"})
    public ResponseEntity<Map<String, Object>> receiveWebhook(
            @PathVariable(required = false) Long terminalId,
            @RequestParam(required = false) String serial,
            HttpServletRequest request) {

        String rawPayload = null;
        byte[] pictureBytes = null;

        try {
            // 1. Agar Spring Multipart request bo'lsa
            if (request instanceof MultipartHttpServletRequest multipartRequest) {
                for (Map.Entry<String, MultipartFile> entry : multipartRequest.getFileMap().entrySet()) {
                    String name = entry.getKey();
                    MultipartFile file = entry.getValue();
                    String ct = file.getContentType();
                    log.info("Webhook multipart file topildi: name={}, filename={}, size={}, ct={}",
                            name, file.getOriginalFilename(), file.getSize(), ct);
                    if (rawPayload == null && (name.equalsIgnoreCase("event_log") || name.equalsIgnoreCase("event") ||
                            (ct != null && (ct.contains("json") || ct.contains("xml"))))) {
                        rawPayload = new String(file.getBytes(), StandardCharsets.UTF_8);
                    } else if (pictureBytes == null && (name.toLowerCase().contains("pic") || name.toLowerCase().contains("image") ||
                            name.toLowerCase().contains("snap") || (ct != null && ct.startsWith("image/")))) {
                        pictureBytes = file.getBytes();
                    }
                }
                if (rawPayload == null) {
                    for (Map.Entry<String, String[]> entry : multipartRequest.getParameterMap().entrySet()) {
                        String name = entry.getKey();
                        String[] vals = entry.getValue();
                        if (vals != null && vals.length > 0 && vals[0] != null && !vals[0].isBlank()) {
                            log.info("Webhook multipart parameter topildi: name={}, len={}", name, vals[0].length());
                            if (name.equalsIgnoreCase("AccessControllerEvent") || name.equalsIgnoreCase("event_log") ||
                                    name.equalsIgnoreCase("event") || vals[0].startsWith("{") || vals[0].startsWith("<")) {
                                rawPayload = vals[0];
                                break;
                            }
                        }
                    }
                }
            }

            // 2. Agar native request.getParts() orqali bo'lsa
            if (rawPayload == null && request.getContentType() != null && request.getContentType().toLowerCase().contains("multipart")) {
                try {
                    for (Part part : request.getParts()) {
                        String name = part.getName();
                        String ct = part.getContentType();
                        log.info("Webhook native Part topildi: name={}, size={}, ct={}", name, part.getSize(), ct);
                        if (rawPayload == null && ("AccessControllerEvent".equalsIgnoreCase(name) || "event_log".equalsIgnoreCase(name) ||
                                "event".equalsIgnoreCase(name) || (ct != null && (ct.contains("json") || ct.contains("xml"))))) {
                            try (InputStream is = part.getInputStream()) {
                                rawPayload = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                            }
                        } else if (pictureBytes == null && ("picture".equalsIgnoreCase(name) || "image".equalsIgnoreCase(name) ||
                                name.toLowerCase().contains("snap") || (ct != null && ct.startsWith("image/")))) {
                            try (InputStream is = part.getInputStream()) {
                                pictureBytes = is.readAllBytes();
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Webhook getParts o'qishda ogohlantirish: {}", e.getMessage());
                }
            }

            // 3. Agar standart InputStream (raw JSON, XML yoki raw multipart stream) bo'lsa
            if (rawPayload == null) {
                try (InputStream is = request.getInputStream()) {
                    byte[] bytes = is.readAllBytes();
                    if (bytes.length > 0) {
                        String bodyStr = new String(bytes, StandardCharsets.UTF_8);
                        log.info("Webhook raw input stream o'qildi: bytes={}", bytes.length);
                        if (bodyStr.trim().startsWith("--")) {
                            int jsonStart = bodyStr.indexOf("{\n");
                            if (jsonStart == -1) jsonStart = bodyStr.indexOf("{\"");
                            int jsonEnd = bodyStr.lastIndexOf("}");
                            if (jsonStart != -1 && jsonEnd > jsonStart) {
                                rawPayload = bodyStr.substring(jsonStart, jsonEnd + 1);
                                log.info("Multipart matnidan JSON ajratib olindi (len: {})", rawPayload.length());
                            } else {
                                int xmlStart = bodyStr.indexOf("<?xml");
                                if (xmlStart == -1) xmlStart = bodyStr.indexOf("<EventNotificationAlert");
                                int xmlEnd = bodyStr.lastIndexOf(">");
                                if (xmlStart != -1 && xmlEnd > xmlStart) {
                                    rawPayload = bodyStr.substring(xmlStart, xmlEnd + 1);
                                    log.info("Multipart matnidan XML ajratib olindi (len: {})", rawPayload.length());
                                }
                            }
                        } else {
                            rawPayload = bodyStr;
                        }
                    }
                } catch (Exception e) {
                    log.warn("Webhook getInputStream xatosi: {}", e.getMessage());
                }
            }

            if (rawPayload == null || rawPayload.trim().isEmpty()) {
                log.info("Webhook bo'sh payload (Heartbeat / Ping): terminalId={}", terminalId);
                if (terminalId != null && terminalId > 0) {
                    terminalRepo.touchOnline(terminalId, FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());
                }
                return ResponseEntity.ok(Map.of("statusCode", 1, "statusString", "OK"));
            }

            log.info("Webhook voqea keldi! terminalId={}, payloadLength={}, hasPicture={}",
                    terminalId, rawPayload.length(), pictureBytes != null);
            return processPayload(terminalId, serial, rawPayload.trim(), pictureBytes);

        } catch (Exception e) {
            log.error("Webhook voqeasini qabul qilishda kutilmagan xato: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("statusCode", 1, "statusString", "OK"));
        }
    }

    private ResponseEntity<Map<String, Object>> processPayload(Long targetTerminalId, String paramSerial, String raw, byte[] pictureBytes) {
        String mac = null;
        String serial = paramSerial;
        String ip = null;
        String employeeNo = null;
        int major = 0;
        int minor = 0;
        long serialNo = 0;
        String timeStr = null;
        String eventType = "";

        if (raw.startsWith("<")) {
            // XML format
            mac = extractXmlTag(raw, "macAddress");
            if (serial == null) serial = extractXmlTag(raw, "deviceSerial");
            if (serial == null) serial = extractXmlTag(raw, "devSerial");
            if (serial == null) serial = extractXmlTag(raw, "devID");
            if (serial == null) serial = extractXmlTag(raw, "serialNo");
            ip = extractXmlTag(raw, "ipAddress");
            eventType = extractXmlTag(raw, "eventType");
            employeeNo = extractXmlTag(raw, "employeeNoString");
            if (employeeNo == null || employeeNo.isBlank()) employeeNo = extractXmlTag(raw, "employeeNo");
            if (employeeNo == null || employeeNo.isBlank()) employeeNo = extractXmlTag(raw, "cardNo");
            major = parseNum(extractXmlTag(raw, "majorEventType"));
            minor = parseNum(extractXmlTag(raw, "subEventType"));
            serialNo = parseLong(extractXmlTag(raw, "serialNo"));
            timeStr = extractXmlTag(raw, "dateTime");
            if (timeStr == null) timeStr = extractXmlTag(raw, "time");
        } else {
            // JSON format
            try {
                JsonNode root = JSON.readTree(raw);
                mac = root.path("macAddress").asText(null);
                ip = root.path("ipAddress").asText(null);
                eventType = root.path("eventType").asText("");

                if (serial == null) {
                    if (root.hasNonNull("deviceSerial")) serial = root.path("deviceSerial").asText();
                    else if (root.hasNonNull("devSerialNum")) serial = root.path("devSerialNum").asText();
                    else if (root.hasNonNull("devSerial")) serial = root.path("devSerial").asText();
                    else if (root.hasNonNull("devID")) serial = root.path("devID").asText();
                    else if (root.hasNonNull("serialNumber")) serial = root.path("serialNumber").asText();
                }

                JsonNode acs = root.path("AccessControllerEvent");
                if (acs.isMissingNode() || acs.isNull()) {
                    acs = root;
                }

                if (serial == null && acs.hasNonNull("deviceSerial")) serial = acs.path("deviceSerial").asText();
                if (mac == null && acs.hasNonNull("macAddress")) mac = acs.path("macAddress").asText();

                if (acs.hasNonNull("employeeNoString")) {
                    employeeNo = acs.path("employeeNoString").asText();
                } else if (acs.hasNonNull("employeeNo")) {
                    employeeNo = acs.path("employeeNo").asText();
                } else if (acs.hasNonNull("cardNo")) {
                    employeeNo = acs.path("cardNo").asText();
                }

                major = acs.path("majorEventType").asInt(root.path("major").asInt(0));
                minor = acs.path("subEventType").asInt(root.path("minor").asInt(0));
                serialNo = acs.path("serialNo").asLong(root.path("serialNo").asLong(0));
                timeStr = acs.hasNonNull("time") ? acs.path("time").asText() : root.path("dateTime").asText(null);

            } catch (Exception e) {
                log.warn("Webhook JSON parse xatosi: {}", e.getMessage());
            }
        }

        log.info("Webhook parse natijasi: mac={}, serial={}, empNo={}, major={}, minor={}, time={}",
                mac, serial, employeeNo, major, minor, timeStr);

        Optional<FaceTerminal> termOpt = resolveTerminal(targetTerminalId, serial, mac, ip);
        if (termOpt.isEmpty()) {
            log.warn("Webhook keldi, lekin mos keluvchi Face ID terminal topilmadi (targetTerm={}, serial={}, mac={}, ip={})",
                    targetTerminalId, serial, mac, ip);
            return ResponseEntity.ok(Map.of("statusCode", 1, "statusString", "OK"));
        }

        FaceTerminal terminal = termOpt.get();
        terminalRepo.touchOnline(terminal.getId(), FaceTerminal.TerminalStatus.ONLINE, LocalDateTime.now());

        // Agar serial yoki mac bo'sh bo'lsa - avtomatik saqlaymiz
        boolean changed = false;
        if ((terminal.getSerialNumber() == null || terminal.getSerialNumber().isBlank()) && serial != null && !serial.isBlank()) {
            terminal.setSerialNumber(serial.trim());
            changed = true;
        }
        if ((terminal.getMacAddress() == null || terminal.getMacAddress().isBlank()) && mac != null && !mac.isBlank()) {
            terminal.setMacAddress(mac.trim());
            changed = true;
        }
        if (changed) {
            try {
                terminalRepo.save(terminal);
            } catch (Exception e) {
                log.warn("Terminal ma'lumotlarini yangilashda xato: {}", e.getMessage());
            }
        }

        // Heartbeat yoki o'tish bo'lmagan signal
        boolean hasEmployee = employeeNo != null && !employeeNo.isBlank() && !"unknown".equalsIgnoreCase(employeeNo.trim());
        if (!hasEmployee || (major != 5 && major != 0)) {
            log.info("Terminal {} yuz aniqlanmadi yoki boshqa signal (major={}, minor={}, eventType={}, empNo={})",
                    terminal.getId(), major, minor, eventType, employeeNo);
            return ResponseEntity.ok(Map.of("statusCode", 1, "statusString", "OK"));
        }

        // Haqiqiy o'tish (kirish/chiqish) hodisasi
        OffsetDateTime eventTime = parseTime(timeStr);
        Long eventSerial = serialNo > 0 ? serialNo : null;
        byte[] finalPic = pictureBytes;

        try {
            FaceAttendanceIngestService.Result res = ingest.recordFaceEvent(
                    terminal,
                    employeeNo.trim(),
                    eventTime,
                    eventSerial,
                    () -> finalPic
            );
            log.info("Face ID hodisasi yozildi: terminal={}, o'quvchi={}, natija={}",
                    terminal.getName(), employeeNo, res);
        } catch (Exception e) {
            log.error("Face ID voqeasini ingest qilishda xato: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(Map.of("statusCode", 1, "statusString", "OK"));
    }

    private Optional<FaceTerminal> resolveTerminal(Long targetTerminalId, String serial, String mac, String ip) {
        // 1. URL dagi terminalId
        if (targetTerminalId != null && targetTerminalId > 0) {
            Optional<FaceTerminal> byId = terminalRepo.findById(targetTerminalId);
            if (byId.isPresent()) return byId;
        }

        // 2. Serial raqam
        if (serial != null && !serial.isBlank()) {
            Optional<FaceTerminal> bySerial = terminalRepo.findBySerialNumber(serial.trim());
            if (bySerial.isPresent()) return bySerial;
        }

        // 3. MAC manzil
        if (mac != null && !mac.isBlank()) {
            Optional<FaceTerminal> byMac = terminalRepo.findByMacAddress(mac.trim());
            if (byMac.isPresent()) return byMac;
            // Shuningdek formatini tozalab tekshirish
            String cleanMac = mac.replaceAll("[^a-zA-Z0-9]", "");
            for (FaceTerminal t : terminalRepo.findAll()) {
                if (t.getMacAddress() != null && t.getMacAddress().replaceAll("[^a-zA-Z0-9]", "").equalsIgnoreCase(cleanMac)) {
                    return Optional.of(t);
                }
            }
        }

        // 4. IP manzil
        if (ip != null && !ip.isBlank()) {
            Optional<FaceTerminal> byIp = terminalRepo.findByIpAddress(ip.trim());
            if (byIp.isPresent()) return byIp;
        }

        // 5. Faqat bitta faol terminal bo'lsa
        return terminalRepo.findAll().stream()
                .filter(t -> t.getStatus() == FaceTerminal.TerminalStatus.ONLINE)
                .findFirst();
    }

    private String extractXmlTag(String xml, String tag) {
        Pattern p = Pattern.compile("<" + tag + "[^>]*>(.*?)</" + tag + ">", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(xml);
        if (m.find()) {
            return m.group(1).trim();
        }
        return null;
    }

    private int parseNum(String s) {
        if (s == null) return 0;
        try {
            return Integer.parseInt(s.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private long parseLong(String s) {
        if (s == null) return 0;
        try {
            return Long.parseLong(s.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private OffsetDateTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return OffsetDateTime.now();
        }
        try {
            return OffsetDateTime.parse(timeStr);
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(timeStr).atOffset(OffsetDateTime.now().getOffset());
            } catch (Exception e) {
                return OffsetDateTime.now();
            }
        }
    }
}
