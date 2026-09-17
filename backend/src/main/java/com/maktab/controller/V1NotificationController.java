package com.maktab.controller;

import com.maktab.model.Notification;
import com.maktab.model.User;
import com.maktab.repository.NotificationRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/notifications/* kontrakti. Mavjud /api/notifications
 * (NotificationController) o'zgarishsiz qoladi — bu yerda xuddi shu Notification
 * entity/repository qayta ishlatiladi.
 *
 * Frontend A'ning notificationsSlice.js kodi javobni to'g'ridan-to'g'ri massiv deb
 * kutadi (`Array.isArray(action.payload) ? action.payload : []`), shu sabab GET
 * {notifications,unreadCount,total} obyekti emas, YALANG'OCH ro'yxat qaytaradi.
 *
 * MUHIM: avval bu yerda "token bo'lmasa/yaroqsiz bo'lsa hammasini qaytar" degan fallback
 * bor edi (xavfsizlik auditida landmine sifatida topilgan — hozircha SecurityConfig bu yo'lni
 * permitAll qilmagani uchun ishlamaydi, lekin kelajakda SecurityConfig o'zgarsa data leak
 * bo'lishi mumkin edi). Endi boshqa V1*Controller'lar bilan bir xil uslubda —
 * CurrentUserService#requireUser orqali HAR DOIM 401 tashlanadi, fallback yo'q.
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class V1NotificationController {

    @Autowired private NotificationRepository notifRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    @GetMapping("/")
    public List<Map<String, Object>> getNotifications(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        List<Notification> list = notifRepo.findForUser(user.getId(), user.getRole().name());
        return list.stream().map(this::toMap).collect(Collectors.toList());
    }

    @PatchMapping("/{id}/read/")
    public ResponseEntity<?> markRead(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Notification n = notifRepo.findById(id).orElse(null);
        if (n == null) return ResponseEntity.notFound().build();
        if (!currentUserService.isSuperAdmin(caller) && caller.getRole() != User.Role.ADMIN
                && !(n.getUserId() != null && n.getUserId().equals(caller.getId()))) {
            return ResponseEntity.status(403).body(Map.of("detail", i18n.msg("error.notification.not_yours")));
        }
        n.setIsRead(true);
        notifRepo.save(n);
        return ResponseEntity.ok(toMap(n));
    }

    @PostMapping("/mark-all-read/")
    public ResponseEntity<?> markAllRead(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        notifRepo.markAllReadForUser(user.getId(), user.getRole().name());
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("title", n.getTitle());
        m.put("message", n.getMessage());
        m.put("type", n.getType() != null ? n.getType().name() : null);
        m.put("notification_type", n.getType() != null ? n.getType().name().toLowerCase() : null);
        m.put("level", n.getLevel() != null ? n.getLevel().name() : null);
        m.put("isRead", n.getIsRead());
        m.put("is_read", n.getIsRead());
        m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        m.put("created_at", n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        m.put("relatedEntity", n.getRelatedEntity());
        m.put("relatedId", n.getRelatedId());
        m.put("schoolId", n.getSchoolId());
        return m;
    }
}
