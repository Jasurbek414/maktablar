package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/attendance/* kontrakti. Mavjud /api/attendance
 * (AttendanceController) o'zgarishsiz qoladi.
 *
 * MUHIM SODDALASHTIRISH: bu backendning Attendance entity'si Django'dagi kabi
 * "kunlik status yozuvi" (present/late/absent/excused + check_in/check_out) emas —
 * har bir Face ID kirish/chiqishi alohida IN/OUT hodisa sifatida saqlanadi.
 * Shu sabab pastdagi barcha "kunlik status" hisob-kitoblari IN/OUT hodisalaridan
 * kelib chiqib EVRISTIK tarzda hisoblanadi:
 *   - kamida bitta IN hodisasi bo'lsa  -> "present"
 *   - IN hodisasi bo'lmasa             -> "absent"
 *   - "late"/"excused" ajratish uchun ma'lumot yo'q (bu schema'da maktab boshlanish
 *     vaqti degan tushuncha yo'q), shu sabab har doim late=0 qaytariladi.
 * Bu — soddalashtirilgan best-effort implementatsiya, aniq Django parity emas.
 */
@RestController
@RequestMapping("/api/v1/attendance")
public class V1AttendanceController {

    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private CurrentUserService currentUserService;

    // MUHIM: `school`/`schoolId` endi client'dan ISHONCH bilan qabul qilinmaydi — haqiqiy
    // ko'lam Authorization headerdagi JWT orqali aniqlangan foydalanuvchidan olinadi
    // (CurrentUserService#resolveSchoolScope). SUPERADMIN uchun ixtiyoriy tor filtr sifatida qoladi.

    @GetMapping("/")
    public List<Map<String, Object>> getAttendance(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long student,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long class_ref,
            @RequestParam(required = false) String status) {

        User user = currentUserService.requireUser(authHeader);
        LocalDate day = date != null ? LocalDate.parse(date) : LocalDate.now();
        Long sid = school != null ? school : schoolId;
        Long stId = student != null ? student : studentId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);

