package com.maktab.controller;

import com.maktab.model.AbsenceRequest;
import com.maktab.model.Guardian;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.AbsenceRequestRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import com.maktab.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Xodim tomoni: ota-onalarning ruxsat so'rovlarini ko'rish va tasdiqlash/rad etish.
 *
 * Ota-ona tomoni ATAYLAB bu yerda emas — u {@code GuardianAppController}da, chunki
 * Guardian `users` jadvalidan butunlay alohida entity va {@link CurrentUserService}
 * GUARDIAN tokenini ataylab rad etadi.
 *
 * Ko'lam qoidasi:
 *  - SUPERADMIN/ADMIN/REGION_DIRECTOR/DISTRICT_DIRECTOR/DIRECTOR/MUDIR — maktab darajasida.
 *  - TEACHER — faqat o'zi sinf rahbari bo'lgan sinflarning so'rovlari. Tasdiqlash huquqi
 *    ham beriladi: `assertCanWriteSchoolData` TEACHER'ni umuman rad etadi, lekin o'z
 *    sinfining ruxsat so'rovini ko'rib chiqish o'qituvchining asosiy ish oqimi, shuning
 *    uchun bu yerda ATAYLAB kengaytirilgan (boshqa yozuv amallariga bu ta'sir qilmaydi).
 */
@RestController
@RequestMapping("/api/absence-requests")
public class AbsenceRequestController {

    private static final Logger log = LoggerFactory.getLogger(AbsenceRequestController.class);

    @Autowired private AbsenceRequestRepository requestRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private GuardianRepository guardianRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private NotificationService notificationService;
    @Autowired private I18nService i18n;

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                   @RequestParam(required = false) Long schoolId,
                                   @RequestParam(required = false) String status) {
        User user = currentUserService.requireUser(authHeader);

        List<AbsenceRequest> list;
        List<Long> classScope = currentUserService.allowedClassIds(user);
        if (classScope != null) {
            // TEACHER — faqat o'z sinflari.
            list = classScope.isEmpty()
                ? new ArrayList<>()
                : new ArrayList<>(requestRepo.findByClassIdInOrderByCreatedAtDesc(classScope));
        } else {
            List<Long> scope = currentUserService.resolveSchoolScope(user, schoolId);
            if (scope == null) {
                list = new ArrayList<>(requestRepo.findAll());
            } else if (scope.isEmpty()) {
                list = new ArrayList<>();
            } else {
                list = new ArrayList<>();
                for (Long sid : scope) list.addAll(requestRepo.findBySchoolIdOrderByCreatedAtDesc(sid));
            }
            list.sort(Comparator.comparing(AbsenceRequest::getCreatedAt,
                    Comparator.nullsLast(Comparator.reverseOrder())));
        }

        if (status != null && !status.isBlank()) {
            AbsenceRequest.Status wanted = parseStatus(status);
            if (wanted == null) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.absence.invalid_status")));
            }
            list = list.stream().filter(r -> r.getStatus() == wanted).collect(Collectors.toList());
        }

        return ResponseEntity.ok(toMaps(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        AbsenceRequest r = requestRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        ResponseEntity<?> denied = assertCanSee(user, r);
        if (denied != null) return denied;
        return ResponseEntity.ok(toMaps(List.of(r)).get(0));
    }

    /**
     * Tasdiqlash yoki rad etish.
     * Body: {"status": "APPROVED"|"REJECTED", "note": "ixtiyoriy izoh"}
     */
    @PostMapping("/{id}/review")
    public ResponseEntity<?> review(@PathVariable Long id,
                                     @RequestBody Map<String, Object> body,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        AbsenceRequest r = requestRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();

        ResponseEntity<?> denied = assertCanReview(user, r);
        if (denied != null) return denied;

        AbsenceRequest.Status newStatus =
            parseStatus(body.get("status") != null ? body.get("status").toString() : null);
        if (newStatus == null || newStatus == AbsenceRequest.Status.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.absence.invalid_status")));
        }

        Object rawNote = body.containsKey("note") ? body.get("note") : body.get("reviewNote");
        String note = rawNote != null ? rawNote.toString().trim() : null;

        r.setStatus(newStatus);
        r.setReviewNote(note == null || note.isEmpty() ? null : note);
        r.setReviewedByUserId(user.getId());
        r.setReviewedByName(user.getFullName());
        r.setReviewedAt(OffsetDateTime.now());
        requestRepo.save(r);

        notifyGuardian(r);

        return ResponseEntity.ok(toMaps(List.of(r)).get(0));
    }

    // ── ruxsat tekshiruvlari ──

    /** Ko'rish huquqi: maktab ko'lami + (TEACHER bo'lsa) o'z sinfi. */
    private ResponseEntity<?> assertCanSee(User user, AbsenceRequest r) {
        if (!currentUserService.canAccessSchool(user, r.getSchoolId())) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.school.access_denied")));
        }
        List<Long> classScope = currentUserService.allowedClassIds(user);
        if (classScope != null && (r.getClassId() == null || !classScope.contains(r.getClassId()))) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.class.access_denied")));
        }
        return null;
    }

    /**
     * Ko'rib chiqish huquqi: ko'rish huquqi + yozish huquqi.
     * TEACHER uchun assertCanSee allaqachon "bu mening sinfim" ekanini tasdiqlagan,
     * shuning uchun qo'shimcha talab qo'yilmaydi.
     */
    private ResponseEntity<?> assertCanReview(User user, AbsenceRequest r) {
        ResponseEntity<?> denied = assertCanSee(user, r);
        if (denied != null) return denied;
        if (user.getRole() == User.Role.TEACHER) return null;
        if (!currentUserService.canWriteSchoolData(user, r.getSchoolId())) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.school_data.write_denied")));
        }
        return null;
    }

    // ── yordamchi metodlar ──

    static AbsenceRequest.Status parseStatus(String raw) {
        if (raw == null) return null;
        try {
            return AbsenceRequest.Status.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Ota-onaga Telegram orqali natijani xabar qiladi. Xabar yetkazilmasligi (Telegram ID
     * yo'q, bildirishnoma o'chirilgan yoki bot javob bermayapti) ko'rib chiqish natijasini
     * BEKOR QILMASLIGI kerak — shuning uchun xato ushlanadi va faqat logga tushadi.
     */
    private void notifyGuardian(AbsenceRequest r) {
        try {
            Student s = studentRepo.findById(r.getStudentId()).orElse(null);
            if (s == null) return;
            Guardian g = guardianRepo.findById(r.getCreatedByGuardianId()).orElse(null);
            if (g == null || g.getTelegramUserId() == null
                    || !Boolean.TRUE.equals(g.getNotificationsEnabled())) {
                return;
            }
            String verdict = r.getStatus() == AbsenceRequest.Status.APPROVED
                ? "TASDIQLANDI" : "RAD ETILDI";
            StringBuilder sb = new StringBuilder();
            sb.append("Ruxsat so'rovingiz ").append(verdict).append(".\n\n")
              .append("O'quvchi: ").append(s.getFullName()).append('\n')
              .append("Sana: ").append(r.getStartDate()).append(" — ").append(r.getEndDate());
            if (r.getReviewNote() != null && !r.getReviewNote().isBlank()) {
                sb.append("\nIzoh: ").append(r.getReviewNote());
            }
            notificationService.broadcastToGuardians(List.of(g), sb.toString());
        } catch (Exception e) {
            log.warn("Ruxsat so'rovi natijasi ota-onaga yuborilmadi (so'rov {}): {}", r.getId(), e.toString());
        }
    }

    private List<Map<String, Object>> toMaps(List<AbsenceRequest> list) {
        if (list.isEmpty()) return Collections.emptyList();

        Set<Long> studentIds = list.stream().map(AbsenceRequest::getStudentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Student> students = studentRepo.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, s -> s));

        Set<Long> classIds = list.stream().map(AbsenceRequest::getClassId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> classNames = classRepo.findAllById(classIds).stream()
                .collect(Collectors.toMap(SchoolClass::getId, SchoolClass::getName));

        return list.stream()
                .map(r -> toMap(r, students.get(r.getStudentId()), classNames.get(r.getClassId())))
                .collect(Collectors.toList());
    }

    /**
     * Javob shakli `mobile/lib/models/models.dart#AbsenceRequest.fromJson` bilan AYNAN mos
     * bo'lishi SHART — ilova allaqachon shu maydonlarni o'qiydi.
     */
    static Map<String, Object> toMap(AbsenceRequest r, Student student, String className) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("studentId", r.getStudentId());
        m.put("studentName", student != null ? student.getFullName() : "");
        m.put("className", className);
        m.put("startDate", r.getStartDate() != null ? r.getStartDate().toString() : null);
        m.put("endDate", r.getEndDate() != null ? r.getEndDate().toString() : null);
        m.put("reasonType", r.getReasonType() != null ? r.getReasonType().name() : "OTHER");
        m.put("reasonText", r.getReasonText());
        m.put("attachmentUrl", r.getAttachmentUrl());
        m.put("status", r.getStatus() != null ? r.getStatus().name() : "PENDING");
        m.put("reviewNote", r.getReviewNote());
        m.put("reviewedBy", r.getReviewedByName());
        m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        return m;
    }
}
