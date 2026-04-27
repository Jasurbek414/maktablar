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
import com.maktab.model.DeviceCommand;
import com.maktab.repository.DeviceCommandRepository;

/**
 * Qurilmalar boshqaruvi — Mini-PC + Face ID terminallar
 *
 * YANGI OQIM:
 * 1. Admin platformada maktab tanlab → login/parol/apiKey generatsiya qiladi
 * 2. Texnik xodim desktop dasturga login/parol/apiKey kiritadi
 * 3. Desktop avtomatik maktabga biriktiriladi
 */
@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired private DeviceRepository deviceRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private ProvinceRepository provinceRepo;
    @Autowired private DeviceCommandRepository commandRepo;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  PLATFORMADAN KALIT YARATISH (ADMIN)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Admin maktab uchun login/parol/apiKey yaratadi — POST /api/devices/create-credentials */
    @PostMapping("/create-credentials")
    public ResponseEntity<?> createCredentials(@RequestBody Map<String, Object> body) {
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        String login = (String) body.get("login");
        String password = (String) body.get("password");

        // Validatsiya
        if (login == null || login.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Login va parol bo'sh bo'lmasligi kerak"));
        }
        if (!schoolRepo.existsById(schoolId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maktab topilmadi"));
        }
        // Login unikal bo'lishi kerak
        if (deviceRepo.findByLogin(login).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bu login allaqachon mavjud"));
        }

        // API kalit generatsiya
        String apiKey = UUID.randomUUID().toString().replace("-", "").substring(0, 24);

        Device device = new Device();
        device.setLogin(login);
        device.setPassword(password);
        device.setApiKey(apiKey);
        device.setSchoolId(schoolId);
        device.setDeviceName("Mini-PC (" + login + ")");
        device.setStatus(Device.DeviceStatus.OFFLINE);
        device.setRegisteredAt(LocalDateTime.now());
        deviceRepo.save(device);

        // Maktab ma'lumotlari
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", device.getId());
        result.put("login", login);
        result.put("password", password);
        result.put("apiKey", apiKey);
        schoolRepo.findById(schoolId).ifPresent(s -> {
            result.put("schoolName", s.getName());
        });
        result.put("message", "Kalit muvaffaqiyatli yaratildi! Ushbu ma'lumotlarni desktop dasturga kiriting.");

        return ResponseEntity.ok(result);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  DESKTOP DASTURDAN KIRISH (LOGIN)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Desktop dastur login/parol/apiKey bilan kiradi — POST /api/devices/authenticate */
    @PostMapping("/authenticate")
    public ResponseEntity<?> authenticate(@RequestBody Map<String, Object> body) {
        String login = (String) body.get("login");
        String password = (String) body.get("password");
        String apiKey = (String) body.get("apiKey");
        String localIp = (String) body.getOrDefault("localIp", "");
        String macAddress = (String) body.getOrDefault("macAddress", "");

        if (login == null || password == null || apiKey == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Login, parol va API kalit majburiy"));
        }

        // Tekshirish: login + parol + apiKey barchasi mos kelishi kerak
        Optional<Device> optDevice = deviceRepo.findByLogin(login);
        if (optDevice.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Noto'g'ri login"));
        }

        Device device = optDevice.get();
        if (!device.getPassword().equals(password) || !device.getApiKey().equals(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Login, parol yoki API kalit noto'g'ri"));
        }

        // Muvaffaqiyat — qurilmani ONLINE qilish
        device.setStatus(Device.DeviceStatus.ONLINE);
        device.setLastHeartbeat(LocalDateTime.now());
        device.setLocalIp(localIp);
        if (macAddress != null && !macAddress.isBlank()) device.setMacAddress(macAddress);
        deviceRepo.save(device);

        // Javob — maktab ma'lumotlari bilan
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", device.getId());
        result.put("schoolId", device.getSchoolId());
        result.put("apiKey", device.getApiKey());
        result.put("status", "authenticated");

        schoolRepo.findById(device.getSchoolId()).ifPresent(s -> {
            result.put("schoolName", s.getName());
            if (s.getDistrict() != null) {
                result.put("districtName", s.getDistrict().getName());
                if (s.getDistrict().getProvince() != null) {
                    result.put("provinceName", s.getDistrict().getProvince().getName());
                }
            }
        });

        result.put("message", "Muvaffaqiyatli kirildi! Maktabga avtomatik biriktirildi.");
        return ResponseEntity.ok(result);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  LEGACY: REGISTER & HEARTBEAT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Mini-PC ro'yxatdan o'tishi — POST /api/devices/register */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        String apiKey = (String) body.get("apiKey");
        String deviceName = (String) body.getOrDefault("deviceName", "Mini-PC");
        String localIp = (String) body.getOrDefault("localIp", "");
        String macAddress = (String) body.getOrDefault("macAddress", "");

        Device device = deviceRepo.findByApiKey(apiKey).orElse(null);
        if (device == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Noto'g'ri API kalit. Platformadan to'g'ri kalitni oling."));
        }

        device.setDeviceName(deviceName);
        device.setLocalIp(localIp);
        if (macAddress != null && !macAddress.isBlank()) device.setMacAddress(macAddress);
        device.setStatus(Device.DeviceStatus.ONLINE);
        device.setLastHeartbeat(LocalDateTime.now());
        deviceRepo.save(device);

        return ResponseEntity.ok(Map.of(
            "id", device.getId(),
            "status", "registered",
            "schoolId", device.getSchoolId() != null ? device.getSchoolId() : "Biriktirilmagan",
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

    /** Qurilma maktabga biriktirish */
    @PutMapping("/{id}/assign-school")
    public ResponseEntity<?> assignSchool(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Device device = deviceRepo.findById(id).orElseThrow(() -> new RuntimeException("Device not found"));
        Long sid = Long.valueOf(body.get("schoolId").toString());
        if (!schoolRepo.existsById(sid)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maktab topilmadi"));
        }
        device.setSchoolId(sid);
        deviceRepo.save(device);
        return ResponseEntity.ok(Map.of("message", "Maktabga muvaffaqiyatli biriktirildi"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
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

    @GetMapping("/{deviceId}/terminals")
    public List<Map<String, Object>> getTerminals(@PathVariable Long deviceId) {
        return terminalRepo.findByDeviceId(deviceId).stream()
            .map(this::toTerminalMap).collect(Collectors.toList());
    }

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

        long count = terminalRepo.countByDeviceId(deviceId);
        deviceRepo.findById(deviceId).ifPresent(d -> {
            d.setFaceTerminalCount((int) count);
            deviceRepo.save(d);
        });

        return ResponseEntity.ok(toTerminalMap(t));
    }

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

    @DeleteMapping("/terminals/{id}")
    public ResponseEntity<?> deleteTerminal(@PathVariable Long id) {
        return terminalRepo.findById(id).map(t -> {
            Long deviceId = t.getDeviceId();
            terminalRepo.deleteById(id);
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
    //  OVERVIEW & SCHEDULED
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
        m.put("login", d.getLogin());
        m.put("schoolId", d.getSchoolId());
        m.put("localIp", d.getLocalIp());
        m.put("macAddress", d.getMacAddress());
        m.put("status", d.getStatus().name());
        m.put("lastHeartbeat", d.getLastHeartbeat() != null ? d.getLastHeartbeat().toString() : null);
        m.put("registeredAt", d.getRegisteredAt() != null ? d.getRegisteredAt().toString() : null);
        m.put("faceTerminalCount", d.getFaceTerminalCount());

        if (d.getSchoolId() != null) {
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
        }

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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  REMOTE COMMANDS (Platforma → Mini-PC → Terminal)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Platforma buyruq yuboradi — POST /api/devices/{deviceId}/commands */
    @PostMapping("/{deviceId}/commands")
    public ResponseEntity<?> sendCommand(@PathVariable Long deviceId, @RequestBody Map<String, Object> body) {
        Device device = deviceRepo.findById(deviceId).orElse(null);
        if (device == null) return ResponseEntity.badRequest().body(Map.of("error", "Qurilma topilmadi"));

        DeviceCommand cmd = new DeviceCommand();
        cmd.setDeviceId(deviceId);
        cmd.setCommandType((String) body.get("commandType"));
        cmd.setTargetTerminal((String) body.get("targetTerminal"));
        cmd.setParams(body.containsKey("params") ? body.get("params").toString() : null);
        cmd.setStatus(DeviceCommand.CommandStatus.PENDING);
        cmd.setCreatedAt(LocalDateTime.now());
        commandRepo.save(cmd);

        return ResponseEntity.ok(Map.of("id", cmd.getId(), "status", "PENDING", "message", "Buyruq yuborildi"));
    }

    /** Buyruqlar tarixi — GET /api/devices/{deviceId}/commands */
    @GetMapping("/{deviceId}/commands")
    public List<Map<String, Object>> getCommands(@PathVariable Long deviceId) {
        return commandRepo.findByDeviceIdOrderByCreatedAtDesc(deviceId).stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("commandType", c.getCommandType());
            m.put("targetTerminal", c.getTargetTerminal());
            m.put("status", c.getStatus().name());
            m.put("result", c.getResult());
            m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
            m.put("executedAt", c.getExecutedAt() != null ? c.getExecutedAt().toString() : null);
            return m;
        }).collect(Collectors.toList());
    }

    /** Mini-PC kutayotgan buyruqlarni oladi — GET /api/devices/commands/pending */
    @GetMapping("/commands/pending")
    public List<Map<String, Object>> getPendingCommands(@RequestHeader("X-Api-Key") String apiKey) {
        Device device = deviceRepo.findByApiKey(apiKey).orElse(null);
        if (device == null) return Collections.emptyList();

        List<DeviceCommand> pending = commandRepo.findByDeviceIdAndStatus(device.getId(), DeviceCommand.CommandStatus.PENDING);
        // PENDING → EXECUTING
        pending.forEach(c -> { c.setStatus(DeviceCommand.CommandStatus.EXECUTING); commandRepo.save(c); });

        return pending.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("commandType", c.getCommandType());
            m.put("targetTerminal", c.getTargetTerminal());
            m.put("params", c.getParams());
            return m;
        }).collect(Collectors.toList());
    }

    /** Mini-PC buyruq natijasini qaytaradi — PUT /api/devices/commands/{id}/result */
    @PutMapping("/commands/{id}/result")
    public ResponseEntity<?> reportResult(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        DeviceCommand cmd = commandRepo.findById(id).orElse(null);
        if (cmd == null) return ResponseEntity.notFound().build();

        boolean success = Boolean.TRUE.equals(body.get("success"));
        cmd.setStatus(success ? DeviceCommand.CommandStatus.COMPLETED : DeviceCommand.CommandStatus.FAILED);
        cmd.setResult((String) body.get("result"));
        cmd.setExecutedAt(LocalDateTime.now());
        commandRepo.save(cmd);

        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
