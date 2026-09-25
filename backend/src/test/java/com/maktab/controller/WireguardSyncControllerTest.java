package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.service.DeviceAlertService;
import com.maktab.util.VpnAddressing;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Hub <-> backend sinxronizatsiyasi (2026-09-19): WireGuard va OpenVPN routerlar bir-biriga
 * aralashmasligi, OpenVPN keshi va holat o'tishlarida ogohlantirish.
 */
class WireguardSyncControllerTest {

    private static final String KEY = "sync-secret";

    private WireguardSyncController controller;
    private MikrotikRouterRepository repo;
    private DeviceAlertService alerts;
    private MikrotikRouter wgRouter;
    private MikrotikRouter ovpnRouter;

    @BeforeEach
    void setUp() {
        VpnAddressing vpn = new VpnAddressing();
        ReflectionTestUtils.setField(vpn, "tunnelBase", "10.20.0");
        ReflectionTestUtils.setField(vpn, "mappedBase", "10.30");
        ReflectionTestUtils.setField(vpn, "gatewayIp", "10.20.0.254");
        ReflectionTestUtils.setField(vpn, "ovpnTunnelBase", "10.21.0");

        repo = mock(MikrotikRouterRepository.class);
        alerts = mock(DeviceAlertService.class);
        controller = new WireguardSyncController();
        ReflectionTestUtils.setField(controller, "routerRepo", repo);
        ReflectionTestUtils.setField(controller, "vpn", vpn);
        ReflectionTestUtils.setField(controller, "alerts", alerts);
        ReflectionTestUtils.setField(controller, "syncSecret", KEY);
        ReflectionTestUtils.setField(controller, "gatewayPublicKey", "GATEWAYKEY=");

        wgRouter = new MikrotikRouter();
        wgRouter.setId(1L);
        wgRouter.setName("wg");
        wgRouter.setVpnIp("10.20.0.2/32");
        wgRouter.setWgPublicKey("WGKEY1=");
        wgRouter.setStatus(MikrotikRouter.RouterStatus.OFFLINE);
        wgRouter.setLastHeartbeat(LocalDateTime.now().minusDays(1));

        ovpnRouter = new MikrotikRouter();
        ovpnRouter.setId(2L);
        ovpnRouter.setName("ovpn");
        ovpnRouter.setVpnIp("10.20.0.3/32");
        ovpnRouter.setWgPublicKey("WGKEY2="); // yaratishda WG kaliti doim generatsiya qilinadi
        ovpnRouter.setTransport(MikrotikRouter.Transport.OPENVPN);
        ovpnRouter.setOvpnPassword("abc");
        ovpnRouter.setStatus(MikrotikRouter.RouterStatus.OFFLINE);

        when(repo.findAll()).thenReturn(List.of(wgRouter, ovpnRouter));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(ResponseEntity<?> r) {
        return (List<Map<String, Object>>) r.getBody();
    }

    @Test
    void wgPeersExcludeOpenvpnRouters() {
        List<Map<String, Object>> peers = list(controller.getPeers(KEY));
        List<Object> keys = peers.stream().map(p -> p.get("publicKey")).toList();
        assertTrue(keys.contains("WGKEY1="));
        assertFalse(keys.contains("WGKEY2="), "OpenVPN routeri WireGuard peer bo'lmasligi kerak");
        assertTrue(keys.contains("GATEWAYKEY="), "gateway peer har doim ro'yxatda");
    }

    @Test
    void ovpnClientsRequireKeyAndExposeOnlyHash() {
        assertEquals(401, controller.ovpnClients("wrong").getStatusCode().value());
        assertEquals(401, controller.ovpnClients(null).getStatusCode().value());

        List<Map<String, Object>> clients = list(controller.ovpnClients(KEY));
        assertEquals(1, clients.size(), "faqat OpenVPN routerlar");
        Map<String, Object> c = clients.get(0);
        assertEquals("router2", c.get("cn"));
        // SHA-256("abc") — standart test vektori; parolning o'zi uzatilmaydi
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", c.get("passwordSha256"));
        assertFalse(c.containsValue("abc"));
        assertEquals("10.21.0.3", c.get("tunnelIp"));
        assertEquals("10.30.3.0/24", c.get("mappedSubnet"));
        assertEquals("10.30.3.0", c.get("mappedNetwork"));
    }

    @Test
    void ovpnStatusMarksOnlineAndAlertsOnlyOnTransition() {
        assertEquals(401, controller.ovpnStatus("wrong", List.of("router2")).getStatusCode().value());

        controller.ovpnStatus(KEY, List.of("router2"));
        assertEquals(MikrotikRouter.RouterStatus.ONLINE, ovpnRouter.getStatus());
        assertNotNull(ovpnRouter.getLastHeartbeat());
        verify(alerts, times(1)).routerOnline(ovpnRouter, true);

        // darhol takroriy hisobot — holat o'zgarmadi, bazaga ham yozilmaydi (har 15s yozmaslik)
        controller.ovpnStatus(KEY, List.of("router2"));
        verify(repo, times(1)).save(ovpnRouter);
        verify(alerts, times(1)).routerOnline(any(), anyBoolean());

        // WireGuard routeri CN ro'yxatida bo'lsa ham (soxta/xato) ta'sirlanmaydi
        controller.ovpnStatus(KEY, List.of("router1"));
        assertEquals(MikrotikRouter.RouterStatus.OFFLINE, wgRouter.getStatus());
    }

    @Test
    void wgHandshakesIgnoreOpenvpnRouters() {
        long now = Instant.now().getEpochSecond();
        controller.reportHandshakes(KEY, List.of(Map.of("publicKey", "WGKEY2=", "latestHandshake", now)));
        assertEquals(MikrotikRouter.RouterStatus.OFFLINE, ovpnRouter.getStatus());
        verifyNoInteractions(alerts);
    }

    @Test
    void wgHandshakeTransitionAlertsOnce() {
        long now = Instant.now().getEpochSecond();
        controller.reportHandshakes(KEY, List.of(Map.of("publicKey", "WGKEY1=", "latestHandshake", now)));
        assertEquals(MikrotikRouter.RouterStatus.ONLINE, wgRouter.getStatus());
        verify(alerts).routerOnline(wgRouter, false);

        controller.reportHandshakes(KEY, List.of(Map.of("publicKey", "WGKEY1=", "latestHandshake", now)));
        verify(alerts, times(1)).routerOnline(any(), anyBoolean());
    }
}
