package com.maktab.service;

import com.maktab.model.*;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI chat (AiChatController) uchun "vosita"lar (tools) — Claude shu funksiyalarni
 * chaqirib, HAQIQIY tizim ma'lumotidan javob quradi (fabrikatsiya emas). Har bir
 * metod chaqiruvchi (User) ko'lami bilan CHEKLANGAN — CurrentUserService orqali
 * boshqa controller'lar bilan bir xil qoida: bitta maktabga bog'langan rol faqat
 * o'z maktabini, kengroq rol o'z ko'lamidagi barcha maktablarni ko'radi.
 */
@Component
public class AiToolService {

    @Autowired private StudentRepository studentRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private PersonNoteRepository noteRepo;
    @Autowired private CurrentUserService currentUserService;

    private List<Long> scopeOrEmpty(User caller) {
        List<Long> scope = currentUserService.allowedSchoolIds(caller);
        return scope; // null => cheklovsiz (SUPERADMIN/ADMIN)
    }

    private List<Student> studentsInScope(User caller) {
        List<Long> scope = scopeOrEmpty(caller);
        if (scope == null) return studentRepo.findAll();
        if (scope.isEmpty()) return Collections.emptyList();
        return studentRepo.findBySchoolIdIn(scope);
    }

    private List<School> schoolsInScope(User caller) {
        List<Long> scope = scopeOrEmpty(caller);
        if (scope == null) return schoolRepo.findAll();
        if (scope.isEmpty()) return Collections.emptyList();
        return schoolRepo.findAllById(scope);
    }

    public List<Map<String, Object>> searchStudents(User caller, String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        return studentsInScope(caller).stream()
                .filter(s -> q.isEmpty() || s.getFullName().toLowerCase().contains(q))
                .limit(15)
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", s.getId());
                    m.put("fullName", s.getFullName());
                    m.put("schoolName", s.getSchool() != null ? s.getSchool().getName() : null);
                    if (s.getClassId() != null) {
                        classRepo.findById(s.getClassId()).ifPresent(c -> m.put("className", c.getName()));
                    }
                    return m;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getStudentAttendance(User caller, Long studentId) {
        Student student = studentRepo.findById(studentId).orElse(null);
        if (student == null) return Map.of("error", "O'quvchi topilmadi");
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(caller, schoolId)) {
            return Map.of("error", "Bu o'quvchiga ruxsat yo'q");
        }
        List<Attendance> events = attendanceRepo.findByStudentId(studentId);
        return computeAttendanceStats(events, 30, student.getFullName());
    }

    public List<Map<String, Object>> getStudentNotes(User caller, Long studentId) {
        Student student = studentRepo.findById(studentId).orElse(null);
        if (student == null) return List.of(Map.of("error", "O'quvchi topilmadi"));
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(caller, schoolId)) {
            return List.of(Map.of("error", "Bu o'quvchiga ruxsat yo'q"));
        }
        return noteRepo.findByPersonTypeAndPersonIdOrderByCreatedAtDesc(PersonNote.PersonType.STUDENT, studentId).stream()
                .map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("authorName", n.getAuthorName());
                    m.put("text", n.getText());
                    m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
                    return m;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> searchTeachers(User caller, String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        List<Long> scope = scopeOrEmpty(caller);
        List<User> teachers = scope == null
                ? userRepo.findByRole(User.Role.TEACHER)
                : (scope.isEmpty() ? Collections.emptyList() : userRepo.findByRoleAndSchoolIdIn(User.Role.TEACHER, scope));
        return teachers.stream()
                .filter(u -> q.isEmpty() || u.getFullName().toLowerCase().contains(q))
                .limit(15)
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("fullName", u.getFullName());
                    m.put("subject", u.getSubject());
                    m.put("phone", u.getPhone());
                    return m;
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> listClasses(User caller) {
        List<Long> scope = scopeOrEmpty(caller);
        List<SchoolClass> classes;
        if (scope == null) classes = classRepo.findAll();
        else if (scope.isEmpty()) classes = Collections.emptyList();
        else classes = classRepo.findBySchoolIdIn(scope);

        return classes.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", c.getName());
            m.put("grade", c.getGrade());
            m.put("schoolName", c.getSchool() != null ? c.getSchool().getName() : null);
            if (c.getTeacherId() != null) {
                userRepo.findById(c.getTeacherId()).ifPresent(t -> m.put("teacherName", t.getFullName()));
            }
            m.put("studentCount", studentRepo.countByClassId(c.getId()));
            return m;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getSchoolOverview(User caller) {
        return schoolsInScope(caller).stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", s.getName());
            m.put("studentCount", studentRepo.countBySchoolId(s.getId()));
            m.put("classCount", classRepo.findBySchoolId(s.getId()).size());
            long teacherCount = userRepo.findByRoleAndSchoolId(User.Role.TEACHER, s.getId()).size();
            m.put("teacherCount", teacherCount);
            return m;
        }).collect(Collectors.toList());
    }

    /** Veb-ilova (attendanceStats.js) bilan bir xil hisob-kitob — faqat haqiqiy IN hodisalaridan. */
    private Map<String, Object> computeAttendanceStats(List<Attendance> events, int days, String studentName) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime from = now.minusDays(days - 1L).toLocalDate().atStartOfDay(now.getOffset()).toOffsetDateTime();

        Set<LocalDate> presentDates = new HashSet<>();
        for (Attendance a : events) {
            if (a.getType() != Attendance.AttendanceType.IN) continue;
            if (a.getTimestamp() == null || a.getTimestamp().isBefore(from) || a.getTimestamp().isAfter(now)) continue;
            presentDates.add(a.getTimestamp().toLocalDate());
        }

        int schoolDays = 0;
        for (LocalDate d = from.toLocalDate(); !d.isAfter(now.toLocalDate()); d = d.plusDays(1)) {
            if (d.getDayOfWeek().getValue() != 7) schoolDays++; // Yakshanbadan boshqa kunlar
        }

        int presentDays = presentDates.size();
        int absentDays = Math.max(0, schoolDays - presentDays);
        int percent = schoolDays > 0 ? Math.round((presentDays * 100f) / schoolDays) : 0;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("studentName", studentName);
        m.put("periodDays", days);
        m.put("presentDays", presentDays);
        m.put("absentDays", absentDays);
        m.put("percent", percent);
        return m;
    }
}