        List<DayRecord> records = buildDayRecords(day, scope, stId, class_ref);
        if (status != null && !status.isBlank()) {
            records = records.stream().filter(r -> status.equals(r.status)).collect(Collectors.toList());
        }
        return records.stream().map(this::toRecordMap).collect(Collectors.toList());
    }

    @GetMapping("/today/")
    public List<Map<String, Object>> getToday(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        return buildDayRecords(LocalDate.now(), scope, null, null).stream()
            .map(this::toRecordMap).collect(Collectors.toList());
    }

    @GetMapping("/statistics/")
    public Map<String, Object> getStatistics(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        LocalDate start = start_date != null ? LocalDate.parse(start_date) : LocalDate.now();
        LocalDate end = end_date != null ? LocalDate.parse(end_date) : start;

        // Bir necha kunlik oraliqda har bir kun uchun alohida hisoblab, o'quvchi-kun
        // darajasida jamlaymiz (bitta o'quvchi bir necha kun davomida bir necha marta hisoblanishi mumkin).
        long total = 0, present = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            List<DayRecord> records = buildDayRecords(d, scope, null, null);
            total += records.size();
            present += records.stream().filter(r -> "present".equals(r.status)).count();
        }
        long absent = total - present;
        double rate = total > 0 ? Math.round((present * 1000.0 / total)) / 10.0 : 0;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", total);
        m.put("present", present);
        m.put("late", 0); // schema'da kechikish tushunchasi yo'q
        m.put("absent", absent);
        m.put("attendance_rate", rate);
        return m;
    }

    @PatchMapping("/{id}/")
    public ResponseEntity<?> updateAttendance(@PathVariable Long id,
                                               @RequestHeader(value = "Authorization", required = false) String authHeader,
                                               @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Attendance a = attendanceRepo.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        Student owner = a.getStudent();
        Long ownerSchoolId = owner != null && owner.getSchool() != null ? owner.getSchool().getId() : null;
        currentUserService.assertCanWriteSchoolData(user, ownerSchoolId);

        if (body.containsKey("type") && body.get("type") != null) {
            a.setType(Attendance.AttendanceType.valueOf(body.get("type").toString()));
        }
        if (body.containsKey("temperature")) {
            a.setTemperature(body.get("temperature") != null ? Double.valueOf(body.get("temperature").toString()) : null);
        }
        attendanceRepo.save(a);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("type", a.getType() != null ? a.getType().name() : null);
        m.put("temperature", a.getTemperature());
        m.put("timestamp", a.getTimestamp() != null ? a.getTimestamp().toString() : null);
        return ResponseEntity.ok(m);
    }

    /**
     * Excel export o'rniga CSV. pom.xml'da Apache POI (yoki boshqa Excel kutubxonasi)
     * yo'q, shu bitta endpoint uchun og'ir bog'liqlik qo'shmaslik maqsadida CSV
     * qaytariladi — Content-Type haqiqiy holatni aks ettiradi (text/csv, .xlsx emas).
     */
    @GetMapping("/export-excel/")
    public ResponseEntity<byte[]> exportExcel(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        LocalDate day = date != null ? LocalDate.parse(date) : LocalDate.now();
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        List<DayRecord> records = buildDayRecords(day, scope, null, null);

        StringBuilder csv = new StringBuilder();
        csv.append("Ism,Sinf,Keldi,Ketdi,Holat\n");
        for (DayRecord r : records) {
            csv.append(csvEscape(r.studentName)).append(',')
               .append(csvEscape(r.className)).append(',')
               .append(r.checkIn != null ? r.checkIn.toString() : "").append(',')
               .append(r.checkOut != null ? r.checkOut.toString() : "").append(',')
               .append(r.status).append('\n');
        }
        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"davomad_" + day + ".csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(bytes);
    }

    private String csvEscape(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"")) return "\"" + s.replace("\"", "\"\"") + "\"";
        return s;
    }

    // ── Kunlik jamlash mantig'i (IN/OUT hodisalardan) ──

    private static class DayRecord {
        Long id;
        Long studentId;
        String studentName;
        String faceId;
        Long classId;
        String className;
        OffsetDateTime checkIn;
        OffsetDateTime checkOut;
        String status;
    }

    /**
     * schoolIds == null   -> cheklovsiz (faqat SUPERADMIN, client filtri berilmagan holatda)
     * schoolIds.isEmpty() -> ko'lamda hech qanday maktab yo'q (bo'sh natija)
     * aks holda           -> shu maktablar bo'yicha (CurrentUserService#resolveSchoolScope orqali aniqlangan)
     */
    private List<DayRecord> buildDayRecords(LocalDate day, List<Long> schoolIds, Long studentId, Long classId) {
        OffsetDateTime from = day.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = day.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));

        List<Student> students;
        if (studentId != null) {
            students = studentRepo.findById(studentId).map(List::of).orElse(Collections.emptyList());
            // schoolIds != null => cheklangan foydalanuvchi: so'ralgan o'quvchi ko'lamdan tashqarida
            // bo'lsa (masalan boshqa maktab/viloyat) hech narsa qaytarilmasligi kerak.
            if (schoolIds != null) {
                students = students.stream()
                    .filter(s -> s.getSchool() != null && schoolIds.contains(s.getSchool().getId()))
                    .collect(Collectors.toList());
            }
        } else if (classId != null) {
            students = studentRepo.findByClassId(classId);
            if (schoolIds != null) {
                students = students.stream()
                    .filter(s -> s.getSchool() != null && schoolIds.contains(s.getSchool().getId()))
                    .collect(Collectors.toList());
            }
        } else if (schoolIds != null) {
            students = schoolIds.isEmpty() ? Collections.emptyList() : studentRepo.findBySchoolIdIn(schoolIds);
        } else {
            students = studentRepo.findAll();
        }

        List<Attendance> events;
        if (schoolIds != null && studentId == null && classId == null) {
            events = schoolIds.isEmpty() ? Collections.emptyList()
                : attendanceRepo.findBySchoolsAndDateRange(schoolIds, from, to);
        } else {
            events = attendanceRepo.findByTimestampBetween(from, to);
        }
        Map<Long, List<Attendance>> byStudent = events.stream()
            .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

        List<DayRecord> result = new ArrayList<>();
        for (Student s : students) {
            List<Attendance> evs = byStudent.getOrDefault(s.getId(), Collections.emptyList());
            DayRecord r = new DayRecord();
            r.id = s.getId(); // haqiqiy Attendance id emas — student-kun jamlanmasi uchun sintetik kalit
            r.studentId = s.getId();
            r.studentName = s.getFullName();
            r.faceId = s.getFaceId();
            r.classId = s.getClassId();
            if (s.getClassId() != null) {
                r.className = classRepo.findById(s.getClassId()).map(SchoolClass::getName).orElse(null);
            }
            r.checkIn = evs.stream().filter(a -> a.getType() == Attendance.AttendanceType.IN)
                .map(Attendance::getTimestamp).min(OffsetDateTime::compareTo).orElse(null);
            r.checkOut = evs.stream().filter(a -> a.getType() == Attendance.AttendanceType.OUT)
                .map(Attendance::getTimestamp).max(OffsetDateTime::compareTo).orElse(null);
            r.status = r.checkIn != null ? "present" : "absent";
            result.add(r);
        }
        return result;
    }

    private Map<String, Object> toRecordMap(DayRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.id);
        m.put("studentId", r.studentId);
        m.put("student_id", r.faceId);
        m.put("studentName", r.studentName);
        m.put("student_name", r.studentName);
        m.put("classId", r.classId);
        m.put("class_ref", r.classId);
        m.put("className", r.className);
        m.put("class_name", r.className);
        m.put("check_in", r.checkIn != null ? r.checkIn.toString() : null);
        m.put("checkIn", r.checkIn != null ? r.checkIn.toString() : null);
        m.put("check_out", r.checkOut != null ? r.checkOut.toString() : null);
        m.put("checkOut", r.checkOut != null ? r.checkOut.toString() : null);
        m.put("late_minutes", 0);
        m.put("status", r.status);
        return m;
    }
}
