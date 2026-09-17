package com.maktab.devices;

import com.maktab.faceterminal.HikvisionIsapiClient;
import com.maktab.faceterminal.TerminalException;
import com.maktab.faceterminal.TrustAllSslContext;
import com.maktab.model.Camera;
import com.maktab.model.FaceTerminal;
import com.maktab.model.MikrotikRouter;
import com.maktab.repository.CameraRepository;
import com.maktab.repository.FaceTerminalRepository;
import com.maktab.util.VpnAddressing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/**
 * Maktab routeri ortidagi LAN'ni VPN orqali skanerlab, Face ID terminallar va kameralarni topadi.
 *
 * Qidiruv maktabning virtual subneti (10.30.N.1–254) bo'ylab ketadi — faqat shu routerga tegishli
 * qurilmalar ko'rinadi. Hikvision qurilmasi PAROLSIZ aniqlanadi (/SDK/activateStatus loginsiz javob
 * beradi, DS-K1T673DX'da sinalgan) — shuning uchun oddiy qidiruv qurilmalarga noto'g'ri parol bilan
 * urinmaydi (Hikvision bir necha xato urinishdan keyin qurilmani bloklaydi). Login berilsa, har bir
 * Hikvision qurilmaga FAQAT BIR marta urinib, model/serial/turi o'qiladi.
 */
