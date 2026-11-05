package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.Guardian;
import com.maktab.model.Student;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Telegram bot (bot/bot.py) uchun ota-ona (Guardian) ro'yxatdan o'tishi va davomat
 * statistikasi kontrakti. Bot foydalanuvchi JWT'siga ega emas (SecurityConfig'da
 * /api/guardians/** ochiq qoldirilgan) — shu sabab bu yerda telefon+parol bilan
 * o'z ichida autentifikatsiya qilinadi, "servis qatlami yo'q, thin controller"
 * uslubi V1AuthController'ga mos ravishda saqlanadi.
 */
@RestController
@RequestMapping("/api/guardians")
public class GuardianController {

    @Autowired private GuardianRepository guardianRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    /**
     * POST /api/guardians/register — bot.py#receive_password() kontrakti.
     * Body: {"phone": ..., "password": ..., "telegramUserId": ...}
     *  - phone GuardianRepository'da topilmasa -> 404 (bot "raqam tizimda topilmadi" ko'rsatadi)
     *  - Guardian'da hali parol yo'q bo'lsa (operator parent-links orqali yaratgan, parol
     *    tanlamagan) -> yuborilgan parol BIRINCHI MARTA o'rnatiladi va muvaffaqiyat qaytariladi
     *  - parol allaqachon o'rnatilgan bo'lsa -> BCrypt bilan solishtiriladi, mos kelmasa 401
     *  - muvaffaqiyatda telegramUserId saqlanadi va farzandlar ro'yxati qaytariladi
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        String phone = body.get("phone") != null ? body.get("phone").toString() : null;
        String password = body.get("password") != null ? body.get("password").toString() : null;
        String telegramUserId = body.get("telegramUserId") != null ? body.get("telegramUserId").toString() : null;

        if (phone == null || phone.isBlank() || password == null || password.isBlank()
                || telegramUserId == null || telegramUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "phone, password va telegramUserId majburiy"));
        }

        Guardian guardian = guardianRepo.findByPhone(phone);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Bu telefon raqam tizimda topilmadi"));
        }

        if (guardian.getPassword() == null || guardian.getPassword().isBlank()) {
            // Operator V1StudentController#createParentLink orqali yaratgan, hali parol
            // tanlamagan Guardian — birinchi /start urinishi parolni o'rnatadi.
            guardian.setPassword(passwordEncoder.encode(password));
        } else if (!passwordEncoder.matches(password, guardian.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Parol noto'g'ri"));
        }

        guardian.setTelegramUserId(telegramUserId);
        guardianRepo.save(guardian);

        List<Map<String, Object>> children = studentRepo.findByGuardianId(guardian.getId()).stream()
            .map(this::toChildMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("children", children));
    }

    /**
     * GET /api/guardians/telegram/{id}/stats — bot.py#stats() kontrakti.
     * {id} = Telegram user id (Guardian.telegramUserId).
     */
    @GetMapping("/telegram/{id}/stats")
    public ResponseEntity<?> stats(@PathVariable("id") String telegramUserId) {
        Guardian guardian = guardianRepo.findByTelegramUserId(telegramUserId);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Ota-ona topilmadi"));
        }

        List<Map<String, Object>> children = studentRepo.findByGuardianId(guardian.getId()).stream()
            .map(this::childStatsMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("children", children));
    }

    private Map<String, Object> toChildMap(Student s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fullName", s.getFullName());
        m.put("id", s.getId());
        return m;
    }

    /**
     * V1ReportsController#studentReport / V1AttendanceController bilan bir xil evristika:
     * kunga kamida bitta IN hodisasi bo'lsa "present", aks holda "absent"; hodisa
     * bo'lmagan kunlar umuman hisoblanmaydi (na present, na absent).
     */
    private Map<String, Object> childStatsMap(Student student) {
        List<Attendance> events = attendanceRepo.findByStudentId(student.getId());
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
        m.put("fullName", student.getFullName());
        m.put("totalDays", totalDays);
        m.put("presentDays", presentDays);
        m.put("absentDays", absentDays);
        return m;
    }
}
