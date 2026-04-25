package com.maktab.controller;

import com.maktab.model.Notification;
import com.maktab.repository.NotificationRepository;
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

    /**
     * Foydalanuvchi bildirishnomalarini olish
     * GET /api/notifications?userId=1&role=SUPERADMIN&limit=50
     */
    @GetMapping
    public Map<String, Object> getNotifications(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "SUPERADMIN") String role,
            @RequestParam(defaultValue = "50") int limit) {

        List<Notification> all = notifRepo.findForUser(userId, role);
        long unread = notifRepo.countUnreadForUser(userId, role);

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
            @RequestParam Long userId,
            @RequestParam(defaultValue = "SUPERADMIN") String role) {
        long count = notifRepo.countUnreadForUser(userId, role);
        return Map.of("unreadCount", count);
    }

    /**
     * Bitta bildirishnomani o'qilgan deb belgilash
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return notifRepo.findById(id).map(n -> {
            n.setIsRead(true);
            notifRepo.save(n);
            return ResponseEntity.ok(Map.of("success", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Barcha bildirishnomalarni o'qilgan deb belgilash
     * PUT /api/notifications/read-all?userId=1&role=SUPERADMIN
     */
    @PutMapping("/read-all")
    public Map<String, Object> markAllRead(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "SUPERADMIN") String role) {
        notifRepo.markAllReadForUser(userId, role);
        return Map.of("success", true);
    }

    /**
     * Yangi bildirishnoma yaratish (tizimdan ichki chaqiriq uchun)
     * POST /api/notifications
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
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
    public ResponseEntity<?> delete(@PathVariable Long id) {
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
