package com.maktab.controller;

import com.maktab.model.Camera;
import com.maktab.model.CameraEvent;
import com.maktab.model.User;
import com.maktab.repository.CameraEventRepository;
import com.maktab.repository.CameraRepository;
import com.maktab.security.CurrentUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Kameralar bo'yicha kesib o'tuvchi (cross-camera) hodisa ko'rinishlari — "Kamera
 * tahlili" (event log) va "AI tahlili" (/stats agregatsiyasi) sahifalarini
 * ta'minlaydi. Haqiqiy computer-vision YO'Q — bu CameraEvent jadvalidan hisoblangan
 * haqiqiy statistika, faqat manba qo'lda qayd etilgan hodisalar.
 */
@RestController
@RequestMapping("/api/camera-events")
public class CameraEventController {

    @Autowired private CameraEventRepository eventRepo;
    @Autowired private CameraRepository cameraRepo;
    @Autowired private CurrentUserService currentUserService;

    @GetMapping
    public List<Map<String, Object>> getAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long cameraId,
            @RequestParam(required = false) Boolean resolved,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user); // null => cheklovsiz

        List<CameraEvent> events;
        if (schoolId != null) {
            currentUserService.assertCanAccessSchool(user, schoolId);
            events = eventRepo.findBySchoolIdInOrderByOccurredAtDesc(List.of(schoolId));
        } else if (scope == null) {
            events = eventRepo.findAllByOrderByOccurredAtDesc();
        } else if (scope.isEmpty()) {
            events = Collections.emptyList();
        } else {
            events = eventRepo.findBySchoolIdInOrderByOccurredAtDesc(scope);
        }

        if (cameraId != null) {
            events = events.stream()
                .filter(e -> e.getCamera() != null && cameraId.equals(e.getCamera().getId()))
                .collect(Collectors.toList());
        }
        if (type != null && !type.isBlank()) {
            CameraEvent.CameraEventType t = parseType(type);
            if (t != null) events = events.stream().filter(e -> e.getType() == t).collect(Collectors.toList());
        }
        if (severity != null && !severity.isBlank()) {
            CameraEvent.EventSeverity s = parseSeverity(severity);
            if (s != null) events = events.stream().filter(e -> e.getSeverity() == s).collect(Collectors.toList());
        }
        if (resolved != null) {
            events = events.stream().filter(e -> resolved.equals(e.getResolved())).collect(Collectors.toList());
        }
        OffsetDateTime fromDt = parseDate(from);
        if (fromDt != null) {
            events = events.stream()
                .filter(e -> e.getOccurredAt() != null && !e.getOccurredAt().isBefore(fromDt))
                .collect(Collectors.toList());
        }
        OffsetDateTime toDt = parseDate(to);
        if (toDt != null) {
            events = events.stream()
                .filter(e -> e.getOccurredAt() != null && !e.getOccurredAt().isAfter(toDt))
                .collect(Collectors.toList());
        }

        return events.stream().map(this::toEventMap).collect(Collectors.toList());
    }

    /** Hodisani hal qilingan/qilinmagan deb belgilash yoki tavsifini tahrirlash. */
    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return eventRepo.findById(id).map(e -> {
            Long schoolId = e.getSchool() != null ? e.getSchool().getId() : null;
            currentUserService.assertCanAccessSchool(caller, schoolId);
            if (body.containsKey("resolved")) {
                e.setResolved(Boolean.TRUE.equals(body.get("resolved")));
            }
            if (body.containsKey("description")) {
                e.setDescription((String) body.get("description"));
            }
            if (body.containsKey("severity") && body.get("severity") != null) {
                CameraEvent.EventSeverity s = parseSeverity(body.get("severity").toString());
                if (s != null) e.setSeverity(s);
            }
            eventRepo.save(e);
            return ResponseEntity.ok(toEventMap(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * "AI tahlili" sahifasini quvvatlaydigan agregatsiya. Ko'lam ichidagi (yoki
     * cheklovsiz) hodisalarni so'ralgan kunlar oralig'ida bir marta olib, keyin
     * turlar/darajalar/kunlik trend/eng ko'p hodisali kameralar bo'yicha guruhlaydi —
     * V1ReportsController'dagi "sodda, izohlangan hisob-kitob" konvensiyasiga mos
     * (bu tizimda hodisalar qo'lda qayd etiladi, hajm katta emas — murakkab GROUP BY
     * SQL o'rniga bitta so'rov + Java'da guruhlash yetarli va kod jihatdan soddaroq).
     */
    @GetMapping("/stats")
    public Map<String, Object> stats(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Integer days) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user);
        int d = (days != null && days > 0) ? days : 30;

        OffsetDateTime to = OffsetDateTime.now();
        OffsetDateTime from = to.minusDays(d);

        List<CameraEvent> events;
        if (scope == null) {
            events = eventRepo.findByDateRange(from, to);
        } else if (scope.isEmpty()) {
            events = Collections.emptyList();
        } else {
            events = eventRepo.findBySchoolsAndDateRange(scope, from, to);
        }

        long totalEvents = events.size();
        long unresolvedCount = events.stream().filter(e -> !Boolean.TRUE.equals(e.getResolved())).count();

        Map<String, Long> byType = new LinkedHashMap<>();
        for (CameraEvent.CameraEventType t : CameraEvent.CameraEventType.values()) byType.put(t.name(), 0L);
        for (CameraEvent e : events) {
            if (e.getType() != null) byType.merge(e.getType().name(), 1L, Long::sum);
        }

        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (CameraEvent.EventSeverity s : CameraEvent.EventSeverity.values()) bySeverity.put(s.name(), 0L);
        for (CameraEvent e : events) {
            if (e.getSeverity() != null) bySeverity.merge(e.getSeverity().name(), 1L, Long::sum);
        }

        Map<LocalDate, Long> countsByDay = events.stream()
            .filter(e -> e.getOccurredAt() != null)
            .collect(Collectors.groupingBy(e -> e.getOccurredAt().toLocalDate(), Collectors.counting()));
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        for (int i = d - 1; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", day.toString());
            point.put("count", countsByDay.getOrDefault(day, 0L));
            dailyTrend.add(point);
        }

        Map<Long, Long> countByCamera = events.stream()
            .filter(e -> e.getCamera() != null)
            .collect(Collectors.groupingBy(e -> e.getCamera().getId(), Collectors.counting()));
        List<Map<String, Object>> topCameras = countByCamera.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
            .limit(5)
            .map(en -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("cameraId", en.getKey());
                m.put("cameraName", cameraRepo.findById(en.getKey()).map(Camera::getName).orElse("—"));
                m.put("count", en.getValue());
                return m;
            }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEvents", totalEvents);
        result.put("unresolvedCount", unresolvedCount);
        result.put("byType", byType);
        result.put("bySeverity", bySeverity);
        result.put("dailyTrend", dailyTrend);
        result.put("topCameras", topCameras);
        return result;
    }

    // ── Yordamchi metodlar ──

    private CameraEvent.CameraEventType parseType(String raw) {
        try { return CameraEvent.CameraEventType.valueOf(raw.toUpperCase()); } catch (Exception e) { return null; }
    }

    private CameraEvent.EventSeverity parseSeverity(String raw) {
        try { return CameraEvent.EventSeverity.valueOf(raw.toUpperCase()); } catch (Exception e) { return null; }
    }

    private OffsetDateTime parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OffsetDateTime.parse(raw);
        } catch (Exception e) {
            try {
                return LocalDate.parse(raw).atStartOfDay().atOffset(OffsetDateTime.now().getOffset());
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private Map<String, Object> toEventMap(CameraEvent e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("cameraId", e.getCamera() != null ? e.getCamera().getId() : null);
        m.put("cameraName", e.getCamera() != null ? e.getCamera().getName() : null);
        m.put("schoolId", e.getSchool() != null ? e.getSchool().getId() : null);
        m.put("schoolName", e.getSchool() != null ? e.getSchool().getName() : null);
        m.put("type", e.getType() != null ? e.getType().name() : null);
        m.put("severity", e.getSeverity() != null ? e.getSeverity().name() : null);
        m.put("description", e.getDescription());
        m.put("occurredAt", e.getOccurredAt() != null ? e.getOccurredAt().toString() : null);
        m.put("reportedById", e.getReportedBy() != null ? e.getReportedBy().getId() : null);
        m.put("reportedByName", e.getReportedBy() != null ? e.getReportedBy().getFullName() : null);
        m.put("resolved", e.getResolved());
        m.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        return m;
    }
}
