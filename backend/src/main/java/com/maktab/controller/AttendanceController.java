package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.Device;
import com.maktab.model.DeviceHeartbeat;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private DeviceHeartbeatRepository heartbeatRepo;
    @Autowired private DeviceRepository deviceRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private NotificationService notificationService;

    // ─── Mini-PC: single event ───
    @PostMapping
    public ResponseEntity<?> recordEvent(@RequestBody Map<String, Object> body) {
        try {
            Long studentId = Long.valueOf(body.get("studentId").toString());
            OffsetDateTime timestamp = OffsetDateTime.parse(body.get("timestamp").toString());
            Attendance.AttendanceType type = Attendance.AttendanceType.valueOf(body.get("type").toString());

            // Duplicate check
            if (attendanceRepo.existsByStudentIdAndTimestampAndType(studentId, timestamp, type)) {
                return ResponseEntity.ok(Map.of("status", "duplicate", "message", "Already exists"));
            }

            Student student = studentRepo.findById(studentId).orElse(null);
            if (student == null) return ResponseEntity.badRequest().body(Map.of("error", "Student not found"));

            Attendance a = new Attendance();
            a.setStudent(student);
            a.setTimestamp(timestamp);
            a.setType(type);
            a.setTemperature(body.get("temperature") != null ? Double.valueOf(body.get("temperature").toString()) : null);
            a.setDeviceSerial(body.get("deviceSerial") != null ? body.get("deviceSerial").toString() : null);
            attendanceRepo.save(a);

            // 🔔 Ota-onaga xabar yuborish (async)
            String snapshotUrl = body.get("snapshotUrl") != null ? body.get("snapshotUrl").toString() : null;
            notificationService.notifyGuardians(student, timestamp, type.name(), snapshotUrl);

            return ResponseEntity.ok(Map.of("status", "ok", "id", a.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Mini-PC: batch sync (offline → online) ───
    @PostMapping("/sync")
    public ResponseEntity<?> batchSync(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestBody Map<String, Object> body) {
        // Device lookup (optional)
        Device device = apiKey != null ? deviceRepo.findByApiKey(apiKey).orElse(null) : null;

        List<Map<String, Object>> events = (List<Map<String, Object>>) body.get("events");
        if (events == null) return ResponseEntity.badRequest().body(Map.of("error", "No events"));
        int saved = 0, skipped = 0;
        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, Object> ev : events) {
            String syncKey = ev.get("syncKey") != null ? ev.get("syncKey").toString() : null;
            try {
                // Dedup by syncKey
                if (syncKey != null && attendanceRepo.existsBySyncKey(syncKey)) {
                    skipped++;
                    results.add(Map.of("syncKey", syncKey, "status", "duplicate"));
                    continue;
                }
                Long studentId = Long.valueOf(ev.get("studentId").toString());
                OffsetDateTime ts = OffsetDateTime.parse(ev.get("timestamp").toString());
                Attendance.AttendanceType type = Attendance.AttendanceType.valueOf(ev.get("type").toString());

                if (attendanceRepo.existsByStudentIdAndTimestampAndType(studentId, ts, type)) {
                    skipped++;
                    results.add(Map.of("syncKey", syncKey != null ? syncKey : "", "status", "duplicate"));
                    continue;
                }
                Student student = studentRepo.findById(studentId).orElse(null);
                if (student == null) { skipped++; continue; }

                Attendance a = new Attendance();
                a.setStudent(student);
                a.setTimestamp(ts);
                a.setType(type);
                a.setTemperature(ev.get("temperature") != null ? Double.valueOf(ev.get("temperature").toString()) : null);
                a.setDeviceSerial(ev.get("deviceSerial") != null ? ev.get("deviceSerial").toString() : null);
                a.setPhotoPath(ev.get("photoPath") != null ? ev.get("photoPath").toString() : null);
                a.setSyncKey(syncKey);
                a.setSyncedAt(OffsetDateTime.now());
                a.setMiniPcDeviceId(device != null ? device.getId() : null);
                a.setNotificationSent(false);
                attendanceRepo.save(a);
                saved++;
                results.add(Map.of("syncKey", syncKey != null ? syncKey : "", "status", "synced"));

                // Telegram notification
                try {
                    String snapshotUrl = ev.get("photoPath") != null ? ev.get("photoPath").toString() : null;
                    notificationService.notifyGuardians(student, ts, type.name(), snapshotUrl);
                    a.setNotificationSent(true);
                    attendanceRepo.save(a);
                } catch (Exception ignored) {}
            } catch (Exception ignored) { skipped++; }
        }
        return ResponseEntity.ok(Map.of("synced", saved, "skipped", skipped, "total", events.size(), "results", results));
    }

    // ─── Mini-PC: heartbeat ───
    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody Map<String, Object> body) {
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        String serial = body.get("deviceSerial").toString();

        DeviceHeartbeat hb = heartbeatRepo.findBySchoolIdAndDeviceSerial(schoolId, serial)
                .orElseGet(DeviceHeartbeat::new);
        hb.setSchoolId(schoolId);
        hb.setDeviceSerial(serial);
        hb.setDeviceName(body.get("deviceName") != null ? body.get("deviceName").toString() : null);
        hb.setIpAddress(body.get("ipAddress") != null ? body.get("ipAddress").toString() : null);
        hb.setLastSeen(OffsetDateTime.now());
        hb.setOnline(true);
        hb.setPendingEvents(body.get("pendingEvents") != null ? Integer.valueOf(body.get("pendingEvents").toString()) : 0);
        heartbeatRepo.save(hb);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // ─── Frontend: device status for school ───
    @GetMapping("/devices/{schoolId}")
    public ResponseEntity<?> getDevices(@PathVariable Long schoolId) {
        List<DeviceHeartbeat> devices = heartbeatRepo.findBySchoolId(schoolId);
        // Mark offline if not seen in 2 minutes
        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(2);
        return ResponseEntity.ok(devices.stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("deviceSerial", d.getDeviceSerial());
            m.put("deviceName", d.getDeviceName());
            m.put("ipAddress", d.getIpAddress());
            m.put("lastSeen", d.getLastSeen().toString());
            m.put("online", d.getLastSeen().isAfter(threshold));
            m.put("pendingEvents", d.getPendingEvents());
            return m;
        }).collect(Collectors.toList()));
    }

    // ─── Frontend: attendance by school + date ───
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getBySchool(@PathVariable Long schoolId,
                                          @RequestParam(required = false) String date) {
        LocalDate day = date != null ? LocalDate.parse(date) : LocalDate.now();
        OffsetDateTime from = day.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = day.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));

        List<Attendance> list = attendanceRepo.findBySchoolAndDateRange(schoolId, from, to);
        return ResponseEntity.ok(list.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("studentId", a.getStudent().getId());
            m.put("studentName", a.getStudent().getFullName());
            m.put("studentPhoto", a.getStudent().getPhotoUrl());
            m.put("faceId", a.getStudent().getFaceId());
            m.put("timestamp", a.getTimestamp().toString());
            m.put("type", a.getType().name());
            m.put("temperature", a.getTemperature());
            m.put("deviceSerial", a.getDeviceSerial());
            return m;
        }).collect(Collectors.toList()));
    }

    // ─── Frontend: attendance by student ───
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getByStudent(@PathVariable Long studentId,
                                           @RequestParam(required = false) String from,
                                           @RequestParam(required = false) String to) {
        List<Attendance> list;
        if (from != null && to != null) {
            list = attendanceRepo.findByStudentIdAndTimestampBetween(studentId,
                    OffsetDateTime.parse(from), OffsetDateTime.parse(to));
        } else {
            list = attendanceRepo.findByStudentId(studentId);
        }
        return ResponseEntity.ok(list.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("timestamp", a.getTimestamp().toString());
            m.put("type", a.getType().name());
            m.put("temperature", a.getTemperature());
            return m;
        }).collect(Collectors.toList()));
    }

    // ─── Mini-PC: o'quvchilar ro'yxati (kesh uchun) ───
    @GetMapping("/students")
    public ResponseEntity<?> getStudentsForDevice(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestParam Long schoolId) {
        // API key tekshirish
        if (apiKey != null) {
            Device device = deviceRepo.findByApiKey(apiKey).orElse(null);
            if (device == null || !device.getSchoolId().equals(schoolId)) {
                return ResponseEntity.status(401).body(Map.of("error", "Ruxsat yo'q"));
            }
        }
        List<Student> students = studentRepo.findBySchoolId(schoolId);
        List<Map<String, Object>> result = students.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("fullName", s.getFullName());
            m.put("classId", s.getClassId());
            m.put("photoUrl", s.getPhotoUrl());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("students", result, "count", result.size()));
    }

    // ─── Mini-PC: unified offline data sync ───
    @GetMapping("/offline-data")
    public ResponseEntity<?> getOfflineData(
            @RequestHeader("X-Api-Key") String apiKey,
            @RequestParam Long schoolId) {
        
        Device device = deviceRepo.findByApiKey(apiKey).orElse(null);
        if (device == null || !device.getSchoolId().equals(schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Invalid API Key or School ID"));
        }

        // Students
        List<Map<String, Object>> students = studentRepo.findBySchoolId(schoolId).stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("fullName", s.getFirstName() + " " + s.getLastName());
            m.put("className", s.getSchoolClass() != null ? s.getSchoolClass().getGrade() + s.getSchoolClass().getSection() : "");
            return m;
        }).collect(Collectors.toList());

        // Classes
        List<Map<String, Object>> classes = classRepo.findBySchoolIdOrderByGradeAscSectionAsc(schoolId).stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", (c.getGrade() != null ? c.getGrade() : "") + (c.getSection() != null ? c.getSection() : "") + " - " + c.getName());
            return m;
        }).collect(Collectors.toList());

        // Teachers
        List<Map<String, Object>> teachers = userRepo.findByRoleAndSchoolId(User.Role.TEACHER, schoolId).stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("fullName", t.getFullName());
            m.put("role", t.getRole().name());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "students", students,
            "classes", classes,
            "teachers", teachers
        ));
    }

    // ─── Frontend: Dashboard Overview ───
    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) Long schoolId) {

        Map<String, Object> data = new HashMap<>();
        LocalDate today = LocalDate.now();
        OffsetDateTime from = today.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));

        long totalStudents = 0;
        long totalSchools = 0;
        long presentToday = 0;

        if ("DIRECTOR".equals(role) || "TEACHER".equals(role)) {
            if (schoolId != null) {
                totalStudents = studentRepo.countBySchoolId(schoolId);
                totalSchools = 1;
                presentToday = attendanceRepo.findBySchoolAndDateRange(schoolId, from, to)
                        .stream().filter(a -> a.getType() == Attendance.AttendanceType.IN)
                        .map(a -> a.getStudent().getId()).distinct().count();
            }
        } else if ("ADMIN".equals(role) && provinceId != null) {
            // Placeholder: Admin logic
            // To do this perfectly we need province stats. Just fallback to something reasonable.
            totalStudents = studentRepo.count();
            totalSchools = 10;
        } else {
            totalStudents = studentRepo.count();
            totalSchools = 14; // All provinces
            presentToday = attendanceRepo.findAll().stream()
                    .filter(a -> a.getTimestamp().isAfter(from) && a.getType() == Attendance.AttendanceType.IN)
                    .map(a -> a.getStudent().getId()).distinct().count();
        }

        long totalDevices = 0;
        long onlineDevices = 0;
        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(5);
        if (schoolId != null) {
            List<DeviceHeartbeat> hbs = heartbeatRepo.findBySchoolId(schoolId);
            totalDevices = hbs.size();
            onlineDevices = hbs.stream().filter(h -> h.getLastSeen() != null && h.getLastSeen().isAfter(threshold)).count();
        } else {
            List<DeviceHeartbeat> hbs = heartbeatRepo.findAll();
            totalDevices = hbs.size();
            onlineDevices = hbs.stream().filter(h -> h.getLastSeen() != null && h.getLastSeen().isAfter(threshold)).count();
        }

        data.put("totalStudents", totalStudents);
        data.put("totalSchools", totalSchools);
        data.put("presentToday", presentToday);
        data.put("absentToday", Math.max(0, totalStudents - presentToday));
        data.put("totalDevices", totalDevices);
        data.put("onlineDevices", onlineDevices);

        // Mock chart data for week
        List<Long> weeklyPresent = Arrays.asList(
            (long)(totalStudents * 0.8), (long)(totalStudents * 0.85),
            (long)(totalStudents * 0.9), (long)(totalStudents * 0.88),
            (long)(totalStudents * 0.82), (long)(totalStudents * 0.7),
            presentToday
        );
        data.put("weeklyPresent", weeklyPresent);

        return ResponseEntity.ok(data);
    }
}
