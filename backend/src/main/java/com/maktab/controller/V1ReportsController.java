package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.MikrotikRouter;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/reports/* kontrakti — StudentRepository/
 * AttendanceRepository/SchoolRepository/DeviceRepository asosida hisoblanadigan
 * best-effort statistika. Django'dagi kabi murakkab ORM aggregatsiyalar emas,
 * shu sabab hisob-kitoblar sodda va izohlangan (vazifa talabiga ko'ra).
 *
 * "present"/"absent" heuristikasi V1AttendanceController'dagi bilan bir xil:
 * kunga kamida bitta IN hodisasi bo'lsa "present", aks holda "absent".
 * "late" har doim 0 — bu schema'da maktab boshlanish vaqti tushunchasi yo'q.
 */
@RestController
@RequestMapping("/api/v1/reports")
public class V1ReportsController {

    @Autowired private StudentRepository studentRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private ProvinceRepository provinceRepo;
    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    // MUHIM: school/schoolId endi client'dan ishonch bilan qabul qilinmaydi — haqiqiy ko'lam
    // Authorization headerdagi JWT orqali aniqlangan foydalanuvchidan olinadi
    // (CurrentUserService#resolveSchoolScope). SUPERADMIN uchun ixtiyoriy tor filtr sifatida qoladi.

    @GetMapping("/overview/")
    public Map<String, Object> overview(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user); // null => SUPERADMIN, cheklovsiz
        Map<String, Object> today = dayStats(LocalDate.now(), scope);

