package com.maktab.controller;

import com.maktab.model.Device;
import com.maktab.model.FaceTerminal;
import com.maktab.repository.DeviceRepository;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.ProvinceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Qurilmalar boshqaruvi — Mini-PC + Face ID terminallar
 *
 * Arxitektura:
 * Viloyat → Tuman → Maktab → Mini-PC server → Face ID terminallar (KIRISH / CHIQISH)
 */
@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired private DeviceRepository deviceRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private ProvinceRepository provinceRepo;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  MINI-PC REGISTRATION & HEARTBEAT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Mini-PC ro'yxatdan o'tishi — POST /api/devices/register */
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

    /** Heartbeat — har 30 sekundda mini-PC yuboradi */
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  QURILMALAR RO'YXATI (HIERARCHICAL)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Barcha qurilmalar — GET /api/devices?schoolId=2&provinceId=1&districtId=3 */
    @GetMapping
    public List<Map<String, Object>> getAll(
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) Long districtId) {

        List<Device> devices;

        if (schoolId != null) {
            devices = deviceRepo.findBySchoolId(schoolId);
        } else if (districtId != null) {
            List<Long> schoolIds = schoolRepo.findByDistrictId(districtId)
                .stream().map(s -> s.getId()).collect(Collectors.toList());
            devices = schoolIds.isEmpty() ? Collections.emptyList() : deviceRepo.findBySchoolIdIn(schoolIds);
        } else if (provinceId != null) {
            List<Long> districtIds = districtRepo.findByProvinceId(provinceId)
                .stream().map(d -> d.getId()).collect(Collectors.toList());
            List<Long> schoolIds = districtIds.isEmpty() ? Collections.emptyList() :
                schoolRepo.findByDistrictIdIn(districtIds)
                    .stream().map(s -> s.getId()).collect(Collectors.toList());
            devices = schoolIds.isEmpty() ? Collections.emptyList() : deviceRepo.findBySchoolIdIn(schoolIds);
        } else {
            devices = deviceRepo.findAll();
        }

        // Terminallarni device id bo'yicha guruhlash
        List<Long> deviceIds = devices.stream().map(Device::getId).collect(Collectors.toList());
        List<FaceTerminal> allTerminals = deviceIds.isEmpty() ? Collections.emptyList()
            : terminalRepo.findByDeviceIdIn(deviceIds);
        Map<Long, List<FaceTerminal>> terminalsByDevice = allTerminals.stream()
            .collect(Collectors.groupingBy(FaceTerminal::getDeviceId));

        return devices.stream().map(d -> toDeviceMap(d, terminalsByDevice.getOrDefault(d.getId(), Collections.emptyList())))
            .collect(Collectors.toList());
    }

    /** Bitta qurilma — GET /api/devices/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return deviceRepo.findById(id).map(d -> {
            List<FaceTerminal> terminals = terminalRepo.findByDeviceId(d.getId());
            return ResponseEntity.ok(toDeviceMap(d, terminals));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Qurilma o'chirish */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        // Bog'liq terminallarni ham o'chirish
        List<FaceTerminal> terminals = terminalRepo.findByDeviceId(id);
        terminalRepo.deleteAll(terminals);
        deviceRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Qurilma tahrirlash — PUT /api/devices/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return deviceRepo.findById(id).map(d -> {
            if (body.containsKey("deviceName")) d.setDeviceName((String) body.get("deviceName"));
            if (body.containsKey("localIp")) d.setLocalIp((String) body.get("localIp"));
            if (body.containsKey("schoolId")) d.setSchoolId(Long.valueOf(body.get("schoolId").toString()));
            deviceRepo.save(d);
            return ResponseEntity.ok(toDeviceMap(d, terminalRepo.findByDeviceId(d.getId())));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  FACE ID TERMINALLAR BOSHQARUVI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Terminal ro'yxati — GET /api/devices/{deviceId}/terminals */
    @GetMapping("/{deviceId}/terminals")
    public List<Map<String, Object>> getTerminals(@PathVariable Long deviceId) {
        return terminalRepo.findByDeviceId(deviceId).stream()
            .map(this::toTerminalMap).collect(Collectors.toList());
    }

    /** Yangi terminal qo'shish — POST /api/devices/{deviceId}/terminals */
    @PostMapping("/{deviceId}/terminals")
    public ResponseEntity<?> addTerminal(@PathVariable Long deviceId, @RequestBody Map<String, Object> body) {
        Device device = deviceRepo.findById(deviceId).orElse(null);
        if (device == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mini-PC topilmadi"));
        }

        FaceTerminal t = new FaceTerminal();
        t.setDeviceId(deviceId);
        t.setSchoolId(device.getSchoolId());
        t.setName((String) body.getOrDefault("name", "Terminal"));
        t.setSerialNumber((String) body.get("serialNumber"));
        t.setModel((String) body.getOrDefault("model", "DS-K1T341CMF"));
        t.setDirection(FaceTerminal.Direction.valueOf(
            body.getOrDefault("direction", "ENTRANCE").toString()));
        t.setStatus(FaceTerminal.TerminalStatus.OFFLINE);
        t.setIpAddress((String) body.get("ipAddress"));
        t.setFirmwareVersion((String) body.get("firmwareVersion"));
        t.setRegisteredFaces(0);
        t.setCreatedAt(LocalDateTime.now());
        terminalRepo.save(t);

        // Mini-PC dagi terminal sonini yangilash
        long count = terminalRepo.countByDeviceId(deviceId);
        deviceRepo.findById(deviceId).ifPresent(d -> {
            d.setFaceTerminalCount((int) count);
            deviceRepo.save(d);
        });

        return ResponseEntity.ok(toTerminalMap(t));
    }

    /** Terminal tahrirlash — PUT /api/devices/terminals/{id} */
    @PutMapping("/terminals/{id}")
    public ResponseEntity<?> updateTerminal(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return terminalRepo.findById(id).map(t -> {
            if (body.containsKey("name")) t.setName((String) body.get("name"));
            if (body.containsKey("serialNumber")) t.setSerialNumber((String) body.get("serialNumber"));
            if (body.containsKey("model")) t.setModel((String) body.get("model"));
            if (body.containsKey("direction"))
                t.setDirection(FaceTerminal.Direction.valueOf(body.get("direction").toString()));
            if (body.containsKey("ipAddress")) t.setIpAddress((String) body.get("ipAddress"));
            if (body.containsKey("firmwareVersion")) t.setFirmwareVersion((String) body.get("firmwareVersion"));
            if (body.containsKey("status"))
                t.setStatus(FaceTerminal.TerminalStatus.valueOf(body.get("status").toString()));
            terminalRepo.save(t);
            return ResponseEntity.ok(toTerminalMap(t));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Terminal o'chirish — DELETE /api/devices/terminals/{id} */
    @DeleteMapping("/terminals/{id}")
    public ResponseEntity<?> deleteTerminal(@PathVariable Long id) {
        return terminalRepo.findById(id).map(t -> {
            Long deviceId = t.getDeviceId();
            terminalRepo.deleteById(id);
            // Mini-PC dagi terminal sonini yangilash
            if (deviceId != null) {
                long count = terminalRepo.countByDeviceId(deviceId);
                deviceRepo.findById(deviceId).ifPresent(d -> {
                    d.setFaceTerminalCount((int) count);
                    deviceRepo.save(d);
                });
            }
            return ResponseEntity.ok(Map.of("success", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  HIERARCHICAL OVERVIEW
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** GET /api/devices/overview — umumiy statistika (Province→District→School→Device) */
    @GetMapping("/overview")
    public Map<String, Object> overview() {
        List<Device> allDevices = deviceRepo.findAll();
        List<FaceTerminal> allTerminals = terminalRepo.findAll();

        long online = allDevices.stream().filter(d -> d.getStatus() == Device.DeviceStatus.ONLINE).count();
        long offline = allDevices.stream().filter(d -> d.getStatus() == Device.DeviceStatus.OFFLINE).count();
        long totalTerminals = allTerminals.size();
        long entranceTerminals = allTerminals.stream()
            .filter(t -> t.getDirection() == FaceTerminal.Direction.ENTRANCE).count();
        long exitTerminals = allTerminals.stream()
            .filter(t -> t.getDirection() == FaceTerminal.Direction.EXIT).count();
        long onlineTerminals = allTerminals.stream()
            .filter(t -> t.getStatus() == FaceTerminal.TerminalStatus.ONLINE).count();

        return Map.of(
            "totalDevices", allDevices.size(),
            "onlineDevices", online,
            "offlineDevices", offline,
            "totalTerminals", totalTerminals,
            "entranceTerminals", entranceTerminals,
            "exitTerminals", exitTerminals,
            "onlineTerminals", onlineTerminals
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  SCHEDULED: OFFLINE DETECTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  MAPPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private Map<String, Object> toDeviceMap(Device d, List<FaceTerminal> terminals) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("deviceName", d.getDeviceName());
        m.put("schoolId", d.getSchoolId());
        m.put("localIp", d.getLocalIp());
        m.put("macAddress", d.getMacAddress());
        m.put("status", d.getStatus().name());
        m.put("lastHeartbeat", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
        m.put("registeredAt", d.getRegisteredAt() != null ? d.getRegisteredAt().toString() : null);
        m.put("faceTerminalCount", d.getFaceTerminalCount());

        // School → District → Province
        schoolRepo.findById(d.getSchoolId()).ifPresent(s -> {
            m.put("schoolName", s.getName());
            if (s.getDistrict() != null) {
                m.put("districtId", s.getDistrict().getId());
                m.put("districtName", s.getDistrict().getName());
                if (s.getDistrict().getProvince() != null) {
                    m.put("provinceId", s.getDistrict().getProvince().getId());
                    m.put("provinceName", s.getDistrict().getProvince().getName());
                }
            }
        });

        // Terminallar
        long entrance = terminals.stream().filter(t -> t.getDirection() == FaceTerminal.Direction.ENTRANCE).count();
        long exit = terminals.stream().filter(t -> t.getDirection() == FaceTerminal.Direction.EXIT).count();
        m.put("entranceTerminals", entrance);
        m.put("exitTerminals", exit);
        m.put("terminals", terminals.stream().map(this::toTerminalMap).collect(Collectors.toList()));

        return m;
    }

    private Map<String, Object> toTerminalMap(FaceTerminal t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("deviceId", t.getDeviceId());
        m.put("name", t.getName());
        m.put("serialNumber", t.getSerialNumber());
        m.put("model", t.getModel());
        m.put("direction", t.getDirection().name());
        m.put("status", t.getStatus().name());
        m.put("ipAddress", t.getIpAddress());
        m.put("firmwareVersion", t.getFirmwareVersion());
        m.put("registeredFaces", t.getRegisteredFaces());
        m.put("lastSeen", t.getLastSeen() != null ? t.getLastSeen().toString() : null);
        m.put("lastEventAt", t.getLastEventAt() != null ? t.getLastEventAt().toString() : null);
        m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
        return m;
    }
}
