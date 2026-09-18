package com.maktab.controller;

import com.maktab.model.Camera;
import com.maktab.model.Room;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.CameraRepository;
import com.maktab.repository.RoomRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Maktab xonalari (kabinetlar, zallar) — kameralar shu xonalarga biriktiriladi.
 * Scoping CameraController bilan bir xil uslub: ko'rish ko'lami Authorization
 * headerdagi haqiqiy foydalanuvchidan olinadi, client yuborgan schoolId ixtiyoriy
 * tor filtr sifatida ishlatiladi.
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired private RoomRepository roomRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private CameraRepository cameraRepo;
    @Autowired private com.maktab.repository.FaceTerminalRepository terminalRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user); // null => SUPERADMIN/ADMIN, cheklovsiz

        List<Room> rooms;
        if (schoolId != null) {
            currentUserService.assertCanAccessSchool(user, schoolId);
            rooms = roomRepo.findBySchoolIdOrderByNumberAsc(schoolId);
        } else if (scope == null) {
            rooms = roomRepo.findAll();
        } else if (scope.isEmpty()) {
            rooms = Collections.emptyList();
        } else {
            rooms = roomRepo.findBySchoolIdIn(scope);
        }
        return rooms.stream().map(this::toMap).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        String number = body.get("number") != null ? body.get("number").toString().trim() : null;
        String name = body.get("name") != null ? body.get("name").toString().trim() : null;
        if (number == null || number.isBlank() || name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.room.fields_required")));
        }
        if (body.get("schoolId") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.selection_required")));
        }
        Long schoolId;
        try {
            schoolId = Long.valueOf(body.get("schoolId").toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.invalid_id")));
        }
        currentUserService.assertCanWriteSchoolData(caller, schoolId);
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));

        Room r = new Room();
        r.setNumber(number);
        r.setName(name);
        r.setSchool(school);
        roomRepo.save(r);
        return ResponseEntity.ok(toMap(r));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return roomRepo.findById(id).map(r -> {
            currentUserService.assertCanWriteSchoolData(caller, r.getSchool().getId());
            if (body.containsKey("number") && body.get("number") != null) r.setNumber(body.get("number").toString().trim());
            if (body.containsKey("name") && body.get("name") != null) r.setName(body.get("name").toString().trim());
            roomRepo.save(r);
            return ResponseEntity.ok(toMap(r));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, room.getSchool().getId());

        // Shu xonaga biriktirilgan kameralarni "biriktirilmagan" holatga o'tkazamiz —
        // xona o'chirilganda kamera yozuvlari yo'qolmasligi kerak.
        List<Camera> assigned = cameraRepo.findByRoomId(id);
        for (Camera c : assigned) {
            c.setRoom(null);
            cameraRepo.save(c);
        }
        terminalRepo.clearRoom(id);
        roomRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(Room r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("number", r.getNumber());
        m.put("name", r.getName());
        m.put("schoolId", r.getSchool() != null ? r.getSchool().getId() : null);
        m.put("schoolName", r.getSchool() != null ? r.getSchool().getName() : null);
        m.put("cameraCount", cameraRepo.countByRoomId(r.getId()));
        return m;
    }
}
