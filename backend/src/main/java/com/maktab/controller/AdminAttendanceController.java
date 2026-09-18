package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Superadmin: bitta maktabning davomatini kun / hafta / oraliq bo'yicha yoki butunlay o'chirish.
 *
 * Xavfsizlik: /api/admin/** SecurityConfig'da SUPERADMIN'ga yopiq, bu yerda ham qayta tekshiriladi.
 * O'chirish ikki bosqichli: purge-preview soni ko'rsatiladi, purge shu sonni (expectedCount) qayta
 * yuboradi — oraliqda yangi yozuv qo'shilgan bo'lsa hech narsa o'chirilmaydi (ko'rsatilganidan ko'p
 * o'chib ketmasligi uchun), o'chirish aniq shu ID'lar bo'yicha.
 *
 * DIQQAT: person_recognition_events (qayta ishlangan terminal voqealari daftari) ATAYLAB o'chirilmaydi —
 * aks holda monitor terminaldagi voqealarni "yangi" deb qayta o'qib, o'chirilgan davomatni tiklab qo'yardi.
 */
@RestController
@RequestMapping("/api/admin/attendance")
public class AdminAttendanceController {

    private static final Logger log = LoggerFactory.getLogger(AdminAttendanceController.class);

    static final ZoneId SCHOOL_ZONE = ZoneId.of("Asia/Tashkent");
    private static final OffsetDateTime ALL_FROM = OffsetDateTime.parse("1970-01-01T00:00:00Z");
    private static final OffsetDateTime ALL_TO = OffsetDateTime.parse("2200-01-01T00:00:00Z");
    private static final int DELETE_CHUNK = 1000;
    private static final String FILES_PREFIX = "/api/files/";

    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    private Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    record Range(OffsetDateTime from, OffsetDateTime to) {}

    @GetMapping("/purge-preview")
    public ResponseEntity<?> preview(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestParam Long schoolId,
                                     @RequestParam(defaultValue = "false") boolean all,
                                     @RequestParam(required = false) String from,
                                     @RequestParam(required = false) String to) {
        requireSuperadmin(authHeader);
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));
        Range r = range(all, from, to);
        if (r == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.attendance_purge.invalid_range")));

        List<Object[]> rows = attendanceRepo.findIdAndPhotoBySchoolAndRange(schoolId, r.from(), r.to());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("schoolId", schoolId);
        m.put("schoolName", school.getName());
        m.put("count", rows.size());
        m.put("photos", rows.stream().filter(x -> x[1] != null).count());
        return ResponseEntity.ok(m);
    }

    @PostMapping("/purge")
    public ResponseEntity<?> purge(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                   @RequestBody Map<String, Object> body) {
        User caller = requireSuperadmin(authHeader);
        Long schoolId;
        Integer expectedCount;
        try {
            schoolId = Long.valueOf(String.valueOf(body.get("schoolId")));
            expectedCount = body.get("expectedCount") != null ? Integer.valueOf(String.valueOf(body.get("expectedCount"))) : null;
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.attendance_purge.preview_required")));
        }
        if (expectedCount == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.attendance_purge.preview_required")));
        }
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));
        boolean all = Boolean.parseBoolean(String.valueOf(body.get("all")));
        String from = body.get("from") != null ? body.get("from").toString() : null;
        String to = body.get("to") != null ? body.get("to").toString() : null;
        Range r = range(all, from, to);
        if (r == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.attendance_purge.invalid_range")));

        List<Object[]> rows = attendanceRepo.findIdAndPhotoBySchoolAndRange(schoolId, r.from(), r.to());
        if (rows.size() != expectedCount) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", i18n.msg("error.attendance_purge.count_changed", String.valueOf(rows.size())),
                "count", rows.size()));
        }

        List<Long> ids = new ArrayList<>(rows.size());
        List<String> photos = new ArrayList<>();
        for (Object[] row : rows) {
            ids.add((Long) row[0]);
            if (row[1] != null) photos.add(row[1].toString());
        }
        int deleted = 0;
        for (int i = 0; i < ids.size(); i += DELETE_CHUNK) {
            deleted += attendanceRepo.deleteByIdIn(ids.subList(i, Math.min(ids.size(), i + DELETE_CHUNK)));
        }
        // Fayllar faqat yozuvlar muvaffaqiyatli o'chirilgandan KEYIN o'chiriladi.
        int photosDeleted = 0;
        for (String p : photos) {
            if (deletePhoto(p)) photosDeleted++;
        }

        log.warn("Davomat o'chirildi: {} (id {}) — maktab {} \"{}\", {}, {} yozuv, {} rasm",
            caller.getUsername(), caller.getId(), schoolId, school.getName(),
            all ? "butunlay" : (from + " .. " + to), deleted, photosDeleted);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("deleted", deleted);
        m.put("photosDeleted", photosDeleted);
        return ResponseEntity.ok(m);
    }

    private User requireSuperadmin(String authHeader) {
        User u = currentUserService.requireUser(authHeader);
        if (u.getRole() != User.Role.SUPERADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.attendance_purge.superadmin_only"));
        }
        return u;
    }

    /** Toshkent vaqti bo'yicha to'liq kunlar: [from 00:00, to+1 00:00). Noto'g'ri bo'lsa null. */
    static Range range(boolean all, String from, String to) {
        if (all) return new Range(ALL_FROM, ALL_TO);
        if (from == null || from.isBlank() || to == null || to.isBlank()) return null;
        try {
            LocalDate f = LocalDate.parse(from.trim());
            LocalDate t = LocalDate.parse(to.trim());
            if (t.isBefore(f)) return null;
            return new Range(f.atStartOfDay(SCHOOL_ZONE).toOffsetDateTime(), t.plusDays(1).atStartOfDay(SCHOOL_ZONE).toOffsetDateTime());
        } catch (DateTimeException e) {
            return null;
        }
    }

    /** Faqat uploads papkasidagi oddiy fayl nomi — boshqa joyga (../) chiqib ketuvchi yo'l e'tiborsiz qoldiriladi. */
    private boolean deletePhoto(String photoPath) {
        if (!photoPath.startsWith(FILES_PREFIX)) return false;
        String name = photoPath.substring(FILES_PREFIX.length());
        if (name.isBlank() || name.contains("/") || name.contains("\\") || name.contains("..")) return false;
        Path file = uploadDir.resolve(name).normalize();
        if (!file.getParent().equals(uploadDir)) return false;
        try {
            return Files.deleteIfExists(file);
        } catch (Exception e) {
            log.warn("Davomat rasmi o'chirilmadi {}: {}", name, e.toString());
            return false;
        }
    }
}
