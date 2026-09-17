package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.model.Guardian;
import com.maktab.model.Message;
import com.maktab.model.PersonNote;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.MessageRepository;
import com.maktab.repository.PersonNoteRepository;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.JwtUtil;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Ota-ona mobil ilovasi (Flutter) uchun API. Guardian — "users" jadvalidan BUTUNLAY
 * ALOHIDA entity (xodim emas), shuning uchun JwtFilter/CurrentUserService (ular faqat
 * User uchun qurilgan) ISHLATILMAYDI — bu yerda JWT qo'lda tekshiriladi (role=GUARDIAN
 * claim'i bilan), GuardianController#register'dagi "birinchi urinishda parol
 * o'rnatiladi" mantig'i bilan bir xil, lekin Telegram bot o'rniga to'g'ridan-to'g'ri
 * ilova uchun. SecurityConfig'da /api/guardian-app/** permitAll qilingan.
 *
 * MUHIM (bola xavfsizligi): har bir /children/{studentId}/... endpoint chaqiruvchi
 * ota-onaning HAQIQATAN shu bolaga bog'langanligini (assertOwnChild) tekshiradi —
 * aks holda 403. Boshqa ota-onaning farzandi ma'lumotini hech qachon ko'rsatib
 * bo'lmaydi.
 */
@RestController
@RequestMapping("/api/guardian-app")
public class GuardianAppController {