@Service
public class DeviceDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(DeviceDiscoveryService.class);

    /** Barcha hostlarda tekshiriladigan portlar: HTTP (ISAPI), RTSP, Dahua. */
    static final int[] PRIMARY_PORTS = {80, 554, 37777};
    /** Faqat javob bergan hostlarda qo'shimcha: HTTPS, Hikvision SDK. */
    static final int[] SECONDARY_PORTS = {443, 8000};
    static final int CONNECT_TIMEOUT_MS = 700;
    static final Duration SCAN_DEADLINE = Duration.ofSeconds(75);

    @Autowired private VpnAddressing vpn;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private CameraRepository cameraRepo;

    private final ExecutorService pool = Executors.newFixedThreadPool(48, r -> {
        Thread t = new Thread(r, "device-discovery");
        t.setDaemon(true);
        return t;
    });
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    /** Ba'zi qurilmalar (masalan Hikvision "HTTPS majburiy" rejimida) port 80'da 30x bilan
     * https'ga yo'naltiradi — o'z-o'zidan imzolangan sertifikat bilan, shu sabab alohida klient. */
    private final HttpClient httpsClient;
    {
        javax.net.ssl.SSLParameters noHostnameCheck = new javax.net.ssl.SSLParameters();
        noHostnameCheck.setEndpointIdentificationAlgorithm("");
        httpsClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2))
            .sslContext(TrustAllSslContext.INSTANCE).sslParameters(noHostnameCheck).build();
    }

    public record Found(String lanIp, String reachableIp, List<Integer> openPorts, String vendor,
                        Boolean activated, String category, String deviceType, String model,
                        String serialNumber, String firmwareVersion, String loginError,
                        Long registeredTerminalId, Long registeredCameraId, boolean httpsOnly) {}

    public record ScanResult(String mappedSubnet, String lanSubnet, int hostsScanned, List<Found> devices,
                             boolean timedOut) {}

    /** @return empty — shu router uchun qidiruv allaqachon ketmoqda */
    public Optional<ScanResult> scan(MikrotikRouter router, String username, String password) {
        if (!running.add(router.getId())) return Optional.empty();
        try {
            return Optional.of(doScan(router, username, password));
        } finally {
            running.remove(router.getId());
        }
    }

    private ScanResult doScan(MikrotikRouter router, String username, String password) {
        String mapped = vpn.mappedSubnet(router);
        String lan = vpn.lanSubnet(router);
        String mappedPrefix = mapped.substring(0, mapped.lastIndexOf('.') + 1);
        String lanPrefix = lan.substring(0, lan.lastIndexOf('.') + 1);
        boolean withLogin = username != null && !username.isBlank() && password != null && !password.isBlank();

        Map<String, Long> terminalsByIp = new HashMap<>();
        for (FaceTerminal t : terminalRepo.findBySchoolId(router.getSchool().getId())) {
            if (t.getIpAddress() != null) terminalsByIp.put(t.getIpAddress().trim(), t.getId());
        }
        Map<String, Long> camerasByIp = new HashMap<>();
        for (Camera c : cameraRepo.findBySchoolId(router.getSchool().getId())) {
            if (c.getIpAddress() != null) camerasByIp.put(c.getIpAddress().trim(), c.getId());
        }

        List<Future<Found>> futures = new ArrayList<>();
        for (int host = 1; host <= 254; host++) {
            final String reachable = mappedPrefix + host;
            final String lanIp = lanPrefix + host;
            futures.add(pool.submit(() -> probeHost(reachable, lanIp, withLogin, username, password,
                terminalsByIp.get(lanIp), camerasByIp.get(lanIp))));
        }

        long deadline = System.nanoTime() + SCAN_DEADLINE.toNanos();
        List<Found> found = new ArrayList<>();
        boolean timedOut = false;
        for (Future<Found> f : futures) {
            long left = deadline - System.nanoTime();
            if (left <= 0) {
                timedOut = true;
                f.cancel(true);
                continue;
            }
            try {
                Found r = f.get(left, TimeUnit.NANOSECONDS);
                if (r != null) found.add(r);
            } catch (TimeoutException e) {
                timedOut = true;
                f.cancel(true);
            } catch (Exception e) {
                log.debug("Qidiruv xatosi: {}", e.toString());
            }
        }
        found.sort(Comparator.comparingInt(d -> Integer.parseInt(d.lanIp().substring(d.lanIp().lastIndexOf('.') + 1))));
        log.info("Qurilma qidiruvi: router {} ({}) — {} ta qurilma topildi{}", router.getId(), mapped, found.size(),
            timedOut ? " (vaqt tugadi)" : "");
        return new ScanResult(mapped, lan, 254, found, timedOut);
    }

    Found probeHost(String reachable, String lanIp, boolean withLogin, String username, String password,
                    Long terminalId, Long cameraId) {
        List<Integer> open = new ArrayList<>();
        for (int p : PRIMARY_PORTS) if (isOpen(reachable, p)) open.add(p);
        if (open.isEmpty()) return null;
        for (int p : SECONDARY_PORTS) if (isOpen(reachable, p)) open.add(p);

        String vendor = "unknown";
        Boolean activated = null;
        boolean httpsOnly = false;
        if (open.contains(80)) {
            String activate = get("http://" + reachable + "/SDK/activateStatus");
            if (activate != null && activate.contains("<ActivateStatus")) {
                vendor = "hikvision";
                activated = activate.contains("<Activated>true</Activated>");
            } else {
                String root = get("http://" + reachable + "/");
                if (root != null && root.contains("RouterOS")) vendor = "mikrotik";
            }
        }
        // Port 80 ochiq bo'lsa ham ba'zi qurilmalar (masalan "HTTPS majburiy" Hikvision) har doim
        // 30x bilan https'ga yo'naltiradi — bunday holda yuqoridagi oddiy HTTP so'rovi hech qachon
        // 200/ActivateStatus qaytarmaydi. Port 443 ochiq bo'lsa https orqali qayta urinamiz.
        if ("unknown".equals(vendor) && open.contains(443)) {
            String activate = getSecure("https://" + reachable + ":443/SDK/activateStatus");
            if (activate != null && activate.contains("<ActivateStatus")) {
                vendor = "hikvision";
                activated = activate.contains("<Activated>true</Activated>");
                httpsOnly = true;
            }
        }
        if ("unknown".equals(vendor) && open.contains(37777)) vendor = "dahua";

        // Hikvision Face ID terminalida ham RTSP (554) ochiq — shuning uchun Hikvision qurilmasining turi
        // faqat login bilan (deviceType) aniqlanadi; loginsiz "camera" deb chalg'itilmaydi.
        String category = "mikrotik".equals(vendor) ? "router"
            : (!"hikvision".equals(vendor) && open.contains(554) ? "camera" : "unknown");
        String deviceType = null, model = null, serial = null, fw = null, loginError = null;
        if ("hikvision".equals(vendor) && withLogin && Boolean.TRUE.equals(activated)) {
            try {
                String base = httpsOnly ? "https://" + reachable + ":443" : "http://" + reachable + ":80";
                HikvisionIsapiClient.DeviceInfo info = new HikvisionIsapiClient(base, username, password).deviceInfo();
                deviceType = info.deviceType();
                model = info.model();
                serial = info.serialNumber();
                fw = info.firmwareVersion();
                category = categoryOf(deviceType);
            } catch (TerminalException e) {
                loginError = e.getMessage();
            }
        } else if ("hikvision".equals(vendor) && Boolean.FALSE.equals(activated)) {
            loginError = "Qurilma faollashtirilmagan — avval SADP yoki qurilma ekranida parol o'rnating";
        }
        return new Found(lanIp, reachable, open, vendor, activated, category, deviceType, model, serial, fw,
            loginError, terminalId, cameraId, httpsOnly);
    }

    /** Hikvision deviceType -> platforma toifasi. */
    static String categoryOf(String deviceType) {
        if (deviceType == null) return "unknown";
        String t = deviceType.trim().toUpperCase(Locale.ROOT);
        if (t.equals("ACS") || t.contains("ACCESS")) return "faceTerminal";
        if (t.contains("NVR") || t.contains("DVR")) return "recorder";
        if (t.contains("IPC") || t.contains("CAMERA") || t.contains("DOME")) return "camera";
        return "unknown";
    }

    private boolean isOpen(String host, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String get(String url) {
        try {
            HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(3)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
            return r.statusCode() == 200 ? r.body() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String getSecure(String url) {
        try {
            HttpResponse<String> r = httpsClient.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(3)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
            return r.statusCode() == 200 ? r.body() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @PreDestroy
    void shutdown() {
        pool.shutdownNow();
    }
}
