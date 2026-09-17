package com.maktab.devices;

import com.maktab.faceterminal.HikvisionIsapiClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.junit.jupiter.api.Assertions.*;

class DeviceDiscoveryTest {

    @Test
    void hikvisionDeviceTypesMapToPlatformCategories() {
        assertEquals("faceTerminal", DeviceDiscoveryService.categoryOf("ACS"));
        assertEquals("camera", DeviceDiscoveryService.categoryOf("IPCamera"));
        assertEquals("camera", DeviceDiscoveryService.categoryOf("IPDome"));
        assertEquals("recorder", DeviceDiscoveryService.categoryOf("NVR"));
        assertEquals("recorder", DeviceDiscoveryService.categoryOf("HybirdNVR"));
        assertEquals("unknown", DeviceDiscoveryService.categoryOf(null));
        assertEquals("unknown", DeviceDiscoveryService.categoryOf("Doorbell"));
    }

    /**
     * Haqiqiy qurilmada: HIK_HOST (masalan 192.168.88.253), HIK_USER, HIK_PASS.
     * Loginsiz aniqlash noto'g'ri parol urinishisiz ishlashi, login bilan esa turini to'g'ri olishi kerak.
     */
    @Test
    @EnabledIfEnvironmentVariable(named = "HIK_HOST", matches = ".+")
    void liveProbeIdentifiesFaceTerminal() {
        String host = System.getenv("HIK_HOST");
        DeviceDiscoveryService svc = new DeviceDiscoveryService();

        DeviceDiscoveryService.Found anon = svc.probeHost(host, host, false, null, null, null, null);
        assertNotNull(anon, "qurilma javob berishi kerak");
        assertEquals("hikvision", anon.vendor(), "loginsiz /SDK/activateStatus orqali aniqlanishi kerak");
        assertEquals(Boolean.TRUE, anon.activated());
        assertTrue(anon.openPorts().contains(80));
        assertNull(anon.model(), "loginsiz model o'qilmaydi");
        assertEquals("unknown", anon.category(), "Face ID'da ham 554 ochiq — loginsiz 'camera' deyilmasligi kerak");
        System.out.println("[live] anon: ports=" + anon.openPorts() + " category=" + anon.category());

        DeviceDiscoveryService.Found withLogin = svc.probeHost(host, host, true,
            System.getenv("HIK_USER"), System.getenv("HIK_PASS"), 3L, null);
        assertEquals("faceTerminal", withLogin.category());
        assertEquals("ACS", withLogin.deviceType());
        assertNotNull(withLogin.model());
        assertNull(withLogin.loginError());
        assertEquals(3L, withLogin.registeredTerminalId());
        System.out.println("[live] login: " + withLogin.deviceType() + " " + withLogin.model());

        // Hech narsa yo'q IP — null (xato emas)
        assertNull(svc.probeHost("192.0.2.1", "192.0.2.1", false, null, null, null, null));
    }

    /**
     * "Voqealarni tiklash" qurilmaga vaqtni mahalliy offset bilan yuboradi (FaceTerminalController
     * serverning ZoneId'siga o'giradi). Qurilmada bugun 16:36 atrofida voqealar bor edi.
     */
    @Test
    @EnabledIfEnvironmentVariable(named = "HIK_HOST", matches = ".+")
    void liveEventsBetweenAcceptsLocalOffset() {
        HikvisionIsapiClient c = new HikvisionIsapiClient("http://" + System.getenv("HIK_HOST"),
            System.getenv("HIK_USER"), System.getenv("HIK_PASS"));
        java.time.OffsetDateTime to = java.time.OffsetDateTime.now(java.time.ZoneOffset.ofHours(5));
        java.time.OffsetDateTime from = to.minusDays(2);
        HikvisionIsapiClient.EventPage page = c.eventsBetween(from, to, 0, 30);
        assertFalse(page.events().isEmpty(), "oxirgi 2 kunda voqealar bo'lishi kerak");
        for (HikvisionIsapiClient.AcsEvent e : page.events()) {
            assertNotNull(e.time());
            assertFalse(e.time().isBefore(from.minusMinutes(1)) || e.time().isAfter(to.plusMinutes(1)),
                "voqea oraliq ichida bo'lishi kerak: " + e.time());
        }
        System.out.println("[live] eventsBetween +05:00: " + page.events().size() + " (more=" + page.more() + ")");
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "HIK_HOST", matches = ".+")
    void liveSnapshotIsJpeg() {
        HikvisionIsapiClient c = new HikvisionIsapiClient("http://" + System.getenv("HIK_HOST"),
            System.getenv("HIK_USER"), System.getenv("HIK_PASS"));
        byte[] jpeg = c.snapshot("101");
        assertTrue(jpeg.length > 1000 && (jpeg[0] & 0xFF) == 0xFF && (jpeg[1] & 0xFF) == 0xD8);
        System.out.println("[live] snapshot bytes=" + jpeg.length);
        var e = assertThrows(com.maktab.faceterminal.TerminalException.class, () -> c.snapshot("9901"));
        assertTrue(e.getMessage().contains("kadr qaytarmadi"), e.getMessage());
    }
}
