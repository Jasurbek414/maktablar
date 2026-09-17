package com.maktab.faceterminal;

import com.maktab.model.Camera;
import com.maktab.model.FaceTerminal;
import com.maktab.model.MikrotikRouter;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.util.VpnAddressing;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Maktab LAN'idagi qurilmaga (Face ID terminal, kamera) backend qaysi manzil orqali yetishini aniqlaydi.
 *
 * Qurilmaning ipAddress maydoni — MAKTAB LAN'idagi haqiqiy IP (masalan 192.168.88.253). Qurilma
 * maktab routeriga tegishli bo'lsa, backend unga VPN orqali maktabning virtual subneti
 * (VpnAddressing: 10.30.N.253) bilan murojaat qiladi — LAN IP'lari maktablar orasida takrorlanadi.
 *
 * Terminal routerga to'g'ridan-to'g'ri bog'langan (routerId); kamera esa maktabga — har bir
 * maktabda bitta router bo'lgani uchun router maktab orqali topiladi.
 */
@Component
public class TerminalEndpointResolver {

    @Autowired private MikrotikRouterRepository routerRepo;
    @Autowired private VpnAddressing vpn;

    // ─── Face ID terminal ───

    public String baseUrl(FaceTerminal t) {
        MikrotikRouter router = null;
        if (t.getRouterId() != null) {
            router = routerRepo.findById(t.getRouterId())
                .orElseThrow(() -> new TerminalException("Terminal biriktirilgan router topilmadi"));
        }
        return baseUrl(router, t.getIpAddress(), t.getPort(), Boolean.TRUE.equals(t.getUseHttps()), "Terminal");
    }

    public HikvisionIsapiClient hikvision(FaceTerminal t) {
        requireCredentials(t.getDeviceUsername(), t.getDevicePassword(), "Terminal");
        return new HikvisionIsapiClient(baseUrl(t), t.getDeviceUsername(), t.getDevicePassword());
    }

    public static boolean isHikvision(FaceTerminal t) {
        return isHikvisionBrand(t.getBrand());
    }

    // ─── Kamera ───

    public String baseUrl(Camera c) {
        MikrotikRouter router = c.getSchool() != null
            ? routerRepo.findBySchoolId(c.getSchool().getId()).orElse(null)
            : null;
        return baseUrl(router, c.getIpAddress(), c.getPort(), Boolean.TRUE.equals(c.getUseHttps()), "Kamera");
    }

    public HikvisionIsapiClient hikvision(Camera c) {
        requireCredentials(c.getDeviceUsername(), c.getDevicePassword(), "Kamera");
        return new HikvisionIsapiClient(baseUrl(c), c.getDeviceUsername(), c.getDevicePassword());
    }

    public static boolean isHikvision(Camera c) {
        return isHikvisionBrand(c.getBrand());
    }

    /** Kamera platformadan boshqariladimi (brend va login kiritilgan) — aks holda faqat metama'lumot. */
    public static boolean isManaged(Camera c) {
        return isHikvision(c) && c.getIpAddress() != null && !c.getIpAddress().isBlank()
            && c.getDeviceUsername() != null && !c.getDeviceUsername().isBlank()
            && c.getDevicePassword() != null && !c.getDevicePassword().isBlank();
    }

    // ─── Umumiy ───

    /**
     * @param router maktab routeri (null bo'lsa qurilma to'g'ridan-to'g'ri, VPN'siz manzil bilan)
     */
    String baseUrl(MikrotikRouter router, String lanIp, Integer port, boolean https, String what) {
        if (lanIp == null || lanIp.isBlank()) {
            throw new TerminalException(what + " IP manzili kiritilmagan");
        }
        String host = lanIp.trim();
        if (router != null) {
            String reachable = vpn.toReachableIp(router, host);
            if (reachable == null) {
                throw new TerminalException(what + " IP'si (" + host + ") maktab routeri LAN subnetiga ("
                    + vpn.lanSubnet(router) + ") tegishli emas — IP'ni yoki router LAN subnetini to'g'rilang");
            }
            host = reachable;
        }
        int p = port != null && port > 0 ? port : (https ? 443 : 80);
        return (https ? "https://" : "http://") + host + ":" + p;
    }

    private static void requireCredentials(String user, String pass, String what) {
        if (user == null || user.isBlank() || pass == null || pass.isBlank()) {
            throw new TerminalException(what + " uchun qurilma login/paroli kiritilmagan");
        }
    }

    private static boolean isHikvisionBrand(String brand) {
        return brand != null && brand.trim().equalsIgnoreCase("hikvision");
    }
}
