package com.maktab.controller;

import com.maktab.model.FaceTerminal;
import com.maktab.model.MikrotikRouter;
import com.maktab.model.User;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import com.maktab.util.VpnAddressing;
import com.maktab.util.WireguardKeyUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Qurilmalar boshqaruvi — Mikrotik router + Face ID terminallar.
 *
 * OQIM: har bir maktabda bitta Mikrotik router VPN tunnel orqali markaziy platformaga
 * ulanadi (lokal mini-PC gateway yo'q). Face ID terminallar shu router bilan bog'liq
 * holda ro'yxatga olinadi, VPN ichidagi lokal IP orqali murojaat qiladi.
 * Davomat/heartbeat oqimlari (AttendanceController) MikrotikRouter.apiKey orqali
 * autentifikatsiya qiladi.
 */
@RestController
@RequestMapping("/api/routers")
public class RouterController {

    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private ProvinceRepository provinceRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;
    @Autowired private VpnAddressing vpn;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  WIREGUARD VPN SOZLAMALARI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MUHIM: markaziy WireGuard VPN server hali o'rnatilmagan (2026-08-10). Shu sabab
    // server-public-key/server-endpoint standart bo'sh — server o'rnatilgach ENV orqali
    // to'ldiriladi. Shu vaqtgacha routerlar uchun kalit juftligi baribir generatsiya
    // qilinadi (WireguardKeyUtil), faqat yaratilgan konfiguratsiyada bu ochiq aytiladi
    // ("serverConfigured": false) — soxta/ishlamaydigan sozlamani jim yashirmaslik uchun.
    @Value("${app.wireguard.server-public-key:}") private String wgServerPublicKey;
    @Value("${app.wireguard.server-endpoint:}") private String wgServerEndpoint;
    @Value("${app.wireguard.server-port:51820}") private String wgServerPort;
    @Value("${app.wireguard.subnet-base:10.20.0}") private String wgSubnetBase;
    @Value("${app.wireguard.allowed-ips:10.20.0.0/24}") private String wgAllowedIps;

    @ExceptionHandler(com.maktab.faceterminal.TerminalException.class)
    public ResponseEntity<?> onDeviceError(com.maktab.faceterminal.TerminalException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
    }

    private boolean wgServerConfigured() {
        return wgServerPublicKey != null && !wgServerPublicKey.isBlank()
            && wgServerEndpoint != null && !wgServerEndpoint.isBlank();
    }

    /** Mavjud routerlar orasida band bo'lmagan keyingi VPN IP'ni tanlaydi (subnet ichida, .2 dan boshlab — .1 serverga ajratilgan). */
    private String nextFreeVpnIp() {
        Set<Integer> used = new HashSet<>();
        Pattern p = Pattern.compile(Pattern.quote(wgSubnetBase) + "\\.(\\d+)");
        for (MikrotikRouter r : routerRepo.findAll()) {
            if (r.getVpnIp() == null) continue;
            Matcher m = p.matcher(r.getVpnIp());
            if (m.find()) used.add(Integer.parseInt(m.group(1)));
        }
        // .254 backend gateway'iga ajratilgan (VpnAddressing#gatewayIp)
        for (int i = 2; i < 254; i++) {
            if (!used.contains(i)) return wgSubnetBase + "." + i + "/32";
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, i18n.msg("error.router.subnet_full"));
    }

    private String buildWgConfig(MikrotikRouter r) {
        StringBuilder sb = new StringBuilder();
        sb.append("[Interface]\n");
        sb.append("PrivateKey = ").append(r.getWgPrivateKey()).append('\n');
        sb.append("Address = ").append(vpn.routerTunnelAddress(r)).append('\n');
        sb.append('\n');
        sb.append("[Peer]\n");
        if (wgServerConfigured()) {
            sb.append("PublicKey = ").append(wgServerPublicKey).append('\n');
            sb.append("Endpoint = ").append(wgServerEndpoint).append(':').append(wgServerPort).append('\n');
        } else {
            sb.append("# TODO: markaziy VPN server hali sozlanmagan — PublicKey/Endpoint admin tomonidan to'ldiriladi\n");
            sb.append("PublicKey = <SERVER_PUBLIC_KEY>\n");
            sb.append("Endpoint = <SERVER_HOST>:").append(wgServerPort).append('\n');
        }
        sb.append("AllowedIPs = ").append(vpn.tunnelSubnet()).append('\n');
        sb.append("PersistentKeepalive = 25\n");
        return sb.toString();
    }

    /**
     * Mikrotik terminaliga bitta nusxalab qo'yiladigan to'liq sozlash skripti.
     *
     * Dizayn qoidalari:
     *  - Hammasi bitta { } blok ichida: xato (masalan LAN topilmasa) butun skriptni to'xtatadi,
     *    terminalda qatorma-qator yarim bajarilib qolmaydi.
     *  - Idempotent: faqat "maktab_davomad" izohli / wg-maktab interfeysiga tegishli yozuvlar
     *    o'chirilib qayta qo'shiladi — mavjud firewall/NAT qoidalariga tegilmaydi, qayta qo'yish xavfsiz.
     *  - /tool fetch va scheduler ishlatilmaydi — RouterOS 7 "device-mode=home" ularni bloklaydi.
     *  - Netmap: server maktab LAN'ini 10.30.N.0/24 orqali ko'radi (to'qnashuvsiz), faqat backend
     *    gateway (10.20.0.254) dan kelgan trafikka ruxsat beriladi.
     */
    private String buildRouterOsScript(MikrotikRouter r) {
        final String iface = "wg-maktab";
        final String tag = "maktab_davomad";
        String lan = vpn.lanSubnet(r);
        String lanNetwork = lan.substring(0, lan.indexOf('/'));
        String mapped = vpn.mappedSubnet(r);
        String gw = vpn.gatewayIp();
        // Faqat izoh qatorida ishlatiladi; RouterOS terminali UTF-8'ni buzgani uchun ASCII'dan tashqari
        // belgilar va skriptni buzishi mumkin bo'lgan belgilar almashtiriladi.
        String schoolName = r.getSchool() != null && r.getSchool().getName() != null
            ? r.getSchool().getName().replaceAll("[^\\x20-\\x7E]", "?").replaceAll("[\"\\\\$]", " ") : "";
        String hubKey = wgServerConfigured() ? wgServerPublicKey : "<SERVER_PUBLIC_KEY>";
        String hubHost = wgServerConfigured() ? wgServerEndpoint : "<SERVER_HOST>";

        StringBuilder sb = new StringBuilder();
        sb.append("# maktab_davomad - ").append(schoolName).append(" (router #").append(r.getId()).append(")\n");
        sb.append("# WinBox > New Terminal oynasiga TO'LIQ nusxalab qo'ying. Qayta qo'yish xavfsiz.\n");
        if (!wgServerConfigured()) {
            sb.append("# DIQQAT: markaziy VPN server hali sozlanmagan - <SERVER_...> qiymatlarini admin to'ldirishi kerak.\n");
        }
        sb.append("{\n");
        sb.append(":local wgIf \"").append(iface).append("\"\n");
        sb.append(":local tag \"").append(tag).append("\"\n");
        sb.append(":if ([:len [/ip address find where network=\"").append(lanNetwork).append("\"]] = 0) do={\n");
        sb.append("  :error \"").append(tag).append(": bu routerda ").append(lan)
          .append(" LAN topilmadi. Paneldagi LAN subnetni to'g'rilab, skriptni qayta oling.\"\n");
        sb.append("}\n\n");

        sb.append("# 1. WireGuard interfeysi\n");
        sb.append(":if ([:len [/interface wireguard find where name=$wgIf]] = 0) do={\n");
        sb.append("  /interface wireguard add name=$wgIf mtu=1420 private-key=\"").append(r.getWgPrivateKey()).append("\" comment=$tag\n");
        sb.append("} else={\n");
        sb.append("  /interface wireguard set [find where name=$wgIf] mtu=1420 private-key=\"").append(r.getWgPrivateKey()).append("\" comment=$tag disabled=no\n");
        sb.append("}\n\n");

        sb.append("# 2. Tunnel manzili\n");
        sb.append("/ip address remove [find where interface=$wgIf]\n");
        sb.append("/ip address add address=").append(vpn.routerTunnelAddress(r)).append(" interface=$wgIf comment=$tag\n\n");

        sb.append("# 3. Markaziy server\n");
        sb.append("/interface wireguard peers remove [find where interface=$wgIf]\n");
        sb.append("/interface wireguard peers add interface=$wgIf public-key=\"").append(hubKey).append("\"")
          .append(" endpoint-address=").append(hubHost).append(" endpoint-port=").append(wgServerPort)
          .append(" allowed-address=").append(vpn.tunnelSubnet())
          .append(" persistent-keepalive=25s comment=$tag\n\n");

        sb.append("# 4. Server maktab LAN'ini ").append(mapped).append(" orqali ko'radi (netmap -> ").append(lan).append(")\n");
        sb.append("/ip firewall nat remove [find where comment~\"^").append(tag).append("\"]\n");
        sb.append(":local natTop [/ip firewall nat find]\n");
        sb.append(":if ([:len $natTop] > 0) do={\n");
        sb.append("  /ip firewall nat add chain=srcnat src-address=").append(gw).append(" dst-address=").append(lan)
          .append(" action=masquerade comment=\"").append(tag).append(": server -> LAN\" place-before=[:pick $natTop 0]\n");
        sb.append("} else={\n");
        sb.append("  /ip firewall nat add chain=srcnat src-address=").append(gw).append(" dst-address=").append(lan)
          .append(" action=masquerade comment=\"").append(tag).append(": server -> LAN\"\n");
        sb.append("}\n");
        sb.append(":set natTop [/ip firewall nat find]\n");
        sb.append("/ip firewall nat add chain=dstnat in-interface=$wgIf dst-address=").append(mapped)
          .append(" action=netmap to-addresses=").append(lan)
          .append(" comment=\"").append(tag).append(": netmap\" place-before=[:pick $natTop 0]\n\n");

        sb.append("# 5. Firewall: faqat server gateway'i (").append(gw).append(") LAN'ga kira oladi\n");
        sb.append("/ip firewall filter remove [find where comment~\"^").append(tag).append("\"]\n");
        sb.append(":local fTop [/ip firewall filter find]\n");
        sb.append(":if ([:len $fTop] > 0) do={\n");
        sb.append("  /ip firewall filter add chain=forward in-interface=$wgIf src-address=").append(gw).append(" dst-address=").append(lan)
          .append(" action=accept comment=\"").append(tag).append(": server -> LAN\" place-before=[:pick $fTop 0]\n");
        sb.append("} else={\n");
        sb.append("  /ip firewall filter add chain=forward in-interface=$wgIf src-address=").append(gw).append(" dst-address=").append(lan)
          .append(" action=accept comment=\"").append(tag).append(": server -> LAN\"\n");
        sb.append("}\n");
        // drop qoidasi accept'dan keyin, lekin mavjud qoidalardan OLDIN turishi kerak
        sb.append(":set fTop [/ip firewall filter find]\n");
        sb.append(":if ([:len $fTop] > 1) do={\n");
        sb.append("  /ip firewall filter add chain=forward in-interface=$wgIf action=drop comment=\"").append(tag)
          .append(": boshqa VPN trafik\" place-before=[:pick $fTop 1]\n");
        sb.append("} else={\n");
        sb.append("  /ip firewall filter add chain=forward in-interface=$wgIf action=drop comment=\"").append(tag)
          .append(": boshqa VPN trafik\"\n");
        sb.append("}\n\n");

        sb.append("# 6. Input: hub javobi RouterOS defconf \"drop all not coming from LAN\" qoidasi tomonidan\n");
        sb.append("# o'chirilmasligi uchun. RouterOS UDP connection-tracking muddati qisqa (odatda ~10s) -\n");
        sb.append("# birinchi handshake javobi kelguncha \"established\" holati tugab ketishi mumkin, shunda\n");
        sb.append("# keyingi javob \"WAN'dan kelgan yangi paket\" deb hisoblanib o'chiriladi (2026-09-16 jonli\n");
        sb.append("# routerda aniqlangan va tasdiqlangan). Port bo'yicha moslash - hub IP o'zgarsa ham ishlaydi.\n");
        sb.append(":local wgPort [/interface wireguard get $wgIf listen-port]\n");
        sb.append("/ip firewall filter remove [find where comment=\"").append(tag).append(": hub javobi\"]\n");
        sb.append(":local iTop [/ip firewall filter find where chain=input]\n");
        sb.append(":if ([:len $iTop] > 0) do={\n");
        sb.append("  /ip firewall filter add chain=input protocol=udp dst-port=$wgPort action=accept comment=\"")
          .append(tag).append(": hub javobi\" place-before=[:pick $iTop 0]\n");
        sb.append("} else={\n");
        sb.append("  /ip firewall filter add chain=input protocol=udp dst-port=$wgPort action=accept comment=\"")
          .append(tag).append(": hub javobi\"\n");
        sb.append("}\n\n");

        sb.append(":put \"").append(tag).append(": sozlash tugadi. 1 daqiqa ichida panelda router ONLINE bo'lishi kerak.\"\n");
        sb.append("}\n");
        return sb.toString();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  PLATFORMADAN KALIT YARATISH (ADMIN)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Admin maktab uchun router yozuvi + apiKey + WireGuard kalit juftligi yaratadi — POST /api/routers/create-key */
    @PostMapping("/create-key")
    public ResponseEntity<?> createKey(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        if (body.get("schoolId") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.required")));
        }
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        currentUserService.assertCanWriteSchoolData(caller, schoolId);
        com.maktab.model.School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));
        }
        if (routerRepo.findBySchoolId(schoolId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.school_already_has_router")));
        }

        String apiKey = UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        String name = body.get("name") != null && !body.get("name").toString().isBlank()
            ? body.get("name").toString() : i18n.msg("label.router.defaultName", school.getName());
        WireguardKeyUtil.KeyPairB64 wg = WireguardKeyUtil.generate();
        // MUHIM (2026-09-18 audit): qo'lda kiritilgan vpnIp avval hech qanday NOYOBLIK
        // tekshiruvisiz saqlanardi — ikkita router bir xil oktetga ega bo'lsa, hub ularning
        // maktab LAN'larini (10.30.N.0/24) bir-biriga aralashtirib yuborardi. Endi taqiqlangan
        // (gateway) va band bo'lgan qiymatlar rad etiladi.
        String vpnIp;
        if (body.get("vpnIp") != null && !body.get("vpnIp").toString().isBlank()) {
            vpnIp = body.get("vpnIp").toString();
            if (vpnIp.equals(vpn.gatewayIp()) || vpnIp.startsWith(vpn.gatewayIp() + "/")) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.vpn_ip_reserved")));
            }
            boolean taken = routerRepo.findAll().stream().anyMatch(r -> vpnIp.equals(r.getVpnIp()));
            if (taken) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.vpn_ip_taken")));
            }
        } else {
            vpnIp = nextFreeVpnIp();
        }
        String lanSubnet = VpnAddressing.DEFAULT_LAN_SUBNET;
        if (body.get("lanSubnet") != null && !body.get("lanSubnet").toString().isBlank()) {
            lanSubnet = vpn.normalizeLanSubnet(body.get("lanSubnet").toString());
            if (lanSubnet == null) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.invalid_lan_subnet")));
            }
        }

        MikrotikRouter router = new MikrotikRouter();
        router.setSchool(school);
        router.setName(name);
        router.setVpnIp(vpnIp);
        router.setLanSubnet(lanSubnet);
        router.setApiKey(apiKey);
        router.setWgPrivateKey(wg.privateKeyB64());
        router.setWgPublicKey(wg.publicKeyB64());
        router.setStatus(MikrotikRouter.RouterStatus.OFFLINE);
        router.setNotes((String) body.get("notes"));
        routerRepo.save(router);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", router.getId());
        result.put("apiKey", apiKey);
        result.put("schoolName", school.getName());
        result.put("vpnIp", vpnIp);
        result.put("wgPublicKey", wg.publicKeyB64());
        result.put("serverConfigured", wgServerConfigured());
        result.put("message", i18n.msg("success.router.key_created"));
        return ResponseEntity.ok(result);
    }

    /** WireGuard .conf konfiguratsiyasi — GET /api/routers/{id}/wg-config */
    @GetMapping("/{id}/wg-config")
    public ResponseEntity<?> getWgConfig(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        // MUHIM (2026-09-18 audit): avval assertCanAccessSchool (KO'RISH darajasi) edi —
        // TEACHER ham (faqat ko'rish huquqiga ega bo'lsa-da) routerning WireGuard MAXFIY
        // kalitini (wgPrivateKey) o'z ichiga olgan to'liq .conf faylini ola olardi. Bu
        // amalda VPN'ni to'liq soxtalashtirish imkonini beradi, shuning uchun YOZISH darajasi
        // (assertCanWriteSchoolData) talab qilinadi — TEACHER bunga kira olmaydi.
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        return ResponseEntity.ok(Map.of(
            "config", buildWgConfig(router),
            "serverConfigured", wgServerConfigured()
        ));
    }

    /** RouterOS (Mikrotik CLI) skripti — GET /api/routers/{id}/wg-script */
    @GetMapping("/{id}/wg-script")
    public ResponseEntity<?> getWgScript(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        // MUHIM (2026-09-18 audit): getWgConfig bilan bir xil sabab — skript ham
        // wgPrivateKey'ni o'z ichiga oladi, shuning uchun YOZISH darajasi talab qilinadi.
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        return ResponseEntity.ok(Map.of(
            "script", buildRouterOsScript(router),
            "serverConfigured", wgServerConfigured()
        ));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  ROUTERLAR RO'YXATI (HIERARCHICAL)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Barcha routerlar — GET /api/routers?schoolId=2&provinceId=1&districtId=3
     * MUHIM: schoolId/provinceId/districtId faqat SUPERADMIN uchun ixtiyoriy tor filtr —
     * boshqa rollar uchun haqiqiy ko'lam Authorization headerdagi foydalanuvchidan olinadi. */
    @GetMapping
    public List<Map<String, Object>> getAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) Long districtId) {

        User user = currentUserService.requireUser(authHeader);
        List<MikrotikRouter> routers;

        if (user.getRole() == User.Role.DIRECTOR || user.getRole() == User.Role.MUDIR
                || user.getRole() == User.Role.TEACHER) {
            routers = user.getSchoolId() != null
                ? routerRepo.findBySchoolId(user.getSchoolId()).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        } else if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (schoolId != null) {
                if (!currentUserService.canAccessSchool(user, schoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
                }
                routers = routerRepo.findBySchoolId(schoolId).map(List::of).orElse(Collections.emptyList());
            } else if (districtId != null) {
                if (!currentUserService.canAccessDistrict(user, districtId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
                }
                List<Long> schoolIds = schoolRepo.findByDistrictId(districtId)
                    .stream().map(s -> s.getId()).collect(Collectors.toList());
                routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
            } else {
                List<Long> schoolIds = currentUserService.schoolIdsForProvince(user.getProvinceId());
                routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
            }
        } else if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (schoolId != null) {
                if (!currentUserService.canAccessSchool(user, schoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
                }
                routers = routerRepo.findBySchoolId(schoolId).map(List::of).orElse(Collections.emptyList());
            } else {
                List<Long> schoolIds = currentUserService.schoolIdsForDistrict(user.getDistrictId());
                routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
            }
        } else { // SUPERADMIN / ADMIN — cheklovsiz, ixtiyoriy tor filtr
            if (schoolId != null) {
                routers = routerRepo.findBySchoolId(schoolId).map(List::of).orElse(Collections.emptyList());
            } else if (districtId != null) {
                List<Long> schoolIds = schoolRepo.findByDistrictId(districtId)
                    .stream().map(s -> s.getId()).collect(Collectors.toList());
                routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
            } else if (provinceId != null) {
                List<Long> districtIds = districtRepo.findByProvinceId(provinceId)
                    .stream().map(d -> d.getId()).collect(Collectors.toList());
                List<Long> schoolIds = districtIds.isEmpty() ? Collections.emptyList() :
                    schoolRepo.findByDistrictIdIn(districtIds)
                        .stream().map(s -> s.getId()).collect(Collectors.toList());
                routers = schoolIds.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(schoolIds);
            } else {
                routers = routerRepo.findAll();
            }
        }

        List<Long> routerIds = routers.stream().map(MikrotikRouter::getId).collect(Collectors.toList());
        List<FaceTerminal> allTerminals = routerIds.isEmpty() ? Collections.emptyList()
            : terminalRepo.findByRouterIdIn(routerIds);
        Map<Long, List<FaceTerminal>> terminalsByRouter = allTerminals.stream()
            .collect(Collectors.groupingBy(FaceTerminal::getRouterId));

        return routers.stream()
            .map(r -> toRouterMap(r, terminalsByRouter.getOrDefault(r.getId(), Collections.emptyList())))
            .collect(Collectors.toList());
    }

    /** Bitta router — GET /api/routers/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, router.getSchool().getId());
        List<FaceTerminal> terminals = terminalRepo.findByRouterId(router.getId());
        return ResponseEntity.ok(toRouterMap(router, terminals));
    }

    /** Router boshqa maktabga biriktirish */
    @PutMapping("/{id}/assign-school")
    public ResponseEntity<?> assignSchool(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        Long sid = Long.valueOf(body.get("schoolId").toString());
        currentUserService.assertCanWriteSchoolData(caller, sid);
        com.maktab.model.School school = schoolRepo.findById(sid).orElse(null);
        if (school == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));
        }
        if (routerRepo.findBySchoolId(sid).filter(r -> !r.getId().equals(id)).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.school_already_has_router")));
        }
        router.setSchool(school);
        routerRepo.save(router);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.router.assigned_to_school")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());
        // Terminallar o'chirilmaydi — schoolId orqali maktabga bog'liqligicha qoladi, faqat router
        // biriktirmasi tozalanadi.
        List<FaceTerminal> terminals = terminalRepo.findByRouterId(id);
        terminals.forEach(t -> t.setRouterId(null));
        terminalRepo.saveAll(terminals);
        routerRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Router tahrirlash — PUT /api/routers/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return routerRepo.findById(id).<ResponseEntity<?>>map(r -> {
            currentUserService.assertCanWriteSchoolData(caller, r.getSchool().getId());
            if (body.containsKey("name")) r.setName((String) body.get("name"));
            // MUHIM (2026-09-18 audit): vpnIp bu yerdan OLIB TASHLANDI — maktab darajasidagi
            // DIRECTOR/MUDIR ham (assertCanWriteSchoolData ularga ruxsat beradi) o'z
            // routerining vpnIp'ini boshqa maktabning tunnel manzili yoki backend gateway
            // IP'siga (10.20.0.254) o'zgartirib, hub marshrutlashini o'g'irlashi mumkin edi.
            // vpnIp endi FAQAT yaratishda (createKey) tayinlanadi va o'zgarmas qoladi.
            if (body.containsKey("lanSubnet")) {
                Object raw = body.get("lanSubnet");
                if (raw == null || raw.toString().isBlank()) {
                    r.setLanSubnet(null); // bo'sh — standart 192.168.88.0/24 (VpnAddressing#lanSubnet)
                } else {
                    String lan = vpn.normalizeLanSubnet(raw.toString());
                    if (lan == null) {
                        return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.invalid_lan_subnet")));
                    }
                    r.setLanSubnet(lan);
                }
            }
            if (body.containsKey("notes")) r.setNotes((String) body.get("notes"));
            if (body.containsKey("routerAdminUsername")) r.setRouterAdminUsername((String) body.get("routerAdminUsername"));
            // Parol bo'sh yuborilsa eskisi saqlanadi — Face ID/kamera devicePassword bilan bir xil naqsh
            if (body.get("routerAdminPassword") != null && !body.get("routerAdminPassword").toString().isBlank()) {
                r.setRouterAdminPassword((String) body.get("routerAdminPassword"));
            }
            routerRepo.save(r);
            return ResponseEntity.ok(toRouterMap(r, terminalRepo.findByRouterId(r.getId())));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Routerning o'z ARP/DHCP jadvalidan haqiqiy ulangan qurilmalar ro'yxati — "Terminal qo'shish"
     * formasida IP maydonini to'ldirish uchun (2026-09-16 so'ralgan). DeviceDiscoveryService'dagi
     * port-skanerlashdan farqli — router o'zi allaqachon bilgan qurilmalarni DARHOL qaytaradi,
     * ochiq portlarga bog'liq emas. Router admin logini sozlanmagan bo'lsa aniq xabar bilan rad etiladi.
     */
    @GetMapping("/{id}/lan-hosts")
    public ResponseEntity<?> lanHosts(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(id).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, router.getSchool().getId());

        if (router.getRouterAdminUsername() == null || router.getRouterAdminUsername().isBlank()
                || router.getRouterAdminPassword() == null || router.getRouterAdminPassword().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", i18n.msg("error.router.admin_credentials_missing")));
        }

        String ownLan = vpn.routerOwnLanIp(router);
        String reachable = vpn.toReachableIp(router, ownLan);
        if (reachable == null) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", i18n.msg("error.router.own_ip_unreachable")));
        }
        var client = new com.maktab.devices.MikrotikRestClient("http://" + reachable,
            router.getRouterAdminUsername(), router.getRouterAdminPassword());
        List<com.maktab.devices.MikrotikRestClient.LanHost> hosts = client.lanHosts();

        Map<String, Long> terminalsByIp = terminalRepo.findByRouterId(id).stream()
            .filter(t -> t.getIpAddress() != null)
            .collect(Collectors.toMap(t -> t.getIpAddress().trim(), FaceTerminal::getId, (a, b) -> a));

        List<Map<String, Object>> result = hosts.stream()
            .filter(h -> !h.ipAddress().equals(ownLan)) // routerning o'zini ro'yxatga qo'shmaymiz
            .sorted(Comparator.comparing(h -> ipSortKey(h.ipAddress())))
            .map(h -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("ipAddress", h.ipAddress());
                m.put("macAddress", h.macAddress());
                m.put("hostName", h.hostName());
                m.put("registeredTerminalId", terminalsByIp.get(h.ipAddress()));
                return m;
            }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("hosts", result));
    }

    private static String ipSortKey(String ip) {
        String[] parts = ip.split("\\.");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) sb.append(String.format("%3s", p));
        return sb.toString();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  FACE ID TERMINALLAR BOSHQARUVI
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @GetMapping("/{routerId}/terminals")
    public ResponseEntity<?> getTerminals(@PathVariable Long routerId,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(routerId).orElse(null);
        if (router == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(caller, router.getSchool().getId());
        return ResponseEntity.ok(terminalRepo.findByRouterId(routerId).stream()
            .map(this::toTerminalMap).collect(Collectors.toList()));
    }

    @PostMapping("/{routerId}/terminals")
    public ResponseEntity<?> addTerminal(@PathVariable Long routerId,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        MikrotikRouter router = routerRepo.findById(routerId).orElse(null);
        if (router == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.router.not_found")));
        }
        currentUserService.assertCanWriteSchoolData(caller, router.getSchool().getId());

        FaceTerminal t = new FaceTerminal();
        t.setRouterId(routerId);
        t.setSchoolId(router.getSchool().getId());
        t.setName((String) body.getOrDefault("name", "Terminal"));
        t.setSerialNumber((String) body.get("serialNumber"));
        t.setBrand((String) body.getOrDefault("brand", ""));
        t.setModel((String) body.getOrDefault("model", ""));
        t.setMacAddress((String) body.get("macAddress"));
        t.setDirection(FaceTerminal.Direction.valueOf(
            body.getOrDefault("direction", "ENTRANCE").toString()));
        t.setStatus(FaceTerminal.TerminalStatus.OFFLINE);
        t.setIpAddress((String) body.get("ipAddress"));
        t.setPort(body.get("port") != null ? Integer.parseInt(body.get("port").toString()) : null);
        t.setUseHttps(body.get("useHttps") != null && Boolean.parseBoolean(body.get("useHttps").toString()));
        t.setDeviceUsername((String) body.get("deviceUsername"));
        t.setDevicePassword((String) body.get("devicePassword"));
        t.setFirmwareVersion((String) body.get("firmwareVersion"));
        t.setRegisteredFaces(0);
        t.setNotes((String) body.get("notes"));
        t.setCreatedAt(LocalDateTime.now());
        terminalRepo.save(t);

        return ResponseEntity.ok(toTerminalMap(t));
    }

    @PutMapping("/terminals/{id}")
    public ResponseEntity<?> updateTerminal(@PathVariable Long id,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return terminalRepo.findById(id).map(t -> {
            currentUserService.assertCanWriteSchoolData(caller, terminalSchoolId(t));
            if (body.containsKey("name")) t.setName((String) body.get("name"));
            if (body.containsKey("serialNumber")) t.setSerialNumber((String) body.get("serialNumber"));
            if (body.containsKey("model")) t.setModel((String) body.get("model"));
            if (body.containsKey("direction"))
                t.setDirection(FaceTerminal.Direction.valueOf(body.get("direction").toString()));
            if (body.containsKey("ipAddress")) t.setIpAddress((String) body.get("ipAddress"));
            if (body.containsKey("port")) t.setPort(body.get("port") != null ? Integer.parseInt(body.get("port").toString()) : null);
            if (body.containsKey("useHttps")) t.setUseHttps(body.get("useHttps") != null && Boolean.parseBoolean(body.get("useHttps").toString()));
            if (body.containsKey("deviceUsername")) t.setDeviceUsername((String) body.get("deviceUsername"));
            if (body.containsKey("devicePassword") && body.get("devicePassword") != null && !body.get("devicePassword").toString().isBlank()) {
                t.setDevicePassword((String) body.get("devicePassword")); // bo'sh yuborilsa eskisi saqlanadi (panel maskalangan holda ko'rsatadi)
            }
            if (body.containsKey("firmwareVersion")) t.setFirmwareVersion((String) body.get("firmwareVersion"));
            if (body.containsKey("status"))
                t.setStatus(FaceTerminal.TerminalStatus.valueOf(body.get("status").toString()));
            if (body.containsKey("notes")) t.setNotes((String) body.get("notes"));
            terminalRepo.save(t);
            return ResponseEntity.ok(toTerminalMap(t));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/terminals/{id}")
    public ResponseEntity<?> deleteTerminal(@PathVariable Long id,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        return terminalRepo.findById(id).map(t -> {
            currentUserService.assertCanWriteSchoolData(caller, terminalSchoolId(t));
            terminalRepo.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    private Long terminalSchoolId(FaceTerminal t) {
        if (t.getSchoolId() != null) return t.getSchoolId();
        return t.getRouterId() != null
            ? routerRepo.findById(t.getRouterId()).map(r -> r.getSchool().getId()).orElse(null)
            : null;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  OVERVIEW & SCHEDULED
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    @GetMapping("/overview")
    public Map<String, Object> overview(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        List<Long> scope = currentUserService.allowedSchoolIds(user); // null => SUPERADMIN, cheklovsiz

        List<MikrotikRouter> allRouters = scope == null ? routerRepo.findAll()
            : (scope.isEmpty() ? Collections.emptyList() : routerRepo.findBySchoolIdIn(scope));
        List<Long> routerIds = allRouters.stream().map(MikrotikRouter::getId).collect(Collectors.toList());
        List<FaceTerminal> allTerminals = routerIds.isEmpty() ? Collections.emptyList()
            : terminalRepo.findByRouterIdIn(routerIds);

        long online = allRouters.stream().filter(r -> r.getStatus() == MikrotikRouter.RouterStatus.ONLINE).count();
        long offline = allRouters.stream().filter(r -> r.getStatus() == MikrotikRouter.RouterStatus.OFFLINE).count();
        long totalTerminals = allTerminals.size();
        long entranceTerminals = allTerminals.stream()
            .filter(t -> t.getDirection() == FaceTerminal.Direction.ENTRANCE).count();
        long exitTerminals = allTerminals.stream()
            .filter(t -> t.getDirection() == FaceTerminal.Direction.EXIT).count();
        long onlineTerminals = allTerminals.stream()
            .filter(t -> t.getStatus() == FaceTerminal.TerminalStatus.ONLINE).count();

        return Map.of(
            "totalRouters", allRouters.size(),
            "onlineRouters", online,
            "offlineRouters", offline,
            "totalTerminals", totalTerminals,
            "entranceTerminals", entranceTerminals,
            "exitTerminals", exitTerminals,
            "onlineTerminals", onlineTerminals
        );
    }

    /** Router heartbeat — VPN tunnel ichidan (Mikrotik skripti / Cloud ISUP bridge) yuboriladi. */
    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestHeader("X-Api-Key") String apiKey,
                                        @RequestBody(required = false) Map<String, Object> body) {
        MikrotikRouter router = routerRepo.findByApiKey(apiKey).orElse(null);
        if (router == null) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.router.unknown_api_key")));
        }
        // MUHIM (2026-09-18 audit): avval bu yerda vpnIp so'rov tanasidan qabul qilinardi —
        // istalgan router (o'zining haqiqiy, amaldagi API kaliti bilan) heartbeat orqali
        // vpnIp'ni ISTALGAN qiymatga (masalan boshqa maktabning oktetiga yoki backend
        // gateway IP'siga 10.20.0.254) o'zgartirib, hub'ning WireGuard marshrutlashini
        // (AllowedIPs) o'g'irlashi mumkin edi. vpnIp endi FAQAT server tomonidan
        // (createKey#nextFreeVpnIp) tayinlanadi — heartbeat uni hech qachon o'zgartirmaydi.
        router.setStatus(MikrotikRouter.RouterStatus.ONLINE);
        router.setLastHeartbeat(LocalDateTime.now());
        routerRepo.save(router);
        return ResponseEntity.ok(Map.of("status", "ok", "serverTime", LocalDateTime.now().toString()));
    }

    // lastHeartbeat asosan WireGuard handshake vaqtidan keladi (WireguardSyncController#reportHandshakes).
    // Jonli tunnelda handshake ~145s'gacha eskirishi mumkin, shu sabab chegara 3 daqiqa.
    @Scheduled(fixedRate = 60000)
    public void checkOfflineRouters() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(3);
        List<MikrotikRouter> stale = routerRepo.findByLastHeartbeatBefore(threshold);
        for (MikrotikRouter r : stale) {
            if (r.getStatus() != MikrotikRouter.RouterStatus.OFFLINE) {
                r.setStatus(MikrotikRouter.RouterStatus.OFFLINE);
                routerRepo.save(r);
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  MAPPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private Map<String, Object> toRouterMap(MikrotikRouter r, List<FaceTerminal> terminals) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("name", r.getName());
        m.put("vpnIp", r.getVpnIp());
        m.put("lanSubnet", vpn.lanSubnet(r));
        try {
            m.put("mappedSubnet", vpn.mappedSubnet(r));
        } catch (IllegalStateException e) {
            m.put("mappedSubnet", null); // vpnIp qo'lda noto'g'ri kiritilgan bo'lsa ro'yxat yiqilmasin
        }
        m.put("wgPublicKey", r.getWgPublicKey());
        m.put("wgServerConfigured", wgServerConfigured());
        m.put("status", r.getStatus().name());
        m.put("lastHeartbeat", r.getLastHeartbeat() != null ? r.getLastHeartbeat().toString() : null);
        m.put("notes", r.getNotes());
        m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        m.put("routerAdminUsername", r.getRouterAdminUsername());
        m.put("hasRouterAdminPassword", r.getRouterAdminPassword() != null && !r.getRouterAdminPassword().isBlank());

        com.maktab.model.School school = r.getSchool();
        if (school != null) {
            m.put("schoolId", school.getId());
            m.put("schoolName", school.getName());
            if (school.getDistrict() != null) {
                m.put("districtId", school.getDistrict().getId());
                m.put("districtName", school.getDistrict().getName());
                if (school.getDistrict().getProvince() != null) {
                    m.put("provinceId", school.getDistrict().getProvince().getId());
                    m.put("provinceName", school.getDistrict().getProvince().getName());
                }
            }
        }

        long entrance = terminals.stream().filter(t -> t.getDirection() == FaceTerminal.Direction.ENTRANCE).count();
        long exit = terminals.stream().filter(t -> t.getDirection() == FaceTerminal.Direction.EXIT).count();
        m.put("entranceTerminals", entrance);
        m.put("exitTerminals", exit);
        m.put("faceTerminalCount", terminals.size());
        m.put("terminals", terminals.stream().map(this::toTerminalMap).collect(Collectors.toList()));

        return m;
    }

    private Map<String, Object> toTerminalMap(FaceTerminal t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("routerId", t.getRouterId());
        m.put("name", t.getName());
        m.put("serialNumber", t.getSerialNumber());
        m.put("brand", t.getBrand());
        m.put("model", t.getModel());
        m.put("macAddress", t.getMacAddress());
        m.put("direction", t.getDirection().name());
        m.put("status", t.getStatus().name());
        m.put("ipAddress", t.getIpAddress());
        m.put("port", t.getPort());
        m.put("useHttps", Boolean.TRUE.equals(t.getUseHttps()));
        m.put("deviceUsername", t.getDeviceUsername());
        // Parolning o'zi hech qachon qaytarilmaydi — faqat sozlanganmi-yo'qmi (BotConfigController
        // token maskalash naqshiga o'xshash), panel "●●●●●●●● (o'zgartirish uchun qayta kiriting)"
        // ko'rsatishi uchun.
        m.put("hasDevicePassword", t.getDevicePassword() != null && !t.getDevicePassword().isBlank());
        m.put("firmwareVersion", t.getFirmwareVersion());
        m.put("registeredFaces", t.getRegisteredFaces());
        m.put("notes", t.getNotes());
        m.put("lastSeen", t.getLastSeen() != null ? t.getLastSeen().toString() : null);
        m.put("lastEventAt", t.getLastEventAt() != null ? t.getLastEventAt().toString() : null);
        m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
        // FaceTerminalMonitor yozadigan jonli holat maydonlari (panel xatoni ko'rsatishi uchun)
        m.put("lastError", t.getLastError());
        m.put("userCount", t.getUserCount());
        m.put("managed", com.maktab.faceterminal.TerminalEndpointResolver.isHikvision(t)
            && t.getIpAddress() != null && !t.getIpAddress().isBlank()
            && t.getDeviceUsername() != null && !t.getDeviceUsername().isBlank()
            && t.getDevicePassword() != null && !t.getDevicePassword().isBlank());
        return m;
    }
}
