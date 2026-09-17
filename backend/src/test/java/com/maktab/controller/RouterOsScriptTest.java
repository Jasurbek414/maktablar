package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.model.School;
import com.maktab.util.VpnAddressing;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

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

        controller = new RouterController();
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
        assertTrue(s.contains("/ip address add address=10.20.0.2/24 interface=$wgIf"), s);
        assertFalse(s.contains("10.20.0.2/32"));

        assertTrue(s.contains("endpoint-address=vpn.example.uz endpoint-port=51820 allowed-address=10.20.0.0/24"));
        assertTrue(s.contains("dst-address=10.30.2.0/24 action=netmap to-addresses=192.168.88.0/24"));
        assertTrue(s.contains("src-address=10.20.0.254 dst-address=192.168.88.0/24 action=masquerade"));
        assertTrue(s.contains("chain=forward in-interface=$wgIf src-address=10.20.0.254 dst-address=192.168.88.0/24 action=accept"));
        assertTrue(s.contains("network=\"192.168.88.0\""), "LAN mavjudligi tekshirilishi kerak");

        // device-mode=home bloklaydigan buyruqlar ishlatilmasligi kerak
        assertFalse(s.contains("/tool fetch"));
        assertFalse(s.contains("/system scheduler"));

        // 2026-09-16: hub javobi uchun input qabul qoidasi — conntrack muddati qisqaligidan himoya
        // (jonli routerda aniqlangan: RouterOS "drop all not coming from LAN" qoidasi hub javobini
        // o'chirib yuborardi, chunki UDP "established" holati javob kelguncha tugab ketardi).
        assertTrue(s.contains(":local wgPort [/interface wireguard get $wgIf listen-port]"));
        assertTrue(s.contains("chain=input protocol=udp dst-port=$wgPort action=accept"),
            "hub javobi input zanjirida qabul qilinishi kerak");
        int inputRuleIdx = s.indexOf("chain=input protocol=udp dst-port=$wgPort action=accept");
        int lanAcceptIdx = s.indexOf("chain=forward in-interface=$wgIf src-address=10.20.0.254");
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
    }

    @Test
    void writeRealScriptWhenRequested() throws Exception {
        String out = System.getenv("SCRIPT_OUT");
        if (out == null || out.isBlank()) return;
        ReflectionTestUtils.setField(controller, "wgServerPublicKey", env("HUB_PUBLIC_KEY", ""));
        ReflectionTestUtils.setField(controller, "wgServerEndpoint", env("HUB_ENDPOINT", ""));
        MikrotikRouter r = router(env("ROUTER_VPN_IP", "10.20.0.2/32"), env("ROUTER_LAN", "192.168.88.0/24"), "1-maktab");
        r.setWgPrivateKey(env("ROUTER_PRIVATE_KEY", ""));
        String s = script(r);
        Files.writeString(Path.of(out), s);
    }
}
