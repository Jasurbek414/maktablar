package com.maktab.controller;

import com.maktab.model.Camera;
import com.maktab.model.FaceTerminal;
import com.maktab.model.PersonLastSeen;
import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.model.Room;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.CameraRepository;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.repository.PersonLastSeenRepository;
import com.maktab.repository.RoomRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * "Odam hozir qayerda" — PersonLastSeen'dan bitta o'quvchi/xodimning eng so'nggi ko'rilgan
 * joyini o'qiydi (Kamera-Reja, 2026-09-18, 4-bosqich). Ruxsat StudentController'dagi
 * yozish-huquqi qoidasi bilan bir xil (assertCanWriteSchoolData) — TEACHER kirmaydi,
 * faqat DIRECTOR/MUDIR/SUPERADMIN/ADMIN va yuqori rahbariyat, "cheklangan kirish" siyosati
 * bo'yicha kelishilgan (2026-09-18).
 *
 * DIQQAT: bu yerda PersonRecognitionEvent'ni real vaqtda TO'LDIRADIGAN hech narsa yo'q —
 * qurilmadan hodisa hali kelmaydi (3-bosqich, aniq kamera modeli tanlangach yoziladi).
 * Shu sabab hozircha har doim "seen: false" qaytadi — API kontraktini oldindan tayyorlab,
 * frontend UI'ni haqiqiy ma'lumotsiz ham sinash uchun.
 */
@RestController
@RequestMapping("/api/persons")
public class PersonLocationController {

    @Autowired private PersonLastSeenRepository lastSeenRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private RoomRepository roomRepo;
    @Autowired private CameraRepository cameraRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    @GetMapping("/{personType}/{personId}/location")
    public ResponseEntity<?> getLocation(@PathVariable String personType,
                                          @PathVariable Long personId,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);

        PersonNote.PersonType type;
        try {
            type = PersonNote.PersonType.valueOf(personType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.person.invalid_type")));
        }

        Long schoolId;
        if (type == PersonNote.PersonType.STUDENT) {
            Student s = studentRepo.findById(personId).orElse(null);
            if (s == null || s.getSchool() == null) {
                return ResponseEntity.notFound().build();
            }
            schoolId = s.getSchool().getId();
        } else {
            User person = userRepo.findById(personId).orElse(null);
            if (person == null || person.getSchoolId() == null) {
                return ResponseEntity.notFound().build();
            }
            schoolId = person.getSchoolId();
        }
        // TEACHER rolidagi chaqiruvchi bu yerga kirmaydi (assertCanWriteSchoolData qoidasi) —
        // "faqat xavfsizlik/rahbariyat" siyosati ataylab shunday (2026-09-18 kelishilgan).
        currentUserService.assertCanWriteSchoolData(caller, schoolId);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("personType", type.name());
        m.put("personId", personId);

        PersonLastSeen row = lastSeenRepo.findByPersonTypeAndPersonId(type, personId).orElse(null);
        if (row == null) {
            m.put("seen", false);
            return ResponseEntity.ok(m);
        }

        m.put("seen", true);
        m.put("schoolId", row.getSchoolId());
        m.put("roomId", row.getRoomId());
        if (row.getRoomId() != null) {
            Room room = roomRepo.findById(row.getRoomId()).orElse(null);
            m.put("roomNumber", room != null ? room.getNumber() : null);
            m.put("roomName", room != null ? room.getName() : null);
        } else {
            m.put("roomNumber", null);
            m.put("roomName", null);
        }
        m.put("deviceType", row.getDeviceType().name());
        m.put("deviceId", row.getDeviceId());
        m.put("deviceName", resolveDeviceName(row.getDeviceType(), row.getDeviceId()));
        m.put("confidence", row.getConfidence());
        m.put("seenAt", row.getSeenAt().toString());
        return ResponseEntity.ok(m);
    }

    private String resolveDeviceName(PersonRecognitionEvent.DeviceType type, Long deviceId) {
        if (type == PersonRecognitionEvent.DeviceType.CAMERA) {
            Camera c = cameraRepo.findById(deviceId).orElse(null);
            return c != null ? c.getName() : null;
        }
        FaceTerminal t = terminalRepo.findById(deviceId).orElse(null);
        return t != null ? t.getName() : null;
    }
}