    @Autowired private GuardianRepository guardianRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private PersonNoteRepository noteRepo;
    @Autowired private MessageRepository messageRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private I18nService i18n;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        String phone = body.get("phone") != null ? body.get("phone").toString().trim() : null;
        String password = body.get("password") != null ? body.get("password").toString() : null;
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.guardian.fields_required")));
        }
        Guardian guardian = guardianRepo.findByPhone(phone);
        if (guardian == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.guardian.phone_not_found")));
        }
        // MUHIM (2026-09-18 audit): bu endpoint permitAll (login uchun tabiiy), shuning
        // uchun "parol hali yo'q bo'lsa shu yerda o'rnatiladi" mantig'i XAVFLI edi — telefon
        // raqamini bilgan ISTALGAN kishi (haqiqiy egasi bo'lmasa ham) birinchi bo'lib kirib,
        // o'zi xohlagan parolni qo'yib olishi mumkin edi. Telegram bot orqali ro'yxatdan
        // o'tishda esa telefon Telegram'ning o'zi tomonidan tasdiqlanadi (request_contact),
        // shuning uchun parol FAQAT o'sha yo'l bilan (GuardianController#register,
        // X-Bot-Key bilan himoyalangan) o'rnatiladi. Bu yerda endi parol yo'q bo'lsa,
        // ilovadan foydalanish rad etiladi — avval botda ro'yxatdan o'tish talab qilinadi.
        if (guardian.getPassword() == null || guardian.getPassword().isBlank()) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.guardian.register_via_bot_first")));
        }
        if (!passwordEncoder.matches(password, guardian.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.wrong_password")));
        }
        String token = jwtUtil.generateToken(guardian.getPhone(), "GUARDIAN", guardian.getId());
        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("guardian", Map.of("id", guardian.getId(), "name", guardian.getName(), "phone", guardian.getPhone()));
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        return ResponseEntity.ok(Map.of("id", guardian.getId(), "name", guardian.getName(), "phone", guardian.getPhone()));
    }

    /** Ota-ona o'z ismini yangilaydi — telefon (login identifikatori) bu yerda o'zgartirilmaydi. */
    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                       @RequestBody Map<String, Object> body) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        if (body.get("name") != null && !body.get("name").toString().isBlank()) {
            guardian.setName(body.get("name").toString());
        }
        guardianRepo.save(guardian);
        return ResponseEntity.ok(Map.of("id", guardian.getId(), "name", guardian.getName(), "phone", guardian.getPhone()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestBody Map<String, String> body) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || !passwordEncoder.matches(oldPassword, guardian.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("error", i18n.msg("error.auth.current_password_incorrect")));
        }
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.status(400).body(Map.of("error", i18n.msg("error.auth.new_password_min_length")));
        }
        guardian.setPassword(passwordEncoder.encode(newPassword));
        guardianRepo.save(guardian);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.password_changed")));
    }

    @GetMapping("/children")
    public ResponseEntity<?> children(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        List<Student> kids = studentRepo.findByGuardianId(guardian.getId());
        return ResponseEntity.ok(kids.stream().map(this::toChildMap).collect(Collectors.toList()));
    }

    @GetMapping("/children/{studentId}/attendance")
    public ResponseEntity<?> childAttendance(@PathVariable Long studentId,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        ResponseEntity<?> ownErr = assertOwnChild(guardian, studentId);
        if (ownErr != null) return ownErr;

        List<Attendance> events = attendanceRepo.findByStudentId(studentId);
        return ResponseEntity.ok(events.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("timestamp", a.getTimestamp() != null ? a.getTimestamp().toString() : null);
            m.put("type", a.getType() != null ? a.getType().name() : null);
            return m;
        }).collect(Collectors.toList()));
    }

    @GetMapping("/children/{studentId}/notes")
    public ResponseEntity<?> childNotes(@PathVariable Long studentId,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        ResponseEntity<?> ownErr = assertOwnChild(guardian, studentId);
        if (ownErr != null) return ownErr;

        List<PersonNote> notes = noteRepo.findByPersonTypeAndPersonIdOrderByCreatedAtDesc(PersonNote.PersonType.STUDENT, studentId);
        return ResponseEntity.ok(notes.stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.getId());
            m.put("authorName", n.getAuthorName());
            m.put("text", n.getText());
            m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
            return m;
        }).collect(Collectors.toList()));
    }

    @GetMapping("/children/{studentId}/messages")
    public ResponseEntity<?> childMessages(@PathVariable Long studentId,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        ResponseEntity<?> ownErr = assertOwnChild(guardian, studentId);
        if (ownErr != null) return ownErr;

        List<Message> messages = messageRepo.findByStudentIdOrderByCreatedAtAsc(studentId);
        return ResponseEntity.ok(messages.stream().map(this::toMessageMap).collect(Collectors.toList()));
    }

    @PostMapping("/children/{studentId}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long studentId,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        Guardian guardian = resolveGuardian(authHeader);
        if (guardian == null) return unauthorized();
        ResponseEntity<?> ownErr = assertOwnChild(guardian, studentId);
        if (ownErr != null) return ownErr;

        String text = body.get("text") != null ? body.get("text").toString().trim() : "";
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.note.text_required")));
        }
        Message m = new Message();
        m.setStudentId(studentId);
        m.setSenderType(Message.SenderType.GUARDIAN);
        m.setSenderGuardianId(guardian.getId());
        m.setSenderName(guardian.getName() != null && !guardian.getName().isBlank() ? guardian.getName() : guardian.getPhone());
        m.setText(text);
        messageRepo.save(m);
        return ResponseEntity.ok(toMessageMap(m));
    }

    // ── Yordamchilar ──

    private Guardian resolveGuardian(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        if (!"GUARDIAN".equals(jwtUtil.getRoleFromToken(token))) return null;
        String phone = jwtUtil.getUsernameFromToken(token);
        return guardianRepo.findByPhone(phone);
    }

    private ResponseEntity<?> assertOwnChild(Guardian guardian, Long studentId) {
        boolean owns = studentRepo.findByGuardianId(guardian.getId()).stream()
                .anyMatch(s -> s.getId().equals(studentId));
        if (!owns) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        return null;
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.token_invalid")));
    }

    private Map<String, Object> toChildMap(Student s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("fullName", s.getFullName());
        m.put("photoUrl", s.getPhotoUrl());
        m.put("faceId", s.getFaceId());
        m.put("schoolName", s.getSchool() != null ? s.getSchool().getName() : null);
        if (s.getClassId() != null) {
            classRepo.findById(s.getClassId()).ifPresent(c -> m.put("className", c.getName()));
        }
        return m;
    }

    private Map<String, Object> toMessageMap(Message m) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", m.getId());
        map.put("senderType", m.getSenderType() != null ? m.getSenderType().name() : null);
        map.put("senderName", m.getSenderName());
        map.put("text", m.getText());
        map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        return map;
    }
}
