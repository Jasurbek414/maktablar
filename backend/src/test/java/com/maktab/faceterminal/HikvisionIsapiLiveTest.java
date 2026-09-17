package com.maktab.faceterminal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Haqiqiy Hikvision terminalda sinov — faqat HIK_BASE (masalan http://192.168.88.253),
 * HIK_USER, HIK_PASS muhit o'zgaruvchilari berilganda ishlaydi, oddiy build'da o'tkazib yuboriladi.
 *
 * Yozish amallari zararsiz va qaytariladigan: vaqtinchalik "TEST-CLAUDE" foydalanuvchisi
 * yaratiladi, tekshiriladi va o'chiriladi. Yuz rasmi yuklanmaydi, eshik/reboot chaqirilmaydi.
 */
@EnabledIfEnvironmentVariable(named = "HIK_BASE", matches = "http.+")
class HikvisionIsapiLiveTest {

    private static final String TEST_EMPLOYEE = "TESTCLAUDE";

    private HikvisionIsapiClient client() {
        return new HikvisionIsapiClient(System.getenv("HIK_BASE"), System.getenv("HIK_USER"), System.getenv("HIK_PASS"));
    }

    @Test
    void readOperations() {
        HikvisionIsapiClient c = client();

        HikvisionIsapiClient.DeviceInfo info = c.deviceInfo();
        assertNotNull(info.model());
        assertNotNull(info.serialNumber());
        System.out.println("[live] model=" + info.model() + " fw=" + info.firmwareVersion());

        HikvisionIsapiClient.UserCounts counts = c.userCounts();
        assertTrue(counts.users() >= 0);
        System.out.println("[live] users=" + counts.users() + " withFace=" + counts.usersWithFace());

        HikvisionIsapiClient.DeviceTime time = c.deviceTime();
        assertNotNull(time.localTime(), "qurilma vaqti parse qilinishi kerak");
        System.out.println("[live] timeMode=" + time.timeMode() + " tz=" + time.timeZone());

        long latest = c.latestSerial();
        assertTrue(latest > 0, "qurilmada voqealar bor");
        System.out.println("[live] latestSerial=" + latest);

        // beginSerialNo bilan oxirgi 3 ta voqea o'sish tartibida kelishi kerak
        HikvisionIsapiClient.EventPage page = c.eventsFromSerial(Math.max(1, latest - 2), 30);
        List<HikvisionIsapiClient.AcsEvent> ev = page.events();
        assertFalse(ev.isEmpty());
        assertEquals(latest, ev.get(ev.size() - 1).serialNo(), "oxirgi voqea latestSerial bo'lishi kerak");
        for (int i = 1; i < ev.size(); i++) {
            assertTrue(ev.get(i).serialNo() > ev.get(i - 1).serialNo(), "o'sish tartibida");
        }
        assertNotNull(ev.get(0).time());
        System.out.println("[live] events from serial ok: " + ev.size() + " (more=" + page.more() + ")");

        // Oxirgidan keyingi voqea yo'q — bo'sh sahifa, xato emas
        assertTrue(c.eventsFromSerial(latest + 1, 30).events().isEmpty());

        String pic = ev.get(ev.size() - 1).pictureUrl();
        if (pic != null) {
            byte[] img = c.downloadPicture(pic);
            assertNotNull(img, "snapshot rasmi yuklab olinishi kerak");
            assertTrue(img.length > 1000 && (img[0] & 0xFF) == 0xFF && (img[1] & 0xFF) == 0xD8, "JPEG bo'lishi kerak");
            System.out.println("[live] picture bytes=" + img.length);
        }
    }

    @Test
    void employeeNoWithHyphenIsRejectedLoudly() {
        // Bu firmware "-" ni rad etadi — xato jimgina yutilmasligi kerak (FaceIdMapping shu sabab bor)
        HikvisionIsapiClient c = client();
        int before = c.userCounts().users();
        assertThrows(TerminalException.class, () -> c.upsertUser("TEST-HYPHEN", "x"));
        assertEquals(before, c.userCounts().users());
        assertEquals("TESTHYPHEN", FaceIdMapping.toEmployeeNo("TEST-HYPHEN"));
    }

    @Test
    void userLifecycleWithoutFace() {
        HikvisionIsapiClient c = client();
        int before = c.userCounts().users();
        try {
            c.upsertUser(TEST_EMPLOYEE, "Test Claude");
            c.upsertUser(TEST_EMPLOYEE, "Test Claude (yangilangan)"); // ikkinchi marta — yangilash, xato emas
            assertEquals(before + 1, c.userCounts().users());

            boolean found = false;
            int pos = 0;
            while (true) {
                HikvisionIsapiClient.UserPage p = c.searchUsers(pos, 30);
                for (HikvisionIsapiClient.DeviceUser u : p.users()) {
                    if (TEST_EMPLOYEE.equals(u.employeeNo())) {
                        found = true;
                        assertEquals("Test Claude (yangilangan)", u.name());
                        assertEquals(0, u.faces());
                    }
                }
                pos += p.users().size();
                if (p.users().isEmpty() || pos >= p.total()) break;
            }
            assertTrue(found, "yaratilgan foydalanuvchi qidiruvda topilishi kerak");
        } finally {
            // finally ichidagi xato asl assert xatosini yashirmasligi uchun ushlanadi
            try { c.deleteUser(TEST_EMPLOYEE); } catch (TerminalException e) { System.out.println("[live] cleanup: " + e.getMessage()); }
        }
        assertEquals(before, c.userCounts().users(), "test foydalanuvchisi o'chirilishi kerak");
    }

    @Test
    void wrongPasswordGivesClearError() {
        // Diqqat: faqat BITTA noto'g'ri urinish — Hikvision ko'p urinishdan keyin bloklaydi
        HikvisionIsapiClient bad = new HikvisionIsapiClient(System.getenv("HIK_BASE"), System.getenv("HIK_USER"), "wrong-password-x");
        TerminalException e = assertThrows(TerminalException.class, bad::userCounts);
        assertTrue(e.getMessage().contains("paroli noto'g'ri"), e.getMessage());
    }
}
