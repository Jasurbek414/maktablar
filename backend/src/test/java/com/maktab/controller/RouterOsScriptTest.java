package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.model.School;
import com.maktab.util.VpnAddressing;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Mikrotik sozlash skripti va VPN manzillash sxemasi uchun testlar.
 *
 * Qo'shimcha: SCRIPT_OUT muhit o'zgaruvchisi berilsa (va ROUTER_*, HUB_* qiymatlari), shu
 * haqiqiy qiymatlar bilan skript faylga yoziladi — jismoniy routerda sinash uchun. Testning
 * o'zida hech qanday maxfiy qiymat yo'q.
 */
class RouterOsScriptTest {

    private RouterController controller;
    private VpnAddressing vpn;

    @BeforeEach
    void setUp() {
        vpn = new VpnAddressing();
        ReflectionTestUtils.setField(vpn, "tunnelBase", "10.20.0");
        ReflectionTestUtils.setField(vpn, "mappedBase", "10.30");
        ReflectionTestUtils.setField(vpn, "gatewayIp", "10.20.0.254");
        ReflectionTestUtils.setField(vpn, "ovpnTunnelBase", "10.21.0");

        controller = new RouterController();
        ReflectionTestUtils.setField(controller, "ovpnPort", "443");
        ReflectionTestUtils.setField(controller, "vpn", vpn);
        ReflectionTestUtils.setField(controller, "wgServerPublicKey", "HUBKEYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=");
        ReflectionTestUtils.setField(controller, "wgServerEndpoint", "vpn.example.uz");
        ReflectionTestUtils.setField(controller, "wgServerPort", "51820");
        ReflectionTestUtils.setField(controller, "wgSubnetBase", "10.20.0");
        ReflectionTestUtils.setField(controller, "wgAllowedIps", "10.20.0.0/24");
    }

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        return v != null && !v.isBlank() ? v : fallback;
    }

    private MikrotikRouter router(String vpnIp, String lanSubnet, String schoolName) {
        School s = new School();
        s.setName(schoolName);
        MikrotikRouter r = new MikrotikRouter();
        r.setId(4L);
        r.setSchool(s);
        r.setVpnIp(vpnIp);
        r.setLanSubnet(lanSubnet);
        r.setWgPrivateKey("ROUTERKEYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=");
        return r;
    }

    private String script(MikrotikRouter r) {
        return (String) ReflectionTestUtils.invokeMethod(controller, "buildRouterOsScript", r);
    }

    @Test
    void scriptConfiguresTunnelNetmapAndFirewall() {
        String s = script(router("10.20.0.2/32", "192.168.88.0/24", "1-maktab"));

        // /32 xatosi qaytmasligi kerak — routerga subnet prefiksi bilan beriladi
        assertTrue(s.contains("/ip address add address=10.20.0.2/24 interface=$vpnIf"), s);
        assertFalse(s.contains("10.20.0.2/32"));

        assertTrue(s.contains("endpoint-address=vpn.example.uz endpoint-port=51820 allowed-address=10.20.0.0/24"));
        assertTrue(s.contains("dst-address=10.30.2.0/24 action=netmap to-addresses=192.168.88.0/24"));
        assertTrue(s.contains("src-address=10.20.0.254 dst-address=192.168.88.0/24 action=masquerade"));
        assertTrue(s.contains("chain=forward in-interface=$vpnIf src-address=10.20.0.254 dst-address=192.168.88.0/24 action=accept"));
        assertTrue(s.contains("network=\"192.168.88.0\""), "LAN mavjudligi tekshirilishi kerak");

        // device-mode=home bloklaydigan buyruqlar ishlatilmasligi kerak
        assertFalse(s.contains("/tool fetch"));
        assertFalse(s.contains("/system scheduler"));

        // 2026-09-16: hub javobi uchun input qabul qoidasi — conntrack muddati qisqaligidan himoya
        // (jonli routerda aniqlangan: RouterOS "drop all not coming from LAN" qoidasi hub javobini
        // o'chirib yuborardi, chunki UDP "established" holati javob kelguncha tugab ketardi).
        // 2026-09-19: port har qo'yishda tasodifiy (qotib qolgan NAT'dan himoya) va interfeysga beriladi
        assertTrue(s.contains(":local wgPort [:rndnum from=20000 to=60000]"));
        assertTrue(s.contains("listen-port=$wgPort"));
        assertTrue(s.contains("chain=input protocol=udp dst-port=$wgPort action=accept"),
            "hub javobi input zanjirida qabul qilinishi kerak");
        int inputRuleIdx = s.indexOf("chain=input protocol=udp dst-port=$wgPort action=accept");
        int lanAcceptIdx = s.indexOf("chain=forward in-interface=$vpnIf src-address=10.20.0.254");
        assertTrue(inputRuleIdx > lanAcceptIdx, "input qoidasi forward qoidalaridan keyin qo'shilishi kerak");
    }

    @Test
    void scriptIsSingleBalancedBlock() {
        String s = script(router("10.20.0.2/32", "192.168.88.0/24", "1-maktab"));
        long open = s.chars().filter(c -> c == '{').count();
        long close = s.chars().filter(c -> c == '}').count();
        assertEquals(open, close, "qavslar muvozanatda bo'lishi kerak");
        String body = s.lines().filter(l -> !l.startsWith("#")).reduce("", (a, b) -> a + b + "\n").trim();
        assertTrue(body.startsWith("{") && body.endsWith("}"), "butun skript bitta blok bo'lishi kerak");
    }

    @Test
    void schoolNameCannotBreakScript() {
        String s = script(router("10.20.0.2/32", "192.168.88.0/24", "Maktab \"X\"\n/system reset-configuration $a"));
        assertFalse(s.contains("\n/system reset-configuration"));
        assertFalse(s.contains("\"X\""));
    }

    @Test
    void scriptIsPureAscii() {
        // RouterOS terminali UTF-8'ni buzadi — o'zbekcha maktab nomi ham skriptni buzmasligi kerak
        String s = script(router("10.20.0.2/32", "192.168.88.0/24", "Toshkent shahar 5-sonli oʻrta maktab — «Ilm»"));
        assertTrue(s.chars().allMatch(c -> c < 128), "skriptda faqat ASCII bo'lishi kerak");
    }

    @Test
    void differentLanSubnetIsUsedEverywhere() {
        String s = script(router("10.20.0.7/32", "192.168.1.0/24", "2-maktab"));
        assertTrue(s.contains("dst-address=10.30.7.0/24 action=netmap to-addresses=192.168.1.0/24"));
        assertTrue(s.contains("network=\"192.168.1.0\""));
    }

    private MikrotikRouter ovpnRouter() {
        MikrotikRouter r = router("10.20.0.2/32", "192.168.88.0/24", "1-maktab");
        r.setTransport(MikrotikRouter.Transport.OPENVPN);
        r.setOvpnPassword("TestPass23456789abcdefgh");
        return r;
    }

    @Test
    void openvpnScriptConfiguresClientRouteAndNetmap() {
        String s = script(ovpnRouter());

        assertTrue(s.contains(":local vpnIf \"ovpn-maktab\""), s);
        assertTrue(s.contains("/interface ovpn-client add name=$vpnIf connect-to=vpn.example.uz port=443 protocol=tcp mode=ip"
            + " user=\"router4\" password=\"TestPass23456789abcdefgh\""), s);
        assertTrue(s.contains("add-default-route=no"));
        // 2026-09-19: yaratilgan zahoti ulanib qolsa birinchi ulanish osilardi — o'chiq sozlanib,
        // barcha marshrut/NAT/firewall'dan KEYIN yoqilishi shart
        assertTrue(s.contains("verify-server-certificate=no comment=$tag disabled=yes\n"), "klient o'chiq holda sozlanadi");
        assertFalse(s.contains("comment=$tag disabled=no\n} else"), "set tarmog'ida ham darhol yoqilmasligi kerak");
        int enable = s.lastIndexOf("/interface ovpn-client set [find where name=$vpnIf] disabled=no");
        assertTrue(enable > 0, "oxirida yoqilishi kerak");
        assertTrue(enable > s.indexOf("/ip route add dst-address=10.20.0.254/32"));
        assertTrue(enable > s.lastIndexOf("/ip firewall filter add"));
        assertTrue(enable > s.lastIndexOf("/ip firewall nat add"));
        // javob backend gateway'iga tunnel orqali qaytishi kerak
        assertTrue(s.contains("/ip route add dst-address=10.20.0.254/32 gateway=$vpnIf comment=$tag"));
        // netmap va firewall aynan OpenVPN interfeysiga bog'lanadi
        assertTrue(s.contains("chain=dstnat in-interface=$vpnIf dst-address=10.30.2.0/24 action=netmap to-addresses=192.168.88.0/24"));
        assertTrue(s.contains("chain=forward in-interface=$vpnIf src-address=10.20.0.254 dst-address=192.168.88.0/24 action=accept"));
        // WireGuard'ga xos narsalar bo'lmasligi kerak (TCP — input qoidasi kerak emas; WG kaliti sizmasin)
        assertFalse(s.contains("chain=input protocol=udp"));
        assertFalse(s.contains("private-key"));
        assertFalse(s.contains("ROUTERKEY"));
    }

    @Test
    void oneRouterOneVpn() {
        // 2026-09-19: bir xil IP ikki interfeysda turgani 1 soatlik uzilishga sabab bo'lgan —
        // har bir skript boshqa transportning maktab_davomad interfeysini olib tashlashi shart.
        String ov = script(ovpnRouter());
        assertTrue(ov.contains("/ip address remove [find where interface=\"wg-maktab\"]"));
        assertTrue(ov.contains("/interface wireguard remove [find where name=\"wg-maktab\"]"));
        int removeWg = ov.indexOf("/interface wireguard remove");
        int addOvpn = ov.indexOf("/interface ovpn-client add");
        assertTrue(removeWg > 0 && removeWg < addOvpn, "avval eski WG olib tashlanadi, keyin OpenVPN qo'shiladi");

        String wg = script(router("10.20.0.2/32", "192.168.88.0/24", "1-maktab"));
        assertTrue(wg.contains("/interface ovpn-client remove [find where name=\"ovpn-maktab\"]"));
        assertTrue(wg.contains("/ip route remove [find where comment=$tag]"), "OpenVPN'dan qolgan marshrut ham tozalanadi");
        assertTrue(wg.indexOf("/interface ovpn-client remove") < wg.indexOf("/interface wireguard add"));
    }

    @Test
    void bothScriptsRequireRouterOs7AndStaticDns() {
        for (MikrotikRouter r : List.of(ovpnRouter(), router("10.20.0.2/32", "192.168.88.0/24", "1-maktab"))) {
            String s = script(r);
            assertTrue(s.contains(":if ([:tonum [:pick $ver 0 [:find $ver \".\"]]] < 7) do={"), s);
            int versionCheck = s.indexOf(":local ver [/system resource get version]");
            int firstChange = s.indexOf("/interface");
            assertTrue(versionCheck > 0 && versionCheck < firstChange, "versiya hech narsa o'zgarmasidan oldin tekshirilishi kerak");
            assertTrue(s.contains(":if ([:len [/ip dns get servers]] = 0) do={ /ip dns set servers=8.8.8.8,1.1.1.1 }"));
            long open = s.chars().filter(c -> c == '{').count();
            long close = s.chars().filter(c -> c == '}').count();
            assertEquals(open, close);
            assertTrue(s.chars().allMatch(c -> c < 128), "faqat ASCII");
        }
    }

    @Test
    void transportParsingAndPassword() {
        assertNull(RouterController.parseTransport(null));
        assertNull(RouterController.parseTransport(" "));
        assertEquals(MikrotikRouter.Transport.OPENVPN, RouterController.parseTransport("openvpn"));
        assertThrows(IllegalArgumentException.class, () -> RouterController.parseTransport("ipsec"));

        MikrotikRouter r = router("10.20.0.2/32", null, "1-maktab");
        assertEquals(MikrotikRouter.Transport.WIREGUARD, r.effectiveTransport(), "eski qatorlar (null) WireGuard");
        RouterController.applyTransport(r, MikrotikRouter.Transport.OPENVPN);
        String pw = r.getOvpnPassword();
        assertNotNull(pw);
        assertTrue(pw.matches("[A-Za-z0-9]{24}"), "skriptda qo'shtirnoq ichida — faqat harf/raqam");
        // qayta tanlanganda parol o'zgarmasligi kerak — aks holda routerdagi skript ishlamay qoladi
        RouterController.applyTransport(r, MikrotikRouter.Transport.WIREGUARD);
        RouterController.applyTransport(r, MikrotikRouter.Transport.OPENVPN);
        assertEquals(pw, r.getOvpnPassword());
        assertNotEquals(pw, RouterController.newOvpnPassword());
    }

    @Test
    void addressing() {
        MikrotikRouter r = router("10.20.0.2/32", null, "1-maktab");
        assertEquals("192.168.88.0/24", vpn.lanSubnet(r));
        assertEquals("10.30.2.0/24", vpn.mappedSubnet(r));
        assertEquals("10.20.0.2/32", vpn.routerTunnelHost(r));
        assertEquals("10.30.2.253", vpn.toReachableIp(r, "192.168.88.253"));
        assertNull(vpn.toReachableIp(r, "192.168.1.5"), "boshqa subnetdagi IP o'girilmasligi kerak");
        assertNull(vpn.toReachableIp(r, "not-an-ip"));

        assertEquals("192.168.1.0/24", vpn.normalizeLanSubnet(" 192.168.1.77/24 "));
        assertNull(vpn.normalizeLanSubnet("192.168.0.0/16"), "faqat /24");
        assertNull(vpn.normalizeLanSubnet("8.8.8.0/24"), "ochiq IP diapazoni");
        assertNull(vpn.normalizeLanSubnet("10.30.5.0/24"), "VPN diapazoni bilan kesishadi");
        assertNull(vpn.normalizeLanSubnet("10.20.0.0/24"), "VPN diapazoni bilan kesishadi");
        assertNull(vpn.normalizeLanSubnet("10.21.0.0/24"), "OpenVPN diapazoni bilan kesishadi");
        assertEquals("10.21.0.2", vpn.routerOvpnIp(r), "OpenVPN tunneli WireGuard'dan alohida diapazonda");
    }

    @Test
    void writeRealScriptWhenRequested() throws Exception {
        String out = System.getenv("SCRIPT_OUT");
        if (out == null || out.isBlank()) return;
        ReflectionTestUtils.setField(controller, "wgServerPublicKey", env("HUB_PUBLIC_KEY", ""));
        ReflectionTestUtils.setField(controller, "wgServerEndpoint", env("HUB_ENDPOINT", ""));
        ReflectionTestUtils.setField(controller, "wgServerPort", env("HUB_PORT", "51820"));
        ReflectionTestUtils.setField(controller, "ovpnPort", env("OVPN_PORT", "443"));
        MikrotikRouter r = router(env("ROUTER_VPN_IP", "10.20.0.2/32"), env("ROUTER_LAN", "192.168.88.0/24"), "1-maktab");
        r.setId(Long.valueOf(env("ROUTER_ID", "4")));
        r.setWgPrivateKey(env("ROUTER_PRIVATE_KEY", ""));
        if ("OPENVPN".equalsIgnoreCase(env("ROUTER_TRANSPORT", ""))) {
            r.setTransport(MikrotikRouter.Transport.OPENVPN);
            r.setOvpnPassword(env("ROUTER_OVPN_PASSWORD", ""));
        }
        String s = script(r);
        Files.writeString(Path.of(out), s);
    }
}
