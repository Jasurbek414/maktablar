package com.maktab.controller;

import com.maktab.model.Device;
import com.maktab.model.DeviceCommand;
import com.maktab.model.FaceTerminal;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/devices va /api/v1/device-sync-logs kontrakti.
 * Mavjud /api/devices (DeviceController) o'zgarishsiz qoladi.
 *
 * MUHIM: Bu backendning qurilma arxitekturasi Django'nikidan farq qiladi — bu yerda
 * mini-PC "bridge" (Device) + unga ulangan Face ID terminallar (FaceTerminal) bor,
 * qurilmaga to'g'ridan-to'g'ri IP/login/parol bilan ulanadigan "adapter" yo'q.
 * Shu sabab quyidagilar ANIQ SODDALASHTIRISH:
 *  - Django'dagi brand/model/ip_address/port/username/serial_number/location maydonlari
 *    bu Device entity'da yo'q; qabul qilinsa ham (create/update body'da) saqlanmaydi.
 *  - sync/pull-logs — real vaqtda ishlaydigan adapter chaqiruvi emas, DeviceCommand
 *    navbatiga yozuv qo'shadigan "queued" javob (mini-PC keyinroq polling bilan oladi).
 *  - sync-logs/device-sync-logs — alohida DeviceSyncLog entity yo'q, shu DeviceCommand
 *    qatorlari sync-log ko'rinishida moslashtirilib qaytariladi.
 */
@RestController
@RequestMapping("/api/v1")
public class V1DeviceController {

    @Autowired private DeviceRepository deviceRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private DeviceCommandRepository commandRepo;
    @Autowired private CurrentUserService currentUserService;

    // ══════════════════════════ DEVICES ══════════════════════════

    /** MUHIM: school/schoolId/district/districtId endi client'dan ishonch bilan qabul qilinmaydi —
     * haqiqiy ko'lam Authorization headerdagi foydalanuvchidan olinadi. */
    @GetMapping("/devices/")
    public List<Map<String, Object>> getDevices(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long district,
            @RequestParam(required = false) Long districtId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        Long did = district != null ? district : districtId;

        List<Device> devices;
        if (did != null) {
            if (!currentUserService.canAccessDistrict(user, did)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu tumanga ruxsat yo'q");
            }
            List<Long> schoolIds = schoolRepo.findByDistrictId(did).stream().map(com.maktab.model.School::getId)
                .collect(Collectors.toList());
            devices = schoolIds.isEmpty() ? Collections.emptyList() : deviceRepo.findBySchoolIdIn(schoolIds);
        } else {
            List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
            if (scope == null) {
                devices = deviceRepo.findAll();
            } else if (scope.isEmpty()) {
                devices = Collections.emptyList();
            } else if (scope.size() == 1) {
                devices = deviceRepo.findBySchoolId(scope.get(0));
            } else {
                devices = deviceRepo.findBySchoolIdIn(scope);
            }
        }
        return devices.stream().map(this::toDeviceMap).collect(Collectors.toList());
    }

    @GetMapping("/devices/{id}/")
    public ResponseEntity<?> getDevice(@PathVariable Long id) {
        return deviceRepo.findById(id).map(d -> ResponseEntity.ok(toDeviceMap(d)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/devices/")
    public ResponseEntity<?> createDevice(@RequestBody Map<String, Object> body) {
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        if (schoolVal == null) return ResponseEntity.badRequest().body(Map.of("school", List.of("Maktab majburiy")));
        if (!schoolRepo.existsById(Long.valueOf(schoolVal.toString()))) {
            return ResponseEntity.badRequest().body(Map.of("school", List.of("Maktab topilmadi")));
        }
        String name = body.get("name") != null ? body.get("name").toString()
            : body.get("deviceName") != null ? body.get("deviceName").toString() : "Qurilma";

        Device d = new Device();
        d.setDeviceName(name);
        d.setSchoolId(Long.valueOf(schoolVal.toString()));
        Object ip = body.get("ip_address") != null ? body.get("ip_address") : body.get("localIp");
        if (ip != null) d.setLocalIp(ip.toString());
        // login/apiKey — mini-PC bridge autentifikatsiyasi uchun, Frontend A bu maydonlarni
        // bilmaydi, shuning uchun avtomatik generatsiya qilinadi (unique bo'lishi shart).
        d.setLogin("v1-" + UUID.randomUUID().toString().substring(0, 12));
        d.setApiKey(UUID.randomUUID().toString().replace("-", "").substring(0, 24));
        d.setStatus(Device.DeviceStatus.OFFLINE);
        d.setRegisteredAt(LocalDateTime.now());
        deviceRepo.save(d);
        return ResponseEntity.ok(toDeviceMap(d));
    }

    @PatchMapping("/devices/{id}/")
    public ResponseEntity<?> updateDevice(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return deviceRepo.findById(id).map(d -> {
            if (body.get("name") != null) d.setDeviceName(body.get("name").toString());
            else if (body.get("deviceName") != null) d.setDeviceName(body.get("deviceName").toString());
            Object ip = body.get("ip_address") != null ? body.get("ip_address") : body.get("localIp");
            if (ip != null) d.setLocalIp(ip.toString());
            Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
            if (schoolVal != null) d.setSchoolId(Long.valueOf(schoolVal.toString()));
            deviceRepo.save(d);
            return ResponseEntity.ok(toDeviceMap(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/devices/{id}/")
    public ResponseEntity<?> deleteDevice(@PathVariable Long id) {
        if (!deviceRepo.existsById(id)) return ResponseEntity.notFound().build();
        terminalRepo.deleteAll(terminalRepo.findByDeviceId(id));
        deviceRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/devices/{id}/status/")
    public ResponseEntity<?> getDeviceStatus(@PathVariable Long id) {
        return deviceRepo.findById(id).map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("status", d.getStatus().name().toLowerCase());
            m.put("online", d.getStatus() == Device.DeviceStatus.ONLINE);
            m.put("lastHeartbeat", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
            m.put("last_seen", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Mini-PC navbatiga SYNC_FACES buyrug'i qo'yiladi — sinxron/bloklovchi chaqiruv emas. */
    @PostMapping("/devices/{id}/sync/")
    public ResponseEntity<?> syncDevice(@PathVariable Long id) {
        Device device = deviceRepo.findById(id).orElse(null);
        if (device == null) return ResponseEntity.notFound().build();
        DeviceCommand cmd = queueCommand(id, "SYNC_FACES");
        return ResponseEntity.ok(Map.of("status", "queued", "commandId", cmd.getId(), "message", "O'quvchilar sinxronizatsiyasi navbatga qo'yildi"));
    }

    /** Mini-PC navbatiga PULL_LOGS buyrug'i qo'yiladi. */
    @PostMapping("/devices/{id}/pull-logs/")
    public ResponseEntity<?> pullLogs(@PathVariable Long id) {
        Device device = deviceRepo.findById(id).orElse(null);
        if (device == null) return ResponseEntity.notFound().build();
        DeviceCommand cmd = queueCommand(id, "PULL_LOGS");
        return ResponseEntity.ok(Map.of("status", "queued", "commandId", cmd.getId(), "message", "Loglarni olish navbatga qo'yildi"));
    }

    private DeviceCommand queueCommand(Long deviceId, String type) {
        DeviceCommand cmd = new DeviceCommand();
        cmd.setDeviceId(deviceId);
        cmd.setCommandType(type);
        cmd.setStatus(DeviceCommand.CommandStatus.PENDING);
        cmd.setCreatedAt(LocalDateTime.now());
        commandRepo.save(cmd);
        return cmd;
    }

    @GetMapping("/devices/{id}/sync-logs/")
    public List<Map<String, Object>> getDeviceSyncLogs(@PathVariable Long id) {
        return commandRepo.findByDeviceIdOrderByCreatedAtDesc(id).stream()
            .map(this::toSyncLogMap).collect(Collectors.toList());
    }

    @GetMapping("/device-sync-logs/")
    public List<Map<String, Object>> getAllSyncLogs(@RequestParam(required = false) Long deviceId) {
        List<DeviceCommand> commands = deviceId != null
            ? commandRepo.findByDeviceIdOrderByCreatedAtDesc(deviceId)
            : commandRepo.findAll();
        return commands.stream().map(this::toSyncLogMap).collect(Collectors.toList());
    }

    private Map<String, Object> toSyncLogMap(DeviceCommand c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("deviceId", c.getDeviceId());
        m.put("syncType", c.getCommandType());
        m.put("sync_type", c.getCommandType());
        String status = mapCommandStatus(c.getStatus());
        m.put("status", status);
        m.put("status_display", status);
        m.put("startedAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        m.put("started_at", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        m.put("completedAt", c.getExecutedAt() != null ? c.getExecutedAt().toString() : null);
        m.put("completed_at", c.getExecutedAt() != null ? c.getExecutedAt().toString() : null);
        m.put("total_records", null); // bu backendda kuzatilmaydi
        m.put("result", c.getResult());
        return m;
    }

    // DeviceCommand.CommandStatus (PENDING/EXECUTING/COMPLETED/FAILED) ni Frontend A
    // kutgan sync-log holatlariga (pending/running/success/failed) moslashtiradi.
    private String mapCommandStatus(DeviceCommand.CommandStatus status) {
        if (status == null) return "pending";
        switch (status) {
            case EXECUTING: return "running";
            case COMPLETED: return "success";
            case FAILED: return "failed";
            case PENDING:
            default: return "pending";
        }
    }

    private Map<String, Object> toDeviceMap(Device d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("name", d.getDeviceName());
        m.put("deviceName", d.getDeviceName());
        Long schoolId = d.getSchoolId();
        m.put("school", schoolId);
        m.put("schoolId", schoolId);
        if (schoolId != null) {
            schoolRepo.findById(schoolId).ifPresent(s -> {
                m.put("school_name", s.getName());
                m.put("schoolName", s.getName());
            });
        }
        m.put("status", d.getStatus() != null ? d.getStatus().name().toLowerCase() : "unknown");
        m.put("ip_address", d.getLocalIp());
        m.put("localIp", d.getLocalIp());
        m.put("macAddress", d.getMacAddress());
        m.put("last_seen", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
        m.put("lastHeartbeat", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
        m.put("registeredAt", d.getRegisteredAt() != null ? d.getRegisteredAt().toString() : null);
        m.put("faceTerminalCount", d.getFaceTerminalCount());
        // Django'dagi kamera-darajasidagi maydonlar (bu schema'da yo'q, comment):
        m.put("brand", null);
        m.put("model", null);
        m.put("port", null);
        m.put("serial_number", null);
        m.put("location", null);
        return m;
    }
}
