package com.maktab.controller;

import com.maktab.model.Camera;
import com.maktab.model.CameraEvent;
import com.maktab.model.Room;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.CameraEventRepository;
import com.maktab.repository.CameraRepository;
import com.maktab.repository.RoomRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Video-kuzatuv kameralari — Face-ID (MikrotikRouter/FaceTerminal) subsistemasidan
 * BUTUNLAY ALOHIDA, yangi kontseptsiya. Haqiqiy video stream YO'Q — bu kamera
 * metama'lumotlarini CRUD qilish va hodisalarni qayd etish tizimi.
 *
 * Scoping DeviceController/SchoolController'dagi post-security-fix uslubga mos:
 * ko'rish ko'lami har doim Authorization headerdagi haqiqiy foydalanuvchidan
 * (CurrentUserService) olinadi, client yuborgan schoolId/status esa faqat
 * allaqachon ruxsatli chaqiruvchi uchun IXTIYORIY tor filtr.
 */
@RestController
@RequestMapping("/api/cameras")
public class CameraController {

    @Autowired private CameraRepository cameraRepo;
    @Autowired private CameraEventRepository eventRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private RoomRepository roomRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;
    @Autowired private com.maktab.faceterminal.TerminalEndpointResolver resolver;
    @Autowired private com.maktab.devices.CameraMonitor cameraMonitor;

