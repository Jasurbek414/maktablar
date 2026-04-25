package com.maktab.controller;

import com.maktab.model.Device;
import com.maktab.repository.DeviceRepository;
import com.maktab.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired private DeviceRepository deviceRepo;
    @Autowired private SchoolRepository schoolRepo;

    /**
     * Mini-PC ro'yxatdan o'tishi
     * POST /api/devices/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        String apiKey = (String) body.get("apiKey");
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        String deviceName = (String) body.getOrDefault("deviceName", "Mini-PC");
        String localIp = (String) body.getOrDefault("localIp", "");
        String macAddress = (String) body.getOrDefault("macAddress", "");

        if (!schoolRepo.existsById(schoolId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maktab topilmadi"));
        }

        // Agar allaqachon ro'yxatdan o'tgan bo'lsa — yangilash
        Device device = deviceRepo.findByApiKey(apiKey).orElse(new Device());
        device.setApiKey(apiKey);
        device.setSchoolId(schoolId);
        device.setDeviceName(deviceName);
        device.setLocalIp(localIp);
        device.setMacAddress(macAddress);
        device.setStatus(Device.DeviceStatus.ONLINE);
        device.setLastHeartbeat(LocalDateTime.now());
        if (device.getRegisteredAt() == null) {
            device.setRegisteredAt(LocalDateTime.now());
        }
        deviceRepo.save(device);

        return ResponseEntity.ok(Map.of(
            "id", device.getId(),
            "status", "registered",
            "schoolId", schoolId,
            "message", "Mini-PC muvaffaqiyatli ro'yxatdan o'tdi"
        ));
    }

    /**
     * Heartbeat — har 30 sekundda mini-PC yuboradi
     * POST /api/devices/heartbeat
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestHeader("X-Api-Key") String apiKey,
                                        @RequestBody(required = false) Map<String, Object> body) {
        Device device = deviceRepo.findByApiKey(apiKey).orElse(null);
        if (device == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Noma'lum qurilma"));
        }

        device.setStatus(Device.DeviceStatus.ONLINE);
        device.setLastHeartbeat(LocalDateTime.now());
        if (body != null) {
            if (body.containsKey("localIp")) device.setLocalIp((String) body.get("localIp"));
            if (body.containsKey("faceTerminalCount"))
                device.setFaceTerminalCount(Integer.valueOf(body.get("faceTerminalCount").toString()));
        }
        deviceRepo.save(device);

        return ResponseEntity.ok(Map.of("status", "ok", "serverTime", LocalDateTime.now().toString()));
    }

    /**
     * Barcha qurilmalar ro'yxati (dashboard uchun)
     * GET /api/devices?schoolId=2
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long schoolId) {
        List<Device> devices = schoolId != null
            ? deviceRepo.findBySchoolId(schoolId)
            : deviceRepo.findAll();
        return devices.stream().map(this::toMap).collect(Collectors.toList());
    }

    /**
     * Bitta qurilma
     * GET /api/devices/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return deviceRepo.findById(id)
            .map(d -> ResponseEntity.ok(toMap(d)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Qurilma o'chirish
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        deviceRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Har 2 daqiqada offline qurilmalarni aniqlash
     * Agar 2 daqiqadan ko'p heartbeat kelmasa → OFFLINE
     */
    @Scheduled(fixedRate = 120000)
    public void checkOfflineDevices() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(2);
        List<Device> stale = deviceRepo.findByLastHeartbeatBefore(threshold);
        for (Device d : stale) {
            if (d.getStatus() != Device.DeviceStatus.OFFLINE) {
                d.setStatus(Device.DeviceStatus.OFFLINE);
                deviceRepo.save(d);
            }
        }
    }

    private Map<String, Object> toMap(Device d) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("deviceName", d.getDeviceName());
        m.put("schoolId", d.getSchoolId());
        m.put("localIp", d.getLocalIp());
        m.put("status", d.getStatus().name());
        m.put("lastHeartbeat", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
        m.put("registeredAt", d.getRegisteredAt() != null ? d.getRegisteredAt().toString() : null);
        m.put("faceTerminalCount", d.getFaceTerminalCount());
        // School name
        schoolRepo.findById(d.getSchoolId()).ifPresent(s -> m.put("schoolName", s.getName()));
        return m;
    }
}