        List<MikrotikRouter> devices = scope == null ? routerRepo.findAll()
            : (scope.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(scope));
        long onlineDevices = devices.stream().filter(d -> d.getStatus() == MikrotikRouter.RouterStatus.ONLINE).count();
        long totalSchools = scope == null ? schoolRepo.count() : scope.size();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalStudents", scope == null ? studentRepo.count()
            : (scope.isEmpty() ? 0 : studentRepo.findBySchoolIdIn(scope).size()));
        m.put("totalSchools", totalSchools);
        m.put("totalDistricts", districtRepo.count());
        m.put("totalProvinces", provinceRepo.count());
        m.put("totalDevices", devices.size());
        m.put("onlineDevices", onlineDevices);
        m.put("offlineDevices", devices.size() - onlineDevices);
        m.put("today", today); // DashboardPage.jsx `overviewRes.data?.today` ni o'qiydi
        return m;
    }

    @GetMapping("/daily/")
    public Map<String, Object> daily(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        LocalDate day = date != null ? LocalDate.parse(date) : LocalDate.now();
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);

        Map<String, Object> stats = dayStats(day, scope);
        stats.put("date", day.toString());
        stats.put("class_breakdown", classBreakdown(day, scope));
        return stats;
    }

    @GetMapping("/weekly/")
    public Map<String, Object> weekly(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        LocalDate end = end_date != null ? LocalDate.parse(end_date) : LocalDate.now();
        LocalDate start = start_date != null ? LocalDate.parse(start_date) : end.minusDays(6);

        Map<String, Object> daily = new LinkedHashMap<>();
        long totalPresent = 0, totalAbsent = 0, totalAll = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            Map<String, Object> stats = dayStats(d, scope);
            daily.put(d.toString(), stats);
            totalPresent += (long) stats.get("present");
            totalAbsent += (long) stats.get("absent");
            totalAll += (long) stats.get("total");
        }
        Map<String, Object> overall = new LinkedHashMap<>();
        overall.put("present", totalPresent);
        overall.put("absent", totalAbsent);
        overall.put("late", 0);
        overall.put("attendance_rate", totalAll > 0 ? round1(totalPresent * 100.0 / totalAll) : 0);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("daily", daily);
        m.put("overall", overall);
        return m;
    }

    @GetMapping("/monthly/")
    public Map<String, Object> monthly(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        YearMonth ym = (year != null && month != null) ? YearMonth.of(year, month) : YearMonth.now();
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        Map<Integer, long[]> weekTotals = new TreeMap<>(); // week -> [present, absent]
        long totalPresent = 0, totalAbsent = 0, totalAll = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            Map<String, Object> stats = dayStats(d, scope);
            long present = (long) stats.get("present");
            long absent = (long) stats.get("absent");
            long total = (long) stats.get("total");
            totalPresent += present; totalAbsent += absent; totalAll += total;
            // MUHIM: avval WeekFields.of(Locale.getDefault()) ishlatilardi — natija server
            // JVM'ining default lokaliga bog'liq bo'lib, muhitdan-muhitga (masalan Docker
            // konteyner lokali o'zgarsa) haftaning boshlanish kunini va shu bilan hisobotdagi
            // hafta guruhlanishini o'zgartirib yuborishi mumkin edi. Endi ISO 8601 (dushanbadan
            // boshlanadi) qat'iy standart bilan hisoblanadi — server sozlamasidan mustaqil.
            int week = d.get(WeekFields.ISO.weekOfMonth());
            weekTotals.computeIfAbsent(week, k -> new long[2]);
            weekTotals.get(week)[0] += present;
            weekTotals.get(week)[1] += absent;
        }

        Map<String, Object> weekly = new LinkedHashMap<>();
        for (Map.Entry<Integer, long[]> e : weekTotals.entrySet()) {
            long p = e.getValue()[0], a = e.getValue()[1];
            long tot = p + a;
            Map<String, Object> wm = new LinkedHashMap<>();
            wm.put("present", p);
            wm.put("absent", a);
            wm.put("late", 0);
            wm.put("attendance_rate", tot > 0 ? round1(p * 100.0 / tot) : 0);
            weekly.put(String.valueOf(e.getKey()), wm);
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("weekly", weekly);
        m.put("total", totalAll);
        m.put("present", totalPresent);
        m.put("absent", totalAbsent);
        m.put("late", 0);
        m.put("attendance_rate", totalAll > 0 ? round1(totalPresent * 100.0 / totalAll) : 0);
        m.put("class_breakdown", classBreakdown(end, scope)); // oyning oxirgi kuni holati bo'yicha yaqinlashtirilgan
        return m;
    }

    @GetMapping("/student/{studentId}/")
    public ResponseEntity<?> studentReport(@PathVariable Long studentId,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepo.findById(studentId).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long ownerSchoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, ownerSchoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }

        List<Attendance> events = attendanceRepo.findByStudentId(studentId);
        // Kunlar bo'yicha guruhlab, har kun uchun IN bor-yo'qligini tekshiramiz.
        Map<LocalDate, Boolean> presentByDay = new TreeMap<>();
        for (Attendance a : events) {
            if (a.getTimestamp() == null) continue;
            LocalDate d = a.getTimestamp().toLocalDate();
            boolean isIn = a.getType() == Attendance.AttendanceType.IN;
            presentByDay.merge(d, isIn, (old, v) -> old || v);
        }
        long totalDays = presentByDay.size();
        long presentDays = presentByDay.values().stream().filter(v -> v).count();
        long absentDays = totalDays - presentDays;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("studentId", student.getId());
        m.put("studentName", student.getFullName());
        m.put("totalDays", totalDays); // faqat kuzatilgan (hodisa bo'lgan) kunlar soni
        m.put("presentDays", presentDays);
        m.put("absentDays", absentDays);
        m.put("attendanceRate", totalDays > 0 ? round1(presentDays * 100.0 / totalDays) : 0);
        m.put("recentEvents", events.stream()
            .sorted(Comparator.comparing(Attendance::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(20)
            .map(a -> {
                Map<String, Object> em = new LinkedHashMap<>();
                em.put("timestamp", a.getTimestamp() != null ? a.getTimestamp().toString() : null);
                em.put("type", a.getType() != null ? a.getType().name() : null);
                return em;
            }).collect(Collectors.toList()));
        return ResponseEntity.ok(m);
    }

    @GetMapping("/analytics/")
    public Map<String, Object> analytics(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long district,
            @RequestParam(required = false) Long province) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
        Map<String, Object> today = dayStats(LocalDate.now(), scope);

        List<Map<String, Object>> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            Map<String, Object> stats = dayStats(d, scope);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", d.toString());
            point.put("present", stats.get("present"));
            point.put("absent", stats.get("absent"));
            point.put("attendance_rate", stats.get("attendance_rate"));
            weeklyTrend.add(point);
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("period", period != null ? period : "week");
        m.put("totalStudents", scope == null ? studentRepo.count()
            : (scope.isEmpty() ? 0 : studentRepo.findBySchoolIdIn(scope).size()));
        m.put("totalSchools", scope == null ? schoolRepo.count() : scope.size());
        m.put("presentToday", today.get("present"));
        m.put("absentToday", today.get("absent"));
        m.put("attendanceRateToday", today.get("attendance_rate"));
        m.put("weeklyTrend", weeklyTrend);
        return m;
    }

    // ── umumiy yordamchi metodlar ──
    // schoolIds == null -> cheklovsiz (faqat SUPERADMIN, filtrsiz); .isEmpty() -> ko'lam bo'sh.

    private Map<String, Object> dayStats(LocalDate day, List<Long> schoolIds) {
        OffsetDateTime from = day.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = day.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));

        List<Student> students;
        List<Attendance> events;
        if (schoolIds == null) {
            students = studentRepo.findAll();
            events = attendanceRepo.findByTimestampBetween(from, to);
        } else if (schoolIds.isEmpty()) {
            students = Collections.emptyList();
            events = Collections.emptyList();
        } else {
            students = studentRepo.findBySchoolIdIn(schoolIds);
            events = attendanceRepo.findBySchoolsAndDateRange(schoolIds, from, to);
        }

        Set<Long> presentStudentIds = events.stream()
            .filter(a -> a.getType() == Attendance.AttendanceType.IN)
            .map(a -> a.getStudent().getId())
            .collect(Collectors.toSet());

        long total = students.size();
        long present = students.stream().filter(s -> presentStudentIds.contains(s.getId())).count();
        long absent = total - present;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", total);
        m.put("present", present);
        m.put("late", 0);
        m.put("absent", absent);
        m.put("attendance_rate", total > 0 ? round1(present * 100.0 / total) : 0);
        return m;
    }

    private List<Map<String, Object>> classBreakdown(LocalDate day, List<Long> schoolIds) {
        List<SchoolClass> classes = schoolIds == null ? classRepo.findAll()
            : (schoolIds.isEmpty() ? Collections.emptyList() : classRepo.findBySchoolIdIn(schoolIds));
        OffsetDateTime from = day.atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        OffsetDateTime to = day.plusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(5));
        Set<Long> presentIds = attendanceRepo.findByTimestampBetween(from, to).stream()
            .filter(a -> a.getType() == Attendance.AttendanceType.IN)
            .map(a -> a.getStudent().getId()).collect(Collectors.toSet());

        List<Map<String, Object>> result = new ArrayList<>();
        for (SchoolClass c : classes) {
            List<Student> classStudents = studentRepo.findByClassId(c.getId());
            if (classStudents.isEmpty()) continue;
            long total = classStudents.size();
            long present = classStudents.stream().filter(s -> presentIds.contains(s.getId())).count();

            Map<String, Object> cm = new LinkedHashMap<>();
            // Frontend A ReportsPage.jsx aynan shu Django ORM uslubidagi kalitni o'qiydi:
            cm.put("student__class_ref__name", c.getName());
            cm.put("className", c.getName());
            cm.put("total", total);
            cm.put("present", present);
            cm.put("late", 0);
            cm.put("absent", total - present);
            result.add(cm);
        }
        return result;
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
