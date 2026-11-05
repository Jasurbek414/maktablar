package com.maktab.controller;

import com.maktab.model.Notification;
import com.maktab.model.User;
import com.maktab.repository.NotificationRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.JwtUtil;
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
 * Foydalanuvchi Authorization: Bearer JWT orqali aniqlanadi (V1AuthController'dagi
 * bilan bir xil uslub — bu yerda ham servis qatlami yo'q, shuning uchun kichik
 * takrorlanish qabul qilinadi). Token bo'lmasa/yaroqsiz bo'lsa, GET uchun barcha
 * bildirishnomalar qaytariladi (soddalashtirish, chunki hali /api/v1/** uchun
 * haqiqiy JWT scoping ulanmagan — buni boshqa vazifa qiladi).
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class V1NotificationController {

    @Autowired private NotificationRepository notifRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private JwtUtil jwtUtil;

    @GetMapping("/")
    public List<Map<String, Object>> getNotifications(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        List<Notification> list;
        if (user != null) {
            list = notifRepo.findForUser(user.getId(), user.getRole().name());
        } else {
            // Auth hali ulanmagan bo'lishi mumkin — fallback sifatida hammasini qaytaramiz.
            list = notifRepo.findAll();
            list.sort(Comparator.comparing(Notification::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        }
        return list.stream().map(this::toMap).collect(Collectors.toList());
    }

    @PatchMapping("/{id}/read/")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return notifRepo.findById(id).map(n -> {
            n.setIsRead(true);
            notifRepo.save(n);
            return ResponseEntity.ok(toMap(n));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/mark-all-read/")
    public ResponseEntity<?> markAllRead(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("detail", "Autentifikatsiya talab qilinadi"));
        }
        notifRepo.markAllReadForUser(user.getId(), user.getRole().name());
        return ResponseEntity.ok(Map.of("success", true));
    }

    private User resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        String username = jwtUtil.getUsernameFromToken(token);
        return userRepo.findByUsername(username).orElse(null);
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
