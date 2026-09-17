package com.maktab.controller;

import com.maktab.model.BroadcastLog;
import com.maktab.model.Guardian;
import com.maktab.model.Message;
import com.maktab.model.School;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.BroadcastLogRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.MessageRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.BotConfigService;
import com.maktab.service.I18nService;
import com.maktab.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin panel — Telegram bot orqali ota-onalarga ommaviy xabar (broadcast) yuborish va
 * bir nechta o'quvchi bo'yicha xabar tredlarini (Message, StudentController bilan bir xil
 * jadval) bitta ro'yxatga yig'ish. /api/admin/** OSTIDA EMAS (u SecurityConfig'da blanket
 * SUPERADMIN-only) — DIRECTOR/MUDIR ham o'z maktabi doirasida ishlata olishi kerak, shuning
 * uchun ruxsat CurrentUserService orqali shu controller ichida tekshiriladi.
 */
@RestController
@RequestMapping("/api/bot")
public class BroadcastController {

    @Autowired private GuardianRepository guardianRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private MessageRepository messageRepo;
    @Autowired private BroadcastLogRepository broadcastLogRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private NotificationService notificationService;
    @Autowired private BotConfigService botConfigService;
    @Autowired private I18nService i18n;

    /** Broadcast va xabarlar qutisi — faqat shu rollar (foydalanuvchi tasdiqlagan ruxsat ko'lami). */
    private void assertCanUseBotPanel(User user) {
        if (user.getRole() != User.Role.SUPERADMIN && user.getRole() != User.Role.ADMIN
                && user.getRole() != User.Role.DIRECTOR && user.getRole() != User.Role.MUDIR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.broadcast.forbidden"));
        }
    }

    /**
     * POST /api/bot/broadcast {schoolId?, text} — SUPERADMIN/ADMIN schoolId bermasa butun
     * tizimga, bersa shu maktabga; DIRECTOR/MUDIR har doim faqat o'z maktabiga (client
     * yuborgan schoolId'dan qat'i nazar — CurrentUserService.resolveSchoolScope naqshi).
     */
    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcast(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        assertCanUseBotPanel(user);
        if (!botConfigService.isBroadcastEnabled()) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.broadcast.disabled")));
        }
        String text = body.get("text") != null ? body.get("text").toString().trim() : "";
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.broadcast.text_required")));
        }
        Long requestedSchoolId = body.get("schoolId") != null ? Long.valueOf(body.get("schoolId").toString()) : null;
        List<Long> scope = currentUserService.resolveSchoolScope(user, requestedSchoolId);

        List<Guardian> recipients = scope == null
            ? guardianRepo.findAllBroadcastRecipients()
            : guardianRepo.findBroadcastRecipientsBySchoolIds(scope);

        int sentCount = notificationService.broadcastToGuardians(recipients, text);

        Long logSchoolId = (scope != null && scope.size() == 1) ? scope.get(0) : null;
        String logSchoolName = null;
        if (logSchoolId != null) {
            School school = schoolRepo.findById(logSchoolId).orElse(null);
            logSchoolName = school != null ? school.getName() : null;
        }

        BroadcastLog log = new BroadcastLog();
        log.setSentByUserId(user.getId());
        log.setSentByName(user.getFullName());
        log.setSchoolId(logSchoolId);
        log.setSchoolName(logSchoolName);
        log.setText(text);
        log.setRecipientCount(sentCount);
        broadcastLogRepo.save(log);

        return ResponseEntity.ok(Map.of(
            "recipientCount", sentCount,
            "message", i18n.msg("success.broadcast.sent", sentCount)
        ));
    }

    /** GET /api/bot/broadcast/history — o'tgan broadcastlar (audit). Ko'lam cheklovi bilan. */
    @GetMapping("/broadcast/history")
    public ResponseEntity<?> broadcastHistory(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        assertCanUseBotPanel(user);
        List<Long> scope = currentUserService.allowedSchoolIds(user);

        List<BroadcastLog> logs = scope == null
            ? broadcastLogRepo.findAllByOrderByCreatedAtDesc()
            : broadcastLogRepo.findAllByOrderByCreatedAtDesc().stream()
                .filter(l -> l.getSchoolId() == null ? false : scope.contains(l.getSchoolId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(logs.stream().map(this::toLogMap).collect(Collectors.toList()));
    }

    /**
     * GET /api/bot/messages?schoolId= — ko'lamdagi barcha o'quvchilarning xabar tredlarini
     * bitta ro'yxatga yig'adi (har biri uchun oxirgi xabar + o'qilmagan sanog'i). Javob berish
     * uchun MAVJUD POST /api/students/{id}/messages ishlatiladi (yangi endpoint kerak emas).
     */
    @GetMapping("/messages")
    public ResponseEntity<?> inbox(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                    @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        assertCanUseBotPanel(user);
        List<Long> scope = currentUserService.resolveSchoolScope(user, schoolId);

        List<Student> students = scope == null ? studentRepo.findAll() : studentRepo.findBySchoolIdIn(scope);
        if (students.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        Map<Long, Student> studentsById = students.stream()
            .collect(Collectors.toMap(Student::getId, s -> s));
        List<Long> studentIds = new ArrayList<>(studentsById.keySet());

        List<Message> messages = messageRepo.findByStudentIdInOrderByCreatedAtDesc(studentIds);
        Map<Long, List<Message>> byStudent = messages.stream()
            .collect(Collectors.groupingBy(Message::getStudentId, LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> threads = new ArrayList<>();
        for (Map.Entry<Long, List<Message>> entry : byStudent.entrySet()) {
            Student student = studentsById.get(entry.getKey());
            if (student == null) continue;
            Message last = entry.getValue().get(0); // DESC tartibda birinchisi — eng oxirgi
            long unread = messageRepo.countByStudentIdAndSenderTypeAndReadAtIsNull(
                entry.getKey(), Message.SenderType.GUARDIAN);

            Map<String, Object> t = new LinkedHashMap<>();
            t.put("studentId", student.getId());
            t.put("studentName", student.getFullName());
            t.put("schoolId", student.getSchool() != null ? student.getSchool().getId() : null);
            t.put("schoolName", student.getSchool() != null ? student.getSchool().getName() : null);
            t.put("lastMessage", last.getText());
            t.put("lastMessageAt", last.getCreatedAt().toString());
            t.put("lastSenderType", last.getSenderType().name());
            t.put("unreadCount", unread);
            threads.add(t);
        }
        threads.sort((a, b) -> ((String) b.get("lastMessageAt")).compareTo((String) a.get("lastMessageAt")));

        return ResponseEntity.ok(threads);
    }

    private Map<String, Object> toLogMap(BroadcastLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("sentByName", l.getSentByName());
        m.put("schoolId", l.getSchoolId());
        m.put("schoolName", l.getSchoolName());
        m.put("text", l.getText());
        m.put("recipientCount", l.getRecipientCount());
        m.put("createdAt", l.getCreatedAt().toString());
        return m;
    }
}
