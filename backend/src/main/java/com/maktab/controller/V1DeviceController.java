package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/devices va /api/v1/device-sync-logs kontrakti.
 * Asosiy /api/routers (RouterController) o'zgarishsiz qoladi.
 *
 * MUHIM: Bu backendning qurilma arxitekturasi endi mini-PC bridge emas — har bir
 * maktabda Mikrotik router VPN orqali to'g'ridan-to'g'ri ulanadi, lokal buyruq
 * bajaradigan agent yo'q. Shu sabab bu kontrollerdagi "sync"/"pull-logs" buyruq
 * navbatiga qo'yish o'rniga endi "qo'llab-quvvatlanmaydi" javobini qaytaradi —
 * DeviceCommand tizimi butunlay olib tashlangan (bajaradigan joy qolmagani uchun).
 * Bu Frontend A funksionalligini QAYTA QURMAYDI, faqat kompilyatsiyani saqlaydi.
 */
@RestController
@RequestMapping("/api/v1")
public class V1DeviceController {

    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    // ══════════════════════════ DEVICES (= Mikrotik routerlar) ══════════════════════════

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

        List<MikrotikRouter> routers;
        if (did != null) {
            if (!currentUserService.canAccessDistrict(user, did)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
            }
            List<Long> schoolIds = schoolRepo.findByDistrictId(did).stream().map(com.maktab.model.School::getId)
                .collect(Collectors.toList());
            routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
        } else {
            List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
            if (scope == null) {
                routers = routerRepo.findAll();
            } else if (scope.isEmpty()) {
                routers = Collections.emptyList();
            } else {
                routers = routerRepo.findBySchoolIdIn(scope);
            }
        }
        return routers.stream().map(this::toDeviceMap).collect(Collectors.toList());
    }

    @GetMapping("/devices/{id}/")
    public ResponseEntity<?> getDevice(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, router.getSchool().getId());
        return ResponseEntity.ok(toDeviceMap(router));
    }

    @PostMapping("/devices/")
    public ResponseEntity<?> createDevice(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        if (schoolVal == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.required"))));
        Long schoolIdVal = Long.valueOf(schoolVal.toString());
        currentUserService.assertCanWriteSchoolData(caller, schoolIdVal);
        com.maktab.model.School school = schoolRepo.findById(schoolIdVal).orElse(null);
        if (school == null) {
            return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.not_found"))));
        }
        if (routerRepo.findBySchoolId(schoolIdVal).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.router.school_already_has_router"))));
        }
        String name = body.get("name") != null ? body.get("name").toString()
            : body.get("deviceName") != null ? body.get("deviceName").toString() : i18n.msg("label.router.defaultName", school.getName());

        MikrotikRouter r = new MikrotikRouter();
        r.setName(name);
        r.setSchool(school);
        Object ip = body.get("ip_address") != null ? body.get("ip_address") : body.get("localIp");
        if (ip != null) r.setVpnIp(ip.toString());
        r.setApiKey(UUID.randomUUID().toString().replace("-", "").substring(0, 24));
        r.setStatus(MikrotikRouter.RouterStatus.OFFLINE);
        routerRepo.save(r);
        return ResponseEntity.ok(toDeviceMap(r));
    }

    @PatchMapping("/devices/{id}/")
    public ResponseEntity<?> updateDevice(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return routerRepo.findById(id).map(r -> {
            currentUserService.assertCanWriteSchoolData(caller, r.getSchool().getId());
            if (body.get("name") != null) r.setName(body.get("name").toString());
            else if (body.get("deviceName") != null) r.setName(body.get("deviceName").toString());
            Object ip = body.get("ip_address") != null ? body.get("ip_address") : body.get("localIp");
            if (ip != null) r.setVpnIp(ip.toString());
            Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
            if (schoolVal != null) {
                Long newSchoolId = Long.valueOf(schoolVal.toString());
                currentUserService.assertCanWriteSchoolData(caller, newSchoolId);
                schoolRepo.findById(newSchoolId).ifPresent(r::setSchool);
            }
            routerRepo.save(r);
            return ResponseEntity.ok(toDeviceMap(r));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/devices/{id}/")
    public ResponseEntity<?> deleteDevice(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        List<com.maktab.model.FaceTerminal> terminals = terminalRepo.findByRouterId(id);
        terminals.forEach(t -> t.setRouterId(null));
        terminalRepo.saveAll(terminals);
        routerRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/devices/{id}/status/")
    public ResponseEntity<?> getDeviceStatus(@PathVariable Long id,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter existing = routerRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, existing.getSchool().getId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", existing.getId());
        m.put("status", existing.getStatus().name().toLowerCase());
        m.put("online", existing.getStatus() == MikrotikRouter.RouterStatus.ONLINE);
        m.put("lastHeartbeat", existing.getLastHeartbeat() != null ? existing.getLastHeartbeat().toString() : null);
        m.put("last_seen", existing.getLastHeartbeat() != null ? existing.getLastHeartbeat().toString() : null);
        return ResponseEntity.ok(m);
    }

    /** DeviceCommand tizimi olib tashlangan — bajaradigan lokal agent yo'q, shuning uchun
     * "qo'llab-quvvatlanmaydi" javobi qaytariladi. */
    @PostMapping("/devices/{id}/sync/")
    public ResponseEntity<?> syncDevice(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("status", "not_supported", "message", i18n.msg("info.device_command.not_supported")));
    }

    @PostMapping("/devices/{id}/pull-logs/")
    public ResponseEntity<?> pullLogs(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
            .body(Map.of("status", "not_supported", "message", i18n.msg("info.device_command.not_supported")));
    }

    @GetMapping("/devices/{id}/sync-logs/")
    public ResponseEntity<?> getDeviceSyncLogs(@PathVariable Long id,
                                                @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, router.getSchool().getId());
        return ResponseEntity.ok(Collections.emptyList());
    }

    @GetMapping("/device-sync-logs/")
    public ResponseEntity<?> getAllSyncLogs(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestParam(required = false) Long deviceId) {
        currentUserService.requireUser(authHeader);
        return ResponseEntity.ok(Collections.emptyList());
    }

    private Map<String, Object> toDeviceMap(MikrotikRouter r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("name", r.getName());
        m.put("deviceName", r.getName());
        com.maktab.model.School school = r.getSchool();
        Long schoolId = school != null ? school.getId() : null;
        m.put("school", schoolId);
        m.put("schoolId", schoolId);
        if (school != null) {
            m.put("school_name", school.getName());
            m.put("schoolName", school.getName());
        }
        m.put("status", r.getStatus() != null ? r.getStatus().name().toLowerCase() : "unknown");
        m.put("ip_address", r.getVpnIp());
        m.put("localIp", r.getVpnIp());
        m.put("last_seen", r.getLastHeartbeat() != null ? r.getLastHeartbeat().toString() : null);
        m.put("lastHeartbeat", r.getLastHeartbeat() != null ? r.getLastHeartbeat().toString() : null);
        m.put("faceTerminalCount", terminalRepo.countByRouterId(r.getId()));
        // Django'dagi kamera-darajasidagi maydonlar (bu schema'da yo'q, comment):
        m.put("brand", null);
        m.put("model", null);
        m.put("port", null);
        m.put("serial_number", null);
        m.put("location", null);
        return m;
    }
}