    @ExceptionHandler(com.maktab.faceterminal.TerminalException.class)
    public ResponseEntity<?> onDeviceError(com.maktab.faceterminal.TerminalException e) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
    }

    @GetMapping
    public List<Map<String, Object>> getAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) String status) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user); // null => SUPERADMIN/ADMIN, cheklovsiz

        List<Camera> cameras;
        if (schoolId != null) {
            currentUserService.assertCanAccessSchool(user, schoolId);
            cameras = cameraRepo.findBySchoolId(schoolId);
        } else if (scope == null) {
            cameras = cameraRepo.findAll();
        } else if (scope.isEmpty()) {
            cameras = Collections.emptyList();
        } else {
            cameras = cameraRepo.findBySchoolIdIn(scope);
        }

        if (status != null && !status.isBlank()) {
            Camera.CameraStatus st = parseStatus(status);
            if (st != null) {
                cameras = cameras.stream().filter(c -> c.getStatus() == st).collect(Collectors.toList());
            }
        }

        return cameras.stream().map(this::toCameraMap).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Camera camera = cameraRepo.findById(id).orElse(null);
        if (camera == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, camera.getSchool().getId());
        return ResponseEntity.ok(toCameraMap(camera));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);

        String name = body.get("name") != null ? body.get("name").toString().trim() : null;
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera.name_required")));
        }
        if (body.get("schoolId") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.selection_required")));
        }
        Long schoolId;
        try {
            schoolId = Long.valueOf(body.get("schoolId").toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.invalid_id")));
        }
        // Kamera — device-ga o'xshash maktabga biriktirilgan resurs: yozish uchun
        // shu maktabni ko'ra olishning o'zi yetarli (DeviceController'dagi uslub).
        currentUserService.assertCanWriteSchoolData(caller, schoolId);

        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));

        Camera c = new Camera();
        c.setName(name);
        c.setSchool(school);
        c.setLocation((String) body.get("location"));
        c.setIpAddress((String) body.get("ipAddress"));
        c.setResolution((String) body.get("resolution"));
        c.setNotes((String) body.get("notes"));
        if (body.get("status") != null) {
            Camera.CameraStatus st = parseStatus(body.get("status").toString());
            if (st != null) c.setStatus(st);
        }
        if (body.containsKey("roomId")) {
            Object roomIdErr = applyRoom(c, body.get("roomId"), schoolId);
            if (roomIdErr != null) return ResponseEntity.badRequest().body(roomIdErr);
        }
        Object deviceErr = applyDeviceFields(c, body);
        if (deviceErr != null) return ResponseEntity.badRequest().body(deviceErr);
        cameraRepo.save(c);
        return ResponseEntity.ok(toCameraMap(c));
    }

    /**
     * Masofadan boshqarish maydonlari (ixtiyoriy). Parol bo'sh yuborilsa eskisi saqlanadi —
     * panel parolni hech qachon qaytarib olmaydi (faqat hasDevicePassword).
     */
    private Object applyDeviceFields(Camera c, Map<String, Object> body) {
        if (body.containsKey("brand")) c.setBrand(blankToNull(body.get("brand")));
        if (body.containsKey("model")) c.setModel(blankToNull(body.get("model")));
        if (body.containsKey("serialNumber")) c.setSerialNumber(blankToNull(body.get("serialNumber")));
        if (body.containsKey("useHttps")) c.setUseHttps(body.get("useHttps") != null && Boolean.parseBoolean(body.get("useHttps").toString()));
        if (body.containsKey("deviceUsername")) c.setDeviceUsername(blankToNull(body.get("deviceUsername")));
        if (body.get("devicePassword") != null && !body.get("devicePassword").toString().isBlank()) {
            c.setDevicePassword(body.get("devicePassword").toString());
        }
        for (String key : new String[]{"port", "rtspPort"}) {
            if (!body.containsKey(key)) continue;
            Object v = body.get(key);
            Integer port = null;
            if (v != null && !v.toString().isBlank()) {
                try {
                    port = Integer.valueOf(v.toString().trim());
                } catch (NumberFormatException e) {
                    return Map.of("error", i18n.msg("error.camera.invalid_port"));
                }
                if (port < 1 || port > 65535) return Map.of("error", i18n.msg("error.camera.invalid_port"));
            }
            if ("port".equals(key)) c.setPort(port); else c.setRtspPort(port);
        }
        if (body.containsKey("streamChannel")) {
            String ch = blankToNull(body.get("streamChannel"));
            if (ch != null && !ch.matches("\\d{1,5}")) return Map.of("error", i18n.msg("error.camera.invalid_channel"));
            c.setStreamChannel(ch);
        }
        if (body.containsKey("supportsFaceRecognition")) {
            c.setSupportsFaceRecognition(body.get("supportsFaceRecognition") != null
                && Boolean.parseBoolean(body.get("supportsFaceRecognition").toString()));
        }
        return null;
    }

    private static String blankToNull(Object v) {
        return v == null || v.toString().isBlank() ? null : v.toString().trim();
    }

    // ── Masofadan boshqarish (VPN orqali) ──

    /** Joriy kadr — boshqariladigan (brend+login kiritilgan) Hikvision kamera uchun. */
    @GetMapping(value = "/{id}/snapshot")
    public ResponseEntity<?> snapshot(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Camera c = cameraRepo.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, c.getSchool().getId());
        if (!com.maktab.faceterminal.TerminalEndpointResolver.isManaged(c)) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera.not_managed")));
        }
        byte[] jpeg = resolver.hikvision(c).snapshot(c.getStreamChannel());
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
            .header("Cache-Control", "no-store")
            .body(jpeg);
    }

    /** Holatni hozir tekshiradi (model/serial/firmware yangilanadi). */
    @PostMapping("/{id}/check")
    public ResponseEntity<?> check(@PathVariable Long id,
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Camera c = cameraRepo.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, c.getSchool().getId());
        if (!com.maktab.faceterminal.TerminalEndpointResolver.isManaged(c)) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera.not_managed")));
        }
        var info = cameraMonitor.refresh(c);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("online", true);
        m.put("deviceType", info.deviceType());
        m.put("model", info.model());
        m.put("serialNumber", info.serialNumber());
        m.put("firmwareVersion", info.firmwareVersion());
        m.put("reachableAt", resolver.baseUrl(c));
        return ResponseEntity.ok(m);
    }

    /**
     * Video oqim manzili (parolsiz). Brauzer RTSP'ni to'g'ridan-to'g'ri o'ynata olmaydi — jonli video
     * uchun media-gateway (masalan go2rtc) kerak; bu endpoint VLC/NVR dasturlari uchun ma'lumot beradi.
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<?> stream(@PathVariable Long id,
                                    @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Camera c = cameraRepo.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, c.getSchool().getId());
        if (!com.maktab.faceterminal.TerminalEndpointResolver.isManaged(c)) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera.not_managed")));
        }
        String base = resolver.baseUrl(c); // http://10.30.N.x:port
        String host = base.substring("http://".length(), base.lastIndexOf(':'));
        int rtspPort = c.getRtspPort() != null ? c.getRtspPort() : 554;
        String channel = c.getStreamChannel() != null ? c.getStreamChannel() : "101";
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("rtspUrl", "rtsp://" + host + ":" + rtspPort + "/Streaming/Channels/" + channel);
        m.put("lanRtspUrl", "rtsp://" + c.getIpAddress() + ":" + rtspPort + "/Streaming/Channels/" + channel);
        m.put("channel", channel);
        m.put("authRequired", true);
        return ResponseEntity.ok(m);
    }

    /** roomId'ni kameraga biriktiradi — xona berilgan maktabga tegishli ekanligini tekshiradi. Xato bo'lsa error map qaytaradi, aks holda null. */
    private Object applyRoom(Camera c, Object roomIdVal, Long schoolId) {
        if (roomIdVal == null || roomIdVal.toString().isBlank()) {
            c.setRoom(null);
            return null;
        }
        Long roomId;
        try {
            roomId = Long.valueOf(roomIdVal.toString());
        } catch (NumberFormatException e) {
            return Map.of("error", i18n.msg("error.room.invalid_id"));
        }
        Room room = roomRepo.findById(roomId).orElse(null);
        if (room == null || room.getSchool() == null || !room.getSchool().getId().equals(schoolId)) {
            return Map.of("error", i18n.msg("error.room.not_found"));
        }
        c.setRoom(room);
        return null;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Camera c = cameraRepo.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, c.getSchool().getId());
        if (body.containsKey("name") && body.get("name") != null) c.setName(body.get("name").toString());
        if (body.containsKey("location")) c.setLocation((String) body.get("location"));
        if (body.containsKey("ipAddress")) c.setIpAddress((String) body.get("ipAddress"));
        if (body.containsKey("resolution")) c.setResolution((String) body.get("resolution"));
        if (body.containsKey("notes")) c.setNotes((String) body.get("notes"));
        if (body.containsKey("status") && body.get("status") != null) {
            Camera.CameraStatus st = parseStatus(body.get("status").toString());
            if (st != null) c.setStatus(st);
        }
        if (body.containsKey("schoolId") && body.get("schoolId") != null) {
            Long newSchoolId = Long.valueOf(body.get("schoolId").toString());
            currentUserService.assertCanWriteSchoolData(caller, newSchoolId);
            School s = schoolRepo.findById(newSchoolId).orElse(null);
            if (s != null) c.setSchool(s);
        }
        if (body.containsKey("roomId")) {
            Object roomIdErr = applyRoom(c, body.get("roomId"), c.getSchool().getId());
            if (roomIdErr != null) return ResponseEntity.badRequest().body(roomIdErr);
        }
        Object deviceErr = applyDeviceFields(c, body);
        if (deviceErr != null) return ResponseEntity.badRequest().body(deviceErr);
        cameraRepo.save(c);
        return ResponseEntity.ok(toCameraMap(c));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Camera camera = cameraRepo.findById(id).orElse(null);
        if (camera == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, camera.getSchool().getId());

        eventRepo.deleteAll(eventRepo.findByCameraIdOrderByOccurredAtDesc(id));
        cameraRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── Kamera hodisalari (o'sha kameraga tegishli qism) ──

    @GetMapping("/{id}/events")
    public ResponseEntity<?> getCameraEvents(@PathVariable Long id,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Camera camera = cameraRepo.findById(id).orElse(null);
        if (camera == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, camera.getSchool().getId());

        List<CameraEvent> events = eventRepo.findByCameraIdOrderByOccurredAtDesc(id);
        return ResponseEntity.ok(events.stream().map(this::toEventMap).collect(Collectors.toList()));
    }

    /** Yangi hodisa qayd etish — hozircha qo'lda, lekin kelajakdagi AI pipeline uchun
     * ham aynan shu kontrakt (type/severity/description/occurredAt) ishlatiladi. */
    @PostMapping("/{id}/events")
    public ResponseEntity<?> addEvent(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader,
                                       @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Camera camera = cameraRepo.findById(id).orElse(null);
        if (camera == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, camera.getSchool().getId());

        if (body.get("type") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera_event.type_required")));
        }
        CameraEvent.CameraEventType type;
        try {
            type = CameraEvent.CameraEventType.valueOf(body.get("type").toString().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera_event.invalid_type")));
        }

        CameraEvent.EventSeverity severity = CameraEvent.EventSeverity.LOW;
        if (body.get("severity") != null) {
            try {
                severity = CameraEvent.EventSeverity.valueOf(body.get("severity").toString().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.camera_event.invalid_severity")));
            }
        }

        OffsetDateTime occurredAt = OffsetDateTime.now();
        if (body.get("occurredAt") != null) {
            try {
                occurredAt = OffsetDateTime.parse(body.get("occurredAt").toString());
            } catch (Exception ignored) {
                // noto'g'ri format bo'lsa — hozirgi vaqt bilan davom etamiz
            }
        }

        CameraEvent ev = new CameraEvent();
        ev.setCamera(camera);
        ev.setSchool(camera.getSchool());
        ev.setType(type);
        ev.setSeverity(severity);
        ev.setDescription((String) body.get("description"));
        ev.setOccurredAt(occurredAt);
        ev.setReportedBy(caller);
        ev.setResolved(false);
        eventRepo.save(ev);
        return ResponseEntity.ok(toEventMap(ev));
    }

    // ── Mapperlar ──

    private Camera.CameraStatus parseStatus(String raw) {
        try {
            return Camera.CameraStatus.valueOf(raw.toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> toCameraMap(Camera c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        if (c.getSchool() != null) {
            m.put("schoolId", c.getSchool().getId());
            m.put("schoolName", c.getSchool().getName());
        }
        m.put("location", c.getLocation());
        if (c.getRoom() != null) {
            m.put("roomId", c.getRoom().getId());
            m.put("roomNumber", c.getRoom().getNumber());
            m.put("roomName", c.getRoom().getName());
        } else {
            m.put("roomId", null);
            m.put("roomNumber", null);
            m.put("roomName", null);
        }
        m.put("ipAddress", c.getIpAddress());
        m.put("resolution", c.getResolution());
        m.put("status", c.getStatus() != null ? c.getStatus().name() : null);
        m.put("notes", c.getNotes());
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        m.put("eventCount", eventRepo.countByCameraId(c.getId()));
        m.put("brand", c.getBrand());
        m.put("model", c.getModel());
        m.put("serialNumber", c.getSerialNumber());
        m.put("firmwareVersion", c.getFirmwareVersion());
        m.put("port", c.getPort());
        m.put("useHttps", Boolean.TRUE.equals(c.getUseHttps()));
        m.put("rtspPort", c.getRtspPort());
        m.put("streamChannel", c.getStreamChannel());
        m.put("supportsFaceRecognition", Boolean.TRUE.equals(c.getSupportsFaceRecognition()));
        m.put("deviceUsername", c.getDeviceUsername());
        m.put("hasDevicePassword", c.getDevicePassword() != null && !c.getDevicePassword().isBlank());
        m.put("managed", com.maktab.faceterminal.TerminalEndpointResolver.isManaged(c));
        m.put("lastSeen", c.getLastSeen() != null ? c.getLastSeen().toString() : null);
        m.put("lastError", c.getLastError());
        return m;
    }

    private Map<String, Object> toEventMap(CameraEvent e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("cameraId", e.getCamera() != null ? e.getCamera().getId() : null);
        m.put("cameraName", e.getCamera() != null ? e.getCamera().getName() : null);
        m.put("schoolId", e.getSchool() != null ? e.getSchool().getId() : null);
        m.put("schoolName", e.getSchool() != null ? e.getSchool().getName() : null);
        m.put("type", e.getType() != null ? e.getType().name() : null);
        m.put("severity", e.getSeverity() != null ? e.getSeverity().name() : null);
        m.put("description", e.getDescription());
        m.put("occurredAt", e.getOccurredAt() != null ? e.getOccurredAt().toString() : null);
        m.put("reportedById", e.getReportedBy() != null ? e.getReportedBy().getId() : null);
        m.put("reportedByName", e.getReportedBy() != null ? e.getReportedBy().getFullName() : null);
        m.put("resolved", e.getResolved());
        m.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        return m;
    }
}
