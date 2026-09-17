package com.maktab.controller;

import com.maktab.model.Notification;
import com.maktab.model.User;
import com.maktab.repository.NotificationRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired private NotificationRepository notifRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    /**
     * Foydalanuvchi bildirishnomalarini olish
     * GET /api/notifications?userId=1&role=SUPERADMIN&limit=50
     * MUHIM: userId/role endi client'dan ishonch bilan qabul qilinmaydi — Authorization
     * headerdagi JWT orqali aniqlangan HAQIQIY foydalanuvchi ishlatiladi. Faqat SUPERADMIN
     * boshqa userId/role bo'yicha ixtiyoriy so'rov qilishi mumkin (to'liq huquqli bo'lgani uchun).
     */
    @GetMapping
    public Map<String, Object> getNotifications(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "50") int limit) {

        User user = currentUserService.requireUser(authHeader);
        Long effectiveUserId = user.getId();
        String effectiveRole = user.getRole().name();
        if (currentUserService.isSuperAdmin(user)) {
            if (userId != null) effectiveUserId = userId;
            if (role != null) effectiveRole = role;
        }

        List<Notification> all = notifRepo.findForUser(effectiveUserId, effectiveRole);
        long unread = notifRepo.countUnreadForUser(effectiveUserId, effectiveRole);

        List<Map<String, Object>> items = all.stream()
            .limit(limit)
            .map(this::toMap)
            .collect(Collectors.toList());

        return Map.of(
            "notifications", items,
            "unreadCount", unread,
            "total", all.size()
        );
    }

    /**
     * O'qilmagan bildirishnomalar soni
     * GET /api/notifications/unread-count?userId=1&role=SUPERADMIN
     */
    @GetMapping("/unread-count")
    public Map<String, Object> getUnreadCount(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role) {
        User user = currentUserService.requireUser(authHeader);
        Long effectiveUserId = user.getId();
        String effectiveRole = user.getRole().name();
        if (currentUserService.isSuperAdmin(user)) {
            if (userId != null) effectiveUserId = userId;
            if (role != null) effectiveRole = role;
        }
        long count = notifRepo.countUnreadForUser(effectiveUserId, effectiveRole);
        return Map.of("unreadCount", count);
    }

    /**
     * Bitta bildirishnomani o'qilgan deb belgilash
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Notification n = notifRepo.findById(id).orElse(null);
        if (n == null) return ResponseEntity.notFound().build();
        if (!currentUserService.isSuperAdmin(caller) && caller.getRole() != User.Role.ADMIN
                && !(n.getUserId() != null && n.getUserId().equals(caller.getId()))) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.notification.not_yours")));
        }
        n.setIsRead(true);
        notifRepo.save(n);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Barcha bildirishnomalarni o'qilgan deb belgilash
     * PUT /api/notifications/read-all?userId=1&role=SUPERADMIN
     */
    @PutMapping("/read-all")
    public Map<String, Object> markAllRead(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role) {
        User user = currentUserService.requireUser(authHeader);
        Long effectiveUserId = user.getId();
        String effectiveRole = user.getRole().name();
        if (currentUserService.isSuperAdmin(user)) {
            if (userId != null) effectiveUserId = userId;
            if (role != null) effectiveRole = role;
        }
        notifRepo.markAllReadForUser(effectiveUserId, effectiveRole);
        return Map.of("success", true);
    }

    /**
     * Yangi bildirishnoma yaratish (tizimdan ichki chaqiriq uchun)
     * POST /api/notifications
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        if (!currentUserService.isUnrestrictedAdmin(caller)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.notification.create_forbidden")));
        }
        Notification n = new Notification();
        n.setTitle((String) body.get("title"));
        n.setMessage((String) body.get("message"));
        n.setType(Notification.NotificationType.valueOf(
            body.getOrDefault("type", "SYSTEM").toString()));
        n.setLevel(Notification.NotificationLevel.valueOf(
            body.getOrDefault("level", "INFO").toString()));
        n.setUserId(body.get("userId") != null ? Long.valueOf(body.get("userId").toString()) : null);
        n.setTargetRole(body.get("targetRole") != null ? body.get("targetRole").toString() : null);
        n.setSchoolId(body.get("schoolId") != null ? Long.valueOf(body.get("schoolId").toString()) : null);
        n.setRelatedEntity(body.get("relatedEntity") != null ? body.get("relatedEntity").toString() : null);
        n.setRelatedId(body.get("relatedId") != null ? Long.valueOf(body.get("relatedId").toString()) : null);
        n.setIsRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notifRepo.save(n);
        return ResponseEntity.ok(toMap(n));
    }

    /**
     * Bildirishnomani o'chirish
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Notification n = notifRepo.findById(id).orElse(null);
        if (n == null) return ResponseEntity.notFound().build();
        if (!currentUserService.isSuperAdmin(caller) && caller.getRole() != User.Role.ADMIN
                && !(n.getUserId() != null && n.getUserId().equals(caller.getId()))) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.notification.not_yours")));
        }
        notifRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("title", n.getTitle());
        m.put("message", n.getMessage());
        m.put("type", n.getType().name());
        m.put("level", n.getLevel().name());
        m.put("isRead", n.getIsRead());
        m.put("createdAt", n.getCreatedAt().toString());
        m.put("relatedEntity", n.getRelatedEntity());
        m.put("relatedId", n.getRelatedId());
        m.put("schoolId", n.getSchoolId());
        return m;
    }
}
