package com.maktab.controller;

import com.maktab.devices.DeviceDiscoveryService;
import com.maktab.model.MikrotikRouter;
import com.maktab.model.User;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Maktab routeri ortidagi qurilmalarni qidirish — POST /api/routers/{routerId}/discover
 *
 * Yozish huquqi talab qilinadi: qidiruv VPN ichida port skanerlash boshlaydi va (berilsa)
 * qurilmalarga login bilan murojaat qiladi. Topilgan qurilmalar DB'ga avtomatik qo'shilmaydi —
 * panel ularni ko'rsatadi, foydalanuvchi tanlab qo'shadi.
 */
@RestController
@RequestMapping("/api/routers")
public class DeviceDiscoveryController {

    private static final Logger log = LoggerFactory.getLogger(DeviceDiscoveryController.class);

    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private DeviceDiscoveryService discovery;
    @Autowired private I18nService i18n;

    @PostMapping("/{routerId}/discover")
    public ResponseEntity<?> discover(@PathVariable Long routerId,
                                      @RequestHeader(value = "Authorization", required = false) String auth,
                                      @RequestBody(required = false) Map<String, Object> body) {
        User user = currentUserService.requireUser(auth);
        MikrotikRouter router = routerRepo.findById(routerId).orElse(null);
        if (router == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", i18n.msg("error.router.not_found")));
        }
        currentUserService.assertCanWriteSchoolData(user, router.getSchool().getId());

        String username = body != null && body.get("username") != null ? body.get("username").toString() : null;
        String password = body != null && body.get("password") != null ? body.get("password").toString() : null;

        Optional<DeviceDiscoveryService.ScanResult> result = discovery.scan(router, username, password);
        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", i18n.msg("error.router.discovery_running")));
        }
        DeviceDiscoveryService.ScanResult r = result.get();
        log.info("AUDIT qurilma qidiruvi: router={} topildi={} login={} user={}", routerId, r.devices().size(),
            username != null && !username.isBlank(), user.getId());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("routerId", routerId);
        m.put("routerOnline", router.getStatus() == MikrotikRouter.RouterStatus.ONLINE);
        m.put("lanSubnet", r.lanSubnet());
        m.put("mappedSubnet", r.mappedSubnet());
        m.put("hostsScanned", r.hostsScanned());
        m.put("timedOut", r.timedOut());
        m.put("devices", r.devices());
        return ResponseEntity.ok(m);
    }
}
