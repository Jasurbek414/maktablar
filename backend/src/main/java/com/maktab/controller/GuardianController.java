package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.Guardian;
import com.maktab.model.Message;
import com.maktab.model.Student;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.MessageRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.service.BotConfigService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
 *
 * MUHIM: avval /telegram/{id}/stats endpointi HECH QANDAY sekretsiz, faqat taxmin
 * qilinadigan Telegram user ID bo'yicha bolalar ismi+davomat statistikasini qaytarardi.
 * Endi ikkala endpoint ham bot.py'dan kelayotganini X-Bot-Key header (BOT_SHARED_SECRET)
 * orqali tekshiradi — mini-PC oqimidagi X-Api-Key bilan bir xil uslub.
 */
@RestController
@RequestMapping("/api/guardians")
public class GuardianController {

    @Autowired private GuardianRepository guardianRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private MessageRepository messageRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private I18nService i18n;
    @Autowired private BotConfigService botConfigService;

    @Value("${app.bot.shared-secret:}")
    private String botSharedSecret;

    /** Doimiy-vaqt solishtirish (timing-attack'dan himoya) — apiKey/bot-key kabi sekretlar uchun. */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isValidBotKey(String botKey) {
        return botSharedSecret != null && !botSharedSecret.isBlank() && constantTimeEquals(botKey, botSharedSecret);
    }

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
    public ResponseEntity<?> register(@RequestHeader(value = "X-Bot-Key", required = false) String botKey,
                                       @RequestBody Map<String, Object> body) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        String phone = body.get("phone") != null ? body.get("phone").toString() : null;
        String password = body.get("password") != null ? body.get("password").toString() : null;
        String telegramUserId = body.get("telegramUserId") != null ? body.get("telegramUserId").toString() : null;

        if (phone == null || phone.isBlank() || password == null || password.isBlank()
                || telegramUserId == null || telegramUserId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.guardian.fields_required")));
        }

        Guardian guardian = findGuardianByPhoneFlexible(phone);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.phone_not_found")));
        }

        if (guardian.getPassword() == null || guardian.getPassword().isBlank()) {
            // Operator V1StudentController#createParentLink orqali yaratgan, hali parol
            // tanlamagan Guardian — birinchi /start urinishi parolni o'rnatadi.
            guardian.setPassword(passwordEncoder.encode(password));
        } else if (!passwordEncoder.matches(password, guardian.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.wrong_password")));
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
    public ResponseEntity<?> stats(@RequestHeader(value = "X-Bot-Key", required = false) String botKey,
                                    @PathVariable("id") String telegramUserId) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        Guardian guardian = guardianRepo.findByTelegramUserId(telegramUserId);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.not_found")));
        }

        List<Map<String, Object>> children = studentRepo.findByGuardianId(guardian.getId()).stream()
            .map(this::childStatsMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("children", children));
    }

    /**
     * PATCH /api/guardians/telegram/{id}/language — bot.py'dagi til tanlovini
     * (USER_LANGUAGES xotira-ichi keshdan farqli) doimiy saqlash uchun.
     */
    @PatchMapping("/telegram/{id}/language")
    public ResponseEntity<?> updateLanguage(@RequestHeader(value = "X-Bot-Key", required = false) String botKey,
                                             @PathVariable("id") String telegramUserId,
                                             @RequestBody Map<String, Object> body) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        Guardian guardian = guardianRepo.findByTelegramUserId(telegramUserId);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.not_found")));
        }
        String language = body.get("language") != null ? body.get("language").toString() : null;
        if (language == null || !List.of("uz", "ru", "en").contains(language)) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.guardian.invalid_language")));
        }
        guardian.setLanguagePreference(language);
        guardianRepo.save(guardian);
        return ResponseEntity.ok(Map.of("languagePreference", language));
    }

    /** GET /api/guardians/telegram/{id}/children — xabar yozishda "qaysi farzand haqida" so'rash uchun. */
    @GetMapping("/telegram/{id}/children")
    public ResponseEntity<?> children(@RequestHeader(value = "X-Bot-Key", required = false) String botKey,
                                       @PathVariable("id") String telegramUserId) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        Guardian guardian = guardianRepo.findByTelegramUserId(telegramUserId);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.not_found")));
        }
        List<Map<String, Object>> children = studentRepo.findByGuardianId(guardian.getId()).stream()
            .map(this::toChildMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("children", children));
    }

    /**
     * POST /api/guardians/telegram/{id}/messages {studentId, text} — ota-ona botdan
     * maktabga xabar yozadi. StudentController#sendMessage bilan bir xil "messages"
     * jadvaliga yoziladi (senderType=GUARDIAN), xodimlar xuddi shu tredni ko'radi/javob beradi.
     * MUHIM: studentId haqiqatan ham shu guardian'ning farzandi ekanligi tekshiriladi —
     * aks holda istalgan ro'yxatdan o'tgan ota-ona boshqa oilaning tredi ichiga yoza olardi.
     */
    @PostMapping("/telegram/{id}/messages")
    public ResponseEntity<?> sendMessage(@RequestHeader(value = "X-Bot-Key", required = false) String botKey,
                                          @PathVariable("id") String telegramUserId,
                                          @RequestBody Map<String, Object> body) {
        if (!isValidBotKey(botKey)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.unknown_caller")));
        }
        if (!botConfigService.isGuardianMessagingEnabled()) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.guardian.messaging_disabled")));
        }
        Guardian guardian = guardianRepo.findByTelegramUserId(telegramUserId);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.not_found")));
        }
        Long studentId = body.get("studentId") != null ? Long.valueOf(body.get("studentId").toString()) : null;
        String text = body.get("text") != null ? body.get("text").toString().trim() : "";
        if (studentId == null || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.guardian.message_fields_required")));
        }
        boolean isOwnChild = studentRepo.findByGuardianId(guardian.getId()).stream()
            .anyMatch(s -> s.getId().equals(studentId));
        if (!isOwnChild) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }

        Message m = new Message();
        m.setStudentId(studentId);
        m.setSenderType(Message.SenderType.GUARDIAN);
        m.setSenderGuardianId(guardian.getId());
        m.setSenderName(guardian.getName());
        m.setText(text);
        messageRepo.save(m);

        return ResponseEntity.ok(Map.of("id", m.getId(), "createdAt", m.getCreatedAt().toString()));
    }

    /**
     * Telefon raqamni formatdan qat'i nazar topadi: avval aniq moslik (tez, indeks bo'yicha),
     * topilmasa — faqat raqamlarga keltirilgan oxirgi 9 xona bo'yicha.
     *
     * Sabab: operator panelga "+998901234567" deb kiritadi, Telegram esa odatda
     * "998901234567" (+ SIZ) yuboradi; ba'zan bo'shliq/tire ham bo'ladi.
     */
    private Guardian findGuardianByPhoneFlexible(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) return null;
        Guardian exact = guardianRepo.findByPhone(rawPhone);
        if (exact != null) return exact;

        String digits = rawPhone.replaceAll("[^0-9]", "");
        if (digits.length() < 9) return null;
        String last9 = digits.substring(digits.length() - 9);
        return guardianRepo.findByPhoneLast9Digits(last9);
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
