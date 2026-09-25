package com.maktab.controller;

import com.maktab.model.SchoolClass;
import com.maktab.model.School;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UserRepository;
import com.maktab.model.User;
import com.maktab.security.CurrentUserService;
import com.maktab.service.ClassAttendanceService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classes")
public class SchoolClassController {

    @Autowired private SchoolClassRepository classRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private ClassAttendanceService classAttendance;
    @Autowired private UserRepository userRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    /**
     * MUHIM: schoolId endi client'dan ishonch bilan qabul qilinmaydi — SUPERADMIN/ADMIN'dan
     * boshqa har bir rol uchun haqiqiy ko'lam Authorization headerdagi foydalanuvchidan
     * CurrentUserService#resolveSchoolScope orqali olinadi.
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.resolveSchoolScope(user, schoolId);
        List<SchoolClass> list;
        if (scope == null) {
            list = classRepo.findAll();
        } else if (scope.isEmpty()) {
            list = Collections.emptyList();
        } else if (scope.size() == 1) {
            list = classRepo.findBySchoolIdOrderByGradeAscSectionAsc(scope.get(0));
        } else {
            list = classRepo.findBySchoolIdIn(scope);
        }
        return list.stream().map(this::toMap).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.class.access_denied")));
        }
        return ResponseEntity.ok(toMap(sc));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        currentUserService.assertCanWriteClass(caller, schoolId);
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));

        SchoolClass sc = new SchoolClass();
        sc.setSchool(school);
        sc.setName(body.get("name").toString());
        sc.setGrade(body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null);
        sc.setSection(body.get("section") != null ? body.get("section").toString() : null);
        sc.setTeacherId(body.get("teacherId") != null ? Long.valueOf(body.get("teacherId").toString()) : null);
        classRepo.save(sc);
        return ResponseEntity.ok(toMap(sc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        Long currentSchoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        currentUserService.assertCanWriteClass(caller, currentSchoolId);

        if (body.containsKey("name")) sc.setName(body.get("name").toString());
        if (body.containsKey("grade")) sc.setGrade(body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null);
        if (body.containsKey("section")) sc.setSection(body.get("section") != null ? body.get("section").toString() : null);
        if (body.containsKey("teacherId")) sc.setTeacherId(body.get("teacherId") != null ? Long.valueOf(body.get("teacherId").toString()) : null);
        if (body.containsKey("schoolId")) {
            Long newSchoolId = Long.valueOf(body.get("schoolId").toString());
            currentUserService.assertCanWriteClass(caller, newSchoolId);
            School school = schoolRepo.findById(newSchoolId).orElse(null);
            if (school != null) sc.setSchool(school);
        }
        classRepo.save(sc);
        return ResponseEntity.ok(toMap(sc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteClass(caller, sc.getSchool() != null ? sc.getSchool().getId() : null);
        classRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  SINF DAVOMATI (2026-09-21)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Bitta sinfning bir kunlik davomati — jadval ko'rinishi uchun.
     * GET /api/classes/{id}/attendance?date=YYYY-MM-DD (sana berilmasa — bugun).
     *
     * Har bir o'quvchi uchun kun davomidagi BIRINCHI kirish va OXIRGI chiqish olinadi (bola kun
     * ichida bir necha marta o'tishi mumkin). "reachable" — Telegram'i ulangan va bildirishnomani
     * o'chirmagan vasiylar soni: panel xabar kimga yetib borishini oldindan ko'rsatadi.
     */
    @GetMapping("/{id}/attendance")
    public ResponseEntity<?> classAttendance(@PathVariable Long id,
                                              @RequestParam(required = false) String date,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.class.access_denied")));
        }
        LocalDate day;
        try {
            day = date != null && !date.isBlank() ? LocalDate.parse(date) : LocalDate.now(ClassAttendanceService.TASHKENT);
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.class.invalid_date")));
        }

        List<Map<String, Object>> rows = classAttendance.rows(sc, day);
        long present = rows.stream().filter(r -> Boolean.TRUE.equals(r.get("present"))).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("class", toMap(sc));
        result.put("date", day.toString());
        result.put("total", rows.size());
        result.put("present", present);
        result.put("absent", rows.size() - present);
        result.put("pct", rows.isEmpty() ? 0 : Math.round(present * 100.0 / rows.size()));
        result.put("students", rows);
        return ResponseEntity.ok(result);
    }

    /** Xuddi shu jadval Excel (.xlsx) sifatida — StudentController#importTemplate bilan bir xil naqsh. */
    @GetMapping("/{id}/attendance/export")
    public ResponseEntity<?> exportClassAttendance(@PathVariable Long id,
                                                    @RequestParam(required = false) String date,
                                                    @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.class.access_denied")));
        }
        LocalDate day;
        try {
            day = date != null && !date.isBlank() ? LocalDate.parse(date) : LocalDate.now(ClassAttendanceService.TASHKENT);
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.class.invalid_date")));
        }
        try {
            byte[] bytes = classAttendance.excel(sc, day, classAttendance.rows(sc, day));
            String fileName = "davomat_" + ClassAttendanceService.asciiSafe(sc.getName()) + "_" + day + ".xlsx";
            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toMap(SchoolClass sc) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", sc.getId());
        m.put("name", sc.getName());
        m.put("grade", sc.getGrade());
        m.put("section", sc.getSection());
        m.put("schoolId", sc.getSchool().getId());
        m.put("schoolName", sc.getSchool().getName());
        m.put("teacherId", sc.getTeacherId());
        // Resolve teacher name
        if (sc.getTeacherId() != null) {
            userRepo.findById(sc.getTeacherId()).ifPresent(u -> m.put("teacherName", u.getFullName()));
        }
        // Count students in this class
        long count = studentRepo.countByClassId(sc.getId());
        m.put("studentCount", count);
        return m;
    }
}
