package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.FaceTerminal;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
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
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private I18nService i18n;

    /** "Onlayn terminal" chegarasi — RouterController#checkOfflineRouters bilan bir xil (2 daqiqa). */
    private static final long ONLINE_THRESHOLD_MINUTES = 2;

    // MUHIM (2026-09-18): mini-PC/ISUP ko'prigi davridan qolgan eski push endpointlari
    // (POST /, /sync, /heartbeat, GET /students, /offline-data) shu yerdan OLIB TASHLANDI —
    // 2026-08-10'da mini-PC arxitekturasi butunlay o'chirilgan, Face ID endi
    // faceterminal.FaceTerminalMonitor orqali VPN ichidan o'zi tortib oladi (pull), routerdan
    // push kelmaydi. Auditda (2026-09-18) tasdiqlandi: bu endpointlarni na frontend, na bot,
    // na RouterOS skriptlari chaqirmaydi — faqat SecurityConfig'da permitAll bo'lib, o'quvchi/
    // maktab chegarasi tekshirilmagani sabab hujum yuzasi bo'lib turgan edi. SecurityConfig'dagi
    // mos permitAll qatorlari ham olib tashlandi.

    // ─── Frontend: terminal status for school ───
    @GetMapping("/devices/{schoolId}")
    public ResponseEntity<?> getDevices(@PathVariable Long schoolId,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.school.access_denied")));
        }
        List<FaceTerminal> terminals = terminalRepo.findBySchoolId(schoolId);
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);
        return ResponseEntity.ok(terminals.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("deviceSerial", t.getSerialNumber());
            m.put("deviceName", t.getName());
            m.put("ipAddress", t.getIpAddress());
            m.put("lastSeen", t.getLastSeen() != null ? t.getLastSeen().toString() : null);
            m.put("online", t.getLastSeen() != null && t.getLastSeen().isAfter(threshold));
            return m;
        }).collect(Collectors.toList()));
    }

    // ─── Frontend: attendance by school + date ───
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<?> getBySchool(@PathVariable Long schoolId,
                                          @RequestParam(required = false) String date,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.school.access_denied")));
        }
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
                                           @RequestParam(required = false) String to,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student owner = studentRepo.findById(studentId).orElse(null);
        if (owner == null) return ResponseEntity.notFound().build();
        Long ownerSchoolId = owner.getSchool() != null ? owner.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, ownerSchoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
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

    // ─── Frontend: Dashboard Overview ───
    // MUHIM: `role`/`provinceId`/`schoolId` endi client'dan ISHONCH bilan qabul qilinmaydi —
    // haqiqiy ko'lam Authorization headerdagi JWT orqali aniqlangan foydalanuvchidan olinadi.
    // SUPERADMIN uchun provinceId/schoolId ixtiyoriy tor filtr sifatida qoladi.
    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) Long schoolId) {

        User user = currentUserService.requireUser(authHeader);

        LocalDate today = LocalDate.now();
        OffsetDateTime from = today.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        LocalDateTime deviceThreshold = LocalDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);

        List<Long> scope; // null => cheklovsiz (faqat SUPERADMIN, filtrsiz)
        long totalSchools;

        if (user.getRole() == User.Role.DIRECTOR || user.getRole() == User.Role.MUDIR
                || user.getRole() == User.Role.TEACHER) {
            scope = user.getSchoolId() != null ? List.of(user.getSchoolId()) : Collections.emptyList();
            totalSchools = scope.size();
        } else if (user.getRole() == User.Role.REGION_DIRECTOR) {
            scope = currentUserService.schoolIdsForProvince(user.getProvinceId());
            totalSchools = scope.size();
        } else if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            scope = currentUserService.schoolIdsForDistrict(user.getDistrictId());
            totalSchools = scope.size();
        } else { // SUPERADMIN / ADMIN — ikkalasi ham ko'rish uchun cheklovsiz, ixtiyoriy tor filtr
            if (schoolId != null) {
                scope = List.of(schoolId);
                totalSchools = 1;
            } else if (provinceId != null) {
                scope = currentUserService.schoolIdsForProvince(provinceId);
                totalSchools = scope.size();
            } else {
                scope = null;
                // MUHIM: avval "14" (viloyatlar soni) qattiq yozilgan edi va haqiqiy maktablar
                // sonini umuman aks ettirmasdi. Endi haqiqiy hisoblanadi.
                totalSchools = schoolRepo.count();
            }
        }

        long[] counts = scopedOverviewCounts(scope, from, to, deviceThreshold);
        long totalStudents = counts[0], presentToday = counts[1], totalDevices = counts[2], onlineDevices = counts[3];

        Map<String, Object> data = new HashMap<>();
        data.put("totalStudents", totalStudents);
        data.put("totalSchools", totalSchools);
        data.put("presentToday", presentToday);
        data.put("absentToday", Math.max(0, totalStudents - presentToday));
        data.put("totalDevices", totalDevices);
        data.put("onlineDevices", onlineDevices);

        // MUHIM: avval bu yerda haqiqiy so'rov o'rniga totalStudents'dan qattiq yozilgan
        // foizlar (0.8/0.85/0.9...) bilan SOXTA grafik ma'lumoti hisoblanardi. Endi so'nggi
        // 7 kunning har biri uchun haqiqiy "kelganlar" soni alohida hisoblanadi.
        List<Long> weeklyPresent = new ArrayList<>();
        for (int i = 6; i >= 1; i--) {
            LocalDate day = today.minusDays(i);
            OffsetDateTime dayFrom = day.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
            OffsetDateTime dayTo = day.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));
            weeklyPresent.add(scopedOverviewCounts(scope, dayFrom, dayTo, deviceThreshold)[1]);
        }
        weeklyPresent.add(presentToday);
        data.put("weeklyPresent", weeklyPresent);

        return ResponseEntity.ok(data);
    }

    /**
     * schoolIds == null   -> cheklovsiz (butun tizim)
     * schoolIds.isEmpty() -> ko'lamda hech qanday maktab yo'q (0 natija)
     * aks holda           -> shu maktablar bo'yicha jamlangan
     * Natija: [totalStudents, presentToday, totalTerminals, onlineTerminals]
     */
    private long[] scopedOverviewCounts(List<Long> schoolIds, OffsetDateTime from, OffsetDateTime to,
                                         LocalDateTime deviceThreshold) {
        long totalStudents;
        List<Attendance> inEvents;
        List<FaceTerminal> terminals;

        if (schoolIds == null) {
            totalStudents = studentRepo.count();
            // MUHIM: avval attendanceRepo.findAll() bilan BUTUN jadval xotiraga yuklanardi va
            // faqat pastki chegara (`from`) tekshirilardi, `to` esa umuman ishlatilmasdi — vaqt
            // o'tishi bilan (ko'p yillik face-scan loglari) jiddiy performance muammosi va
            // noaniq natija. Endi boshqa tarmoq (schoolIds != null) kabi ikkala chegara bilan
            // DB darajasida filtrlanadi.
            inEvents = attendanceRepo.findByTimestampBetween(from, to).stream()
                    .filter(a -> a.getType() == Attendance.AttendanceType.IN)
                    .collect(Collectors.toList());
            terminals = terminalRepo.findAll();
        } else if (schoolIds.isEmpty()) {
            totalStudents = 0;
            inEvents = Collections.emptyList();
            terminals = Collections.emptyList();
        } else {
            totalStudents = studentRepo.findBySchoolIdIn(schoolIds).size();
            inEvents = attendanceRepo.findBySchoolsAndDateRange(schoolIds, from, to).stream()
                    .filter(a -> a.getType() == Attendance.AttendanceType.IN)
                    .collect(Collectors.toList());
            terminals = terminalRepo.findBySchoolIdIn(schoolIds);
        }

        long presentToday = inEvents.stream().map(a -> a.getStudent().getId()).distinct().count();
        long totalTerminals = terminals.size();
        long onlineTerminals = terminals.stream()
                .filter(t -> t.getLastSeen() != null && t.getLastSeen().isAfter(deviceThreshold)).count();

        return new long[]{totalStudents, presentToday, totalTerminals, onlineTerminals};
    }
}
