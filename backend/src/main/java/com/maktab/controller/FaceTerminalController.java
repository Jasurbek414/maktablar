package com.maktab.controller;

import com.maktab.faceterminal.*;
import com.maktab.model.FaceTerminal;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UnmatchedFaceEventRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Face ID terminalini masofadan to'liq boshqarish — backend terminalga VPN orqali murojaat qiladi.
 *
 * Ruxsatlar (CurrentUserService bilan bir xil qoida):
 *  - ko'rish (holat, qurilmadagi foydalanuvchilar, sinxronizatsiya holati): maktabga kirish huquqi;
 *  - o'zgartirish (eshik, reboot, vaqt, yuz yuklash/o'chirish, qayta tiklash): maktab ma'lumotiga
 *    yozish huquqi (SUPERADMIN/ADMIN, hudud direktorlari o'z ko'lamida, DIRECTOR/MUDIR o'z maktabida).
 *
 * Terminal bilan aloqa xatosi 502 bilan, foydalanuvchiga tushunarli xabar bilan qaytadi.
 */
@RestController
@RequestMapping("/api/terminals")
public class FaceTerminalController {

    private static final Logger log = LoggerFactory.getLogger(FaceTerminalController.class);
    private static final Set<String> DOOR_COMMANDS = Set.of("open", "close", "alwaysOpen", "alwaysClose");
    private static final Duration MAX_BACKFILL = Duration.ofDays(7);
    private static final Duration TIME_DRIFT_TOLERANCE = Duration.ofSeconds(30);

    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;
    @Autowired private TerminalEndpointResolver resolver;
    @Autowired private FaceTerminalMonitor monitor;
    @Autowired private FaceSyncService syncService;
    @Autowired private HikvisionFaceTerminalDriver hikvisionDriver;
    @Autowired private UnmatchedFaceEventRepository unmatchedRepo;
    @Autowired private com.maktab.repository.AttendanceRepository attendanceRepo;
    @Autowired private com.maktab.repository.SchoolClassRepository classRepo;
    @Autowired private TerminalLiveView liveView;

    @ExceptionHandler(TerminalException.class)
    public ResponseEntity<?> onTerminalError(TerminalException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
    }

    /** Maktabdagi terminallar ro'yxati (masalan o'quvchilarni sinxron qilish oynasi uchun) */
    @GetMapping
    public ResponseEntity<?> listTerminals(@RequestParam(required = false) Long schoolId,
                                           @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        Long targetSchoolId = schoolId != null ? schoolId : user.getSchoolId();
        if (targetSchoolId == null) {
            return ResponseEntity.ok(List.of());
        }
        currentUserService.assertCanAccessSchool(user, targetSchoolId);
        List<FaceTerminal> list = terminalRepo.findBySchoolId(targetSchoolId);
        List<Map<String, Object>> result = list.stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("ipAddress", t.getIpAddress());
            m.put("brand", t.getBrand());
            m.put("status", t.getStatus() != null ? t.getStatus().name() : "OFFLINE");
            m.put("direction", t.getDirection() != null ? t.getDirection().name() : null);
            m.put("userCount", t.getUserCount());
            m.put("registeredFaces", t.getRegisteredFaces());
            m.put("schoolId", t.getSchoolId());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Butun sinf yoki tanlangan o'quvchilarning yuzini maktabning barcha (yoki tanlangan) terminallariga ommaviy yuklash
     */
    @PostMapping("/sync-all")
    public ResponseEntity<?> syncAllTerminals(@RequestHeader(value = "Authorization", required = false) String auth,
                                             @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        Long schoolId = body.get("schoolId") != null ? Long.valueOf(body.get("schoolId").toString()) : user.getSchoolId();
        if (schoolId == null) return ResponseEntity.badRequest().body(Map.of("error", "Maktab aniqlanmadi"));
        currentUserService.assertCanWriteSchoolData(user, schoolId);

        List<FaceTerminal> terminals;
        Object singleTermId = body.get("terminalId");
        if (singleTermId != null && !singleTermId.toString().isBlank() && !singleTermId.toString().equals("all")) {
            Long tid = Long.valueOf(singleTermId.toString());
            FaceTerminal t = terminalRepo.findById(tid).orElse(null);
            if (t == null || !schoolId.equals(t.getSchoolId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tanlangan terminal topilmadi"));
            }
            terminals = List.of(t);
        } else {
            terminals = terminalRepo.findBySchoolId(schoolId);
        }

        if (terminals.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.student.no_terminals")));
        }

        List<Student> students;
        Object ids = body.get("studentIds");
        Object classIdObj = body.get("classId");
        if (ids instanceof List<?> list && !list.isEmpty()) {
            Set<Long> wanted = list.stream().map(o -> Long.valueOf(o.toString())).collect(Collectors.toSet());
            students = studentRepo.findBySchoolId(schoolId).stream()
                .filter(s -> wanted.contains(s.getId()))
                .filter(s -> s.getFaceId() != null && !s.getFaceId().isBlank()
                    && s.getPhotoUrl() != null && !s.getPhotoUrl().isBlank())
                .collect(Collectors.toList());
        } else if (classIdObj != null) {
            Long cId = Long.valueOf(classIdObj.toString());
            students = studentRepo.findBySchoolId(schoolId).stream()
                .filter(s -> cId.equals(s.getClassId()))
                .filter(s -> s.getFaceId() != null && !s.getFaceId().isBlank()
                    && s.getPhotoUrl() != null && !s.getPhotoUrl().isBlank())
                .collect(Collectors.toList());
        } else {
            students = studentRepo.findBySchoolId(schoolId).stream()
                .filter(s -> s.getFaceId() != null && !s.getFaceId().isBlank()
                    && s.getPhotoUrl() != null && !s.getPhotoUrl().isBlank())
                .collect(Collectors.toList());
        }

        if (students.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rasmi va Face ID si bor o'quvchilar topilmadi (avval rasmlarni yuklang)"));
        }

        List<Map<String, Object>> startedJobs = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (FaceTerminal t : terminals) {
            Optional<FaceSyncService.Job> job = syncService.start(t, students);
            if (job.isPresent()) {
                Map<String, Object> jm = job.get().toMap();
                jm.put("terminalName", t.getName());
                jm.put("terminalIp", t.getIpAddress());
                startedJobs.add(jm);
            } else {
                skipped.add(t.getName() + " (band yoki sinxronizatsiya ketmoqda)");
            }
        }

        return ResponseEntity.ok(Map.of(
            "totalStudents", students.size(),
            "terminalsCount", terminals.size(),
            "jobs", startedJobs,
            "skipped", skipped
        ));
    }

    // ─── Holat ───────────────────────────────────────────────────────────────────

    /** Jonli holat: qurilmaga hozir so'rov yuboriladi va DB'dagi holat yangilanadi. */
    @GetMapping("/{id}/status")
    public ResponseEntity<?> status(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth) {
        FaceTerminal t = loadForRead(id, auth);
        requireHikvision(t);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("terminalId", t.getId());
        m.put("reachableAt", resolver.baseUrl(t));
        HikvisionIsapiClient.DeviceInfo info = monitor.refreshStatus(t);
        HikvisionIsapiClient client = resolver.hikvision(t);
        HikvisionIsapiClient.UserCounts counts = client.userCounts();
        HikvisionIsapiClient.DeviceTime time = client.deviceTime();
        m.put("online", true);
        m.put("model", info.model());
        m.put("serialNumber", info.serialNumber());
        m.put("firmwareVersion", info.firmwareVersion());
        m.put("macAddress", info.macAddress());
        m.put("users", counts.users());
        m.put("usersWithFace", counts.usersWithFace());
        m.put("deviceTime", time.localTime() != null ? time.localTime().toString() : null);
        m.put("timeMode", time.timeMode());
        m.put("timeDriftSeconds", time.localTime() != null
            ? Duration.between(OffsetDateTime.now(), time.localTime()).getSeconds() : null);
        m.put("lastEventSerial", terminalRepo.findById(id).map(FaceTerminal::getLastEventSerial).orElse(null));
        m.put("lastEventAt", t.getLastEventAt() != null ? t.getLastEventAt().toString() : null);
        return ResponseEntity.ok(m);
    }

    /**
     * Terminal "tanidi" deb voqea yuborgan, lekin platforma joriy o'quvchiga moslay
     * olmagan so'nggi hodisalar (FaceAttendanceIngestService#saveUnmatched) — avval
     * faqat server log'ida ko'rinardi, endi shu yerda operatorga ko'rsatiladi
     * (2026-09-16 so'ralgan).
     */
    @GetMapping("/{id}/unmatched-events")
    public ResponseEntity<?> unmatchedEvents(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth) {
        loadForRead(id, auth);
        List<Map<String, Object>> events = unmatchedRepo.findTop50ByTerminalIdOrderByTimestampDesc(id).stream()
            .map(u -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", u.getId());
                m.put("employeeNo", u.getEmployeeNo());
                m.put("timestamp", u.getTimestamp().toString());
                m.put("reason", u.getReason().name());
                return m;
            }).collect(Collectors.toList());
        return ResponseEntity.ok(events);
    }

    // ─── Boshqaruv ───────────────────────────────────────────────────────────────

    @PostMapping("/{id}/door")
    public ResponseEntity<?> door(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth,
                                  @RequestBody(required = false) Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        String cmd = body != null && body.get("cmd") != null ? body.get("cmd").toString() : "open";
        if (!DOOR_COMMANDS.contains(cmd)) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.terminal.invalid_command")));
        }
        resolver.hikvision(t).door(1, cmd);
        log.info("AUDIT eshik: terminal={} cmd={} user={} ({})", t.getId(), cmd, user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of("status", "ok", "cmd", cmd));
    }

    @PostMapping("/{id}/reboot")
    public ResponseEntity<?> reboot(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        resolver.hikvision(t).reboot();
        log.info("AUDIT reboot: terminal={} user={} ({})", t.getId(), user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    /**
     * Qurilma vaqtini server vaqtiga moslaydi. Farq 30 soniyadan kichik bo'lsa hech narsa qilinmaydi
     * (qurilma NTP'da to'g'ri ishlayotgan bo'lsa uni qo'lda rejimga o'tkazib buzmaslik uchun).
     */
    @PostMapping("/{id}/sync-time")
    public ResponseEntity<?> syncTime(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth,
                                      @RequestParam(defaultValue = "false") boolean force) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        HikvisionIsapiClient client = resolver.hikvision(t);
        OffsetDateTime now = OffsetDateTime.now();
        HikvisionIsapiClient.DeviceTime before = client.deviceTime();
        long drift = before.localTime() != null ? Duration.between(now, before.localTime()).getSeconds() : Long.MAX_VALUE;
        if (!force && Math.abs(drift) <= TIME_DRIFT_TOLERANCE.getSeconds()) {
            return ResponseEntity.ok(Map.of("status", "unchanged", "driftSeconds", drift, "timeMode", String.valueOf(before.timeMode())));
        }
        client.setTime(now);
        log.info("AUDIT vaqt: terminal={} drift={}s user={}", t.getId(), drift, user.getId());
        return ResponseEntity.ok(Map.of("status", "updated", "driftSeconds", drift));
    }

    // ─── Qurilmadagi foydalanuvchilar ────────────────────────────────────────────

    /** Qurilmadagi foydalanuvchilar — har biri platformadagi o'quvchi bilan solishtiriladi. */
    @GetMapping("/{id}/users")
    public ResponseEntity<?> users(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth,
                                   @RequestParam(defaultValue = "0") int offset, @RequestParam(defaultValue = "30") int limit) {
        FaceTerminal t = loadForRead(id, auth);
        requireHikvision(t);
        HikvisionIsapiClient.UserPage page = resolver.hikvision(t).searchUsers(offset, limit);

        Map<String, Student> byEmployeeNo = schoolStudentsByEmployeeNo(t);
        List<Map<String, Object>> rows = page.users().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("employeeNo", u.employeeNo());
            m.put("deviceName", u.name());
            m.put("faces", u.faces());
            Student s = byEmployeeNo.get(u.employeeNo());
            m.put("studentId", s != null ? s.getId() : null);
            m.put("studentName", s != null ? s.getFullName() : null);
            m.put("photoUrl", s != null ? s.getPhotoUrl() : null);
            m.put("classId", s != null ? s.getClassId() : null);
            m.put("matched", s != null);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("total", page.total(), "offset", offset, "users", rows));
    }

    /** Qurilmadan foydalanuvchini (masalan platformada yo'q "begona" yozuvni) o'chiradi. */
    @DeleteMapping("/{id}/users/{employeeNo}")
    public ResponseEntity<?> deleteDeviceUser(@PathVariable Long id, @PathVariable String employeeNo,
                                              @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        if (!employeeNo.matches("[A-Za-z0-9]{1," + FaceIdMapping.MAX_LENGTH + "}")) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.request.invalid_data")));
        }
        resolver.hikvision(t).deleteUser(employeeNo);
        log.info("AUDIT qurilma foydalanuvchisi o'chirildi: terminal={} employeeNo={} user={}", t.getId(), employeeNo, user.getId());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // ─── Yuzlar ──────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/students/{studentId}/face")
    public ResponseEntity<?> pushStudentFace(@PathVariable Long id, @PathVariable Long studentId,
                                             @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        Student s = loadSchoolStudent(t, studentId);
        syncService.pushOne(t, s);
        s.setSyncStatus("SYNCED");
        s.setSyncError(null);
        s.setSyncedAt(java.time.OffsetDateTime.now());
        studentRepo.save(s);
        return ResponseEntity.ok(Map.of("status", "ok", "employeeNo", FaceIdMapping.toEmployeeNo(s.getFaceId())));
    }

    @DeleteMapping("/{id}/students/{studentId}/face")
    public ResponseEntity<?> removeStudentFace(@PathVariable Long id, @PathVariable Long studentId,
                                               @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        Student s = loadSchoolStudent(t, studentId);
        hikvisionDriver.removeUser(t, s.getFaceId());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    /**
     * Maktab o'quvchilarining yuzini terminalga ommaviy yuklash (fon ishi).
     * body.studentIds berilmasa — maktabdagi rasmi va Face ID'si bor barcha o'quvchilar.
     */
    @PostMapping("/{id}/sync-faces")
    public ResponseEntity<?> syncFaces(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth,
                                       @RequestBody(required = false) Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);

        List<Student> students;
        Object ids = body != null ? body.get("studentIds") : null;
        if (ids instanceof List<?> list && !list.isEmpty()) {
            Set<Long> wanted = list.stream().map(o -> Long.valueOf(o.toString())).collect(Collectors.toSet());
            students = studentRepo.findBySchoolId(t.getSchoolId()).stream()
                .filter(s -> wanted.contains(s.getId())).collect(Collectors.toList());
        } else {
            students = studentRepo.findBySchoolId(t.getSchoolId()).stream()
                .filter(s -> s.getFaceId() != null && !s.getFaceId().isBlank()
                    && s.getPhotoUrl() != null && !s.getPhotoUrl().isBlank())
                .collect(Collectors.toList());
        }

        // Harf-raqamga o'girilganda ikki o'quvchi bir xil employeeNo olsa, qurilmada biri ikkinchisini
        // yozib yuboradi — bunday holatda ish boshlanmaydi.
        Map<String, List<Long>> collisions = students.stream()
            .filter(s -> FaceIdMapping.toEmployeeNo(s.getFaceId()) != null)
            .collect(Collectors.groupingBy(s -> FaceIdMapping.toEmployeeNo(s.getFaceId()),
                Collectors.mapping(Student::getId, Collectors.toList())));
        collisions.values().removeIf(v -> v.size() < 2);
        if (!collisions.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", i18n.msg("error.terminal.face_id_collision"), "collisions", collisions));
        }

        Optional<FaceSyncService.Job> job = syncService.start(t, students);
        if (job.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", i18n.msg("error.terminal.sync_running")));
        }
        log.info("AUDIT yuz sinxronizatsiyasi: terminal={} o'quvchilar={} user={}", t.getId(), students.size(), user.getId());
        return ResponseEntity.accepted().body(job.get().toMap());
    }

    @GetMapping("/{id}/sync-faces/{jobId}")
    public ResponseEntity<?> syncFacesStatus(@PathVariable Long id, @PathVariable String jobId,
                                             @RequestHeader(value = "Authorization", required = false) String auth) {
        loadForRead(id, auth);
        return syncService.get(jobId)
            .filter(j -> id.equals(j.terminalId))
            .<ResponseEntity<?>>map(j -> ResponseEntity.ok(j.toMap()))
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── Voqealar ────────────────────────────────────────────────────────────────

    /** Vaqt oralig'idagi voqealarni qurilmadan qayta o'qib davomatga yozadi (ko'pi bilan 7 kun). */
    @PostMapping("/{id}/events/backfill")
    public ResponseEntity<?> backfill(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth,
                                      @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = loadForWrite(id, user);
        requireHikvision(t);
        OffsetDateTime from, to;
        try {
            // Brauzer odatda UTC ("...Z") yuboradi; qurilma o'z vaqtini mahalliy offset bilan yuritadi
            // (masalan +05:00) — shuning uchun server vaqt mintaqasiga o'girilib yuboriladi.
            java.time.ZoneId zone = java.time.ZoneId.systemDefault();
            from = OffsetDateTime.parse(body.get("from").toString()).atZoneSameInstant(zone).toOffsetDateTime();
            to = OffsetDateTime.parse(body.get("to").toString()).atZoneSameInstant(zone).toOffsetDateTime();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.request.invalid_data")));
        }
        if (!to.isAfter(from) || Duration.between(from, to).compareTo(MAX_BACKFILL) > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.terminal.invalid_range")));
        }
        FaceTerminalMonitor.PollResult r = monitor.backfill(t, from, to);
        log.info("AUDIT backfill: terminal={} {}..{} o'qildi={} yozildi={} user={}", t.getId(), from, to, r.read(), r.recorded(), user.getId());
        return ResponseEntity.ok(Map.of("read", r.read(), "recorded", r.recorded()));
    }

    // ─── Jonli kuzatuv ───────────────────────────────────────────────────────────

    static final Set<User.Role> LIVE_VIEW_ROLES = Set.of(User.Role.SUPERADMIN, User.Role.ADMIN, User.Role.DIRECTOR);

    @GetMapping("/{id}/live-frame")
    public ResponseEntity<?> liveFrame(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String auth) {
        User user = currentUserService.requireUser(auth);
        if (!LIVE_VIEW_ROLES.contains(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.terminal.live_view_forbidden"));
        }
        FaceTerminal t = load(id);
        currentUserService.assertCanAccessSchool(user, schoolIdOf(t));
        requireHikvision(t);
        liveView.audit(t, user.getId(), user.getUsername());
        TerminalLiveView.Frame frame = liveView.frame(t);
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
            .header("Cache-Control", "no-store")
            .header("X-Frame-Taken-At", Long.toString(frame.takenAtMillis()))
            .body(frame.jpeg());
    }

    // ─── Aloqani tekshirish (Test Connection) ─────────────────────────────────────

    @PostMapping("/test-connection")
    public ResponseEntity<?> testConnection(@RequestHeader(value = "Authorization", required = false) String auth,
                                            @RequestBody Map<String, Object> body) {
        currentUserService.requireUser(auth);
        String ip = (String) body.get("ipAddress");
        if (ip == null || ip.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", "IP manzil kiritilishi shart"));
        }
        int port = body.get("port") != null && !body.get("port").toString().isBlank()
            ? Integer.parseInt(body.get("port").toString())
            : (Boolean.TRUE.equals(body.get("useHttps")) ? 443 : 80);
        boolean useHttps = Boolean.TRUE.equals(body.get("useHttps"));
        String username = (String) body.get("deviceUsername");
        String password = (String) body.get("devicePassword");

        if ((password == null || password.isBlank()) && body.get("terminalId") != null) {
            try {
                FaceTerminal existing = terminalRepo.findById(Long.valueOf(body.get("terminalId").toString())).orElse(null);
                if (existing != null) {
                    if (username == null || username.isBlank()) username = existing.getDeviceUsername();
                    password = existing.getDevicePassword();
                }
            } catch (Exception ignored) {}
        }

        try {
            String scheme = useHttps ? "https" : "http";
            String baseUrl = scheme + "://" + ip + ":" + port;
            HikvisionIsapiClient client = new HikvisionIsapiClient(baseUrl, username, password);
            HikvisionIsapiClient.DeviceInfo info = client.deviceInfo();
            HikvisionIsapiClient.UserCounts counts = null;
            try { counts = client.userCounts(); } catch (Exception ignored) {}

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("ok", true);
            res.put("model", info.model() != null ? info.model() : "");
            res.put("serialNumber", info.serialNumber() != null ? info.serialNumber() : "");
            res.put("firmwareVersion", info.firmwareVersion() != null ? info.firmwareVersion() : "");
            res.put("macAddress", info.macAddress() != null ? info.macAddress() : "");
            res.put("users", counts != null ? counts.users() : 0);
            res.put("usersWithFace", counts != null ? counts.usersWithFace() : 0);
            res.put("message", "Aloqa muvaffaqiyatli o'rnatildi!");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "ok", false,
                "error", "Aloqa xatosi: " + (e.getMessage() != null ? e.getMessage() : e.toString())
            ));
        }
    }

    // ─── To'g'ridan-to'g'ri terminal qo'shish ──────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createTerminalDirect(@RequestHeader(value = "Authorization", required = false) String auth,
                                                  @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        Long schoolId = body.get("schoolId") != null && !body.get("schoolId").toString().isBlank()
            ? Long.valueOf(body.get("schoolId").toString())
            : user.getSchoolId();
        if (schoolId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maktab aniqlanmadi"));
        }
        currentUserService.assertCanWriteSchoolData(user, schoolId);

        FaceTerminal t = new FaceTerminal();
        if (body.get("routerId") != null && !body.get("routerId").toString().isBlank()) {
            t.setRouterId(Long.valueOf(body.get("routerId").toString()));
        }
        t.setSchoolId(schoolId);
        t.setName((String) body.getOrDefault("name", "Face ID Terminal"));
        t.setSerialNumber((String) body.get("serialNumber"));
        t.setBrand((String) body.getOrDefault("brand", "Hikvision"));
        t.setModel((String) body.getOrDefault("model", ""));
        t.setMacAddress((String) body.get("macAddress"));
        t.setDirection(FaceTerminal.Direction.valueOf(body.getOrDefault("direction", "ENTRANCE").toString()));
        t.setStatus(FaceTerminal.TerminalStatus.OFFLINE);
        t.setIpAddress((String) body.get("ipAddress"));
        if (body.get("port") != null && !body.get("port").toString().isBlank()) {
            t.setPort(Integer.valueOf(body.get("port").toString()));
        }
        t.setUseHttps(body.get("useHttps") != null && Boolean.parseBoolean(body.get("useHttps").toString()));
        t.setDeviceUsername((String) body.get("deviceUsername"));
        t.setDevicePassword((String) body.get("devicePassword"));
        t.setFirmwareVersion((String) body.get("firmwareVersion"));
        t.setNotes((String) body.get("notes"));
        t.setCreatedAt(java.time.LocalDateTime.now());
        t.setRegisteredFaces(0);

        terminalRepo.save(t);
        return ResponseEntity.ok(Map.of(
            "id", t.getId(),
            "name", t.getName(),
            "serialNumber", t.getSerialNumber() != null ? t.getSerialNumber() : "",
            "ipAddress", t.getIpAddress() != null ? t.getIpAddress() : "",
            "status", t.getStatus().name()
        ));
    }

    // ─── Face ID Voqealari (Events) ──────────────────────────────────────────────

    @GetMapping("/{id}/events")
    public ResponseEntity<?> terminalEvents(@PathVariable Long id,
                                            @RequestParam(required = false) String from,
                                            @RequestParam(required = false) String to,
                                            @RequestParam(defaultValue = "150") int limit,
                                            @RequestHeader(value = "Authorization", required = false) String auth) {
        FaceTerminal t = loadForRead(id, auth);
        OffsetDateTime fromDt;
        OffsetDateTime toDt;
        try {
            fromDt = from != null && !from.isBlank() ? parseFilterDateTime(from, true) : OffsetDateTime.now().minusDays(7);
            toDt = to != null && !to.isBlank() ? parseFilterDateTime(to, false) : OffsetDateTime.now().plusDays(1);
        } catch (Exception e) {
            fromDt = OffsetDateTime.now().minusDays(7);
            toDt = OffsetDateTime.now().plusDays(1);
        }

        String serial = t.getSerialNumber();
        String syncPrefix = "hik-" + t.getId() + "-%";
        List<com.maktab.model.Attendance> list = attendanceRepo.findByTerminalEvents(serial != null ? serial : "", syncPrefix, fromDt, toDt);
        if (list.size() > limit) {
            list = list.subList(0, limit);
        }

        Map<Long, String> classNames = new HashMap<>();
        Long schoolId = schoolIdOf(t);
        if (schoolId != null) {
            try {
                for (com.maktab.model.SchoolClass sc : classRepo.findBySchoolId(schoolId)) {
                    classNames.put(sc.getId(), sc.getName());
                }
            } catch (Exception ignored) {}
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (com.maktab.model.Attendance a : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("time", a.getTimestamp() != null ? a.getTimestamp().toString() : null);
            m.put("direction", a.getType() != null ? a.getType().name() : "IN");
            m.put("source", "FACE");
            m.put("terminalId", t.getId());
            m.put("terminalName", t.getName());
            m.put("photoUrl", a.getPhotoPath());
            m.put("hasPhoto", a.getPhotoPath() != null && !a.getPhotoPath().isBlank());

            Student s = a.getStudent();
            if (s != null) {
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("id", s.getId());
                sm.put("code", s.getFaceId());
                sm.put("fullName", s.getFullName());
                sm.put("photoUrl", s.getPhotoUrl());
                if (s.getClassId() != null) {
                    sm.put("className", classNames.getOrDefault(s.getClassId(), null));
                }
                m.put("student", sm);
            }
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    private OffsetDateTime parseFilterDateTime(String text, boolean startOfDay) {
        text = text.trim();
        if (text.length() == 10) {
            java.time.LocalDate ld = java.time.LocalDate.parse(text);
            return startOfDay ? ld.atStartOfDay().atOffset(java.time.ZoneOffset.ofHours(5))
                              : ld.plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.ofHours(5));
        }
        if (text.contains("T") && !text.contains("+") && !text.endsWith("Z")) {
            java.time.LocalDateTime ldt = java.time.LocalDateTime.parse(text);
            return ldt.atOffset(java.time.ZoneOffset.ofHours(5));
        }
        return OffsetDateTime.parse(text);
    }

    // ─── Yordamchilar ────────────────────────────────────────────────────────────

    private FaceTerminal loadForRead(Long id, String auth) {
        User user = currentUserService.requireUser(auth);
        FaceTerminal t = load(id);
        currentUserService.assertCanAccessSchool(user, schoolIdOf(t));
        return t;
    }

    private FaceTerminal loadForWrite(Long id, User user) {
        FaceTerminal t = load(id);
        currentUserService.assertCanWriteSchoolData(user, schoolIdOf(t));
        return t;
    }

    private FaceTerminal load(Long id) {
        return terminalRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, i18n.msg("error.terminal.not_found")));
    }

    private Long schoolIdOf(FaceTerminal t) {
        if (t.getSchoolId() != null) return t.getSchoolId();
        return t.getRouterId() != null
            ? routerRepo.findById(t.getRouterId()).map(r -> r.getSchool().getId()).orElse(null)
            : null;
    }

    private void requireHikvision(FaceTerminal t) {
        if (!TerminalEndpointResolver.isHikvision(t)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, i18n.msg("error.terminal.unsupported_brand"));
        }
    }

    private Student loadSchoolStudent(FaceTerminal t, Long studentId) {
        Student s = studentRepo.findById(studentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, i18n.msg("error.student.not_found")));
        if (s.getSchool() == null || !s.getSchool().getId().equals(schoolIdOf(t))) {
            // Boshqa maktab o'quvchisini bu maktab terminaliga yozish taqiqlanadi
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.student.access_denied"));
        }
        return s;
    }

    private Map<String, Student> schoolStudentsByEmployeeNo(FaceTerminal t) {
        Long schoolId = schoolIdOf(t);
        if (schoolId == null) return Map.of();
        Map<String, Student> m = new HashMap<>();
        for (Student s : studentRepo.findBySchoolId(schoolId)) {
            String emp = FaceIdMapping.toEmployeeNo(s.getFaceId());
            if (emp != null) m.putIfAbsent(emp, s);
        }
        return m;
    }
}
