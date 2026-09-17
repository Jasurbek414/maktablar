package com.maktab.faceterminal;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

/** Qurilmasiz ishlaydigan Face ID mantiqi testlari. */
class FaceTerminalUnitTest {

    // ─── FaceIdMapping ───

    @Test
    void faceIdMappingStripsCharactersTheDeviceRejects() {
        // Platformadagi haqiqiy shakl: "AAA9-A9A9A999" — qurilma "-" ni qabul qilmaydi
        assertEquals("ABC1D2E3F456", FaceIdMapping.toEmployeeNo("ABC1-D2E3F456"));
        assertEquals("AB12", FaceIdMapping.toEmployeeNo("A_B-1 2"));
        assertNull(FaceIdMapping.toEmployeeNo(null));
        assertNull(FaceIdMapping.toEmployeeNo("---"));
        assertNull(FaceIdMapping.toEmployeeNo("A".repeat(33)), "qurilma chegarasi 32 belgi");
        assertEquals("A".repeat(32), FaceIdMapping.toEmployeeNo("A".repeat(32)));
    }

    // ─── FaceImageNormalizer ───

    private static byte[] image(int w, int h, String format, boolean noise) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Random r = new Random(42);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                img.setRGB(x, y, noise ? r.nextInt(0xFFFFFF) : 0x336699);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    @Test
    void normalizerProducesDeviceSizedJpeg() throws Exception {
        byte[] out = FaceImageNormalizer.toDeviceJpeg(image(640, 800, "png", false));
        assertTrue((out[0] & 0xFF) == 0xFF && (out[1] & 0xFF) == 0xD8, "JPEG bo'lishi kerak");
        assertTrue(out.length <= FaceImageNormalizer.MAX_BYTES);
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(out));
        assertEquals(640, decoded.getWidth());
    }

    @Test
    void normalizerShrinksLargeNoisyImageUnderLimit() throws Exception {
        // Shovqinli rasm JPEG'da yomon siqiladi — sifat pasaytirilib chegara ichiga tushirilishi kerak
        byte[] out = FaceImageNormalizer.toDeviceJpeg(image(2000, 1500, "png", true));
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(out));
        int longSide = Math.max(decoded.getWidth(), decoded.getHeight());
        assertTrue(longSide <= FaceImageNormalizer.MAX_SIDE && longSide >= FaceImageNormalizer.MIN_FALLBACK_SIDE, "o'lcham: " + longSide);
        assertEquals(4.0 / 3.0, (double) decoded.getWidth() / decoded.getHeight(), 0.01, "nisbat saqlanishi kerak");
        assertTrue(out.length <= FaceImageNormalizer.MAX_BYTES, "hajm: " + out.length);
    }

    @Test
    void normalizerRejectsPlaceholdersAndTinyImages() throws Exception {
        // Platformada 18 baytli "rasm" fayllari bor — qurilmaga yuborilmasligi kerak
        TerminalException garbage = assertThrows(TerminalException.class,
            () -> FaceImageNormalizer.toDeviceJpeg(new byte[18]));
        assertTrue(garbage.getMessage().contains("o'qilmadi"));

        TerminalException tiny = assertThrows(TerminalException.class,
            () -> FaceImageNormalizer.toDeviceJpeg(image(64, 64, "jpg", false)));
        assertTrue(tiny.getMessage().contains("juda kichik"));

        assertThrows(TerminalException.class, () -> FaceImageNormalizer.toDeviceJpeg(null));
    }

    // ─── FaceTerminalMonitor.isPass ───

    private static HikvisionIsapiClient.AcsEvent ev(int major, int minor, String emp) {
        return new HikvisionIsapiClient.AcsEvent(1, major, minor, OffsetDateTime.now(), emp, null);
    }

    @Test
    void onlyAuthenticatedPassesCountAsAttendance() {
        assertTrue(FaceTerminalMonitor.isPass(ev(5, 75, "ABC1")), "yuz tanildi");
        assertTrue(FaceTerminalMonitor.isPass(ev(5, 1, "ABC1")), "karta");
        assertTrue(FaceTerminalMonitor.isPass(ev(5, 38, "ABC1")), "barmoq izi");
        assertFalse(FaceTerminalMonitor.isPass(ev(5, 76, null)), "yuz tanilmadi (qurilmadagi haqiqiy voqealar shu)");
        assertFalse(FaceTerminalMonitor.isPass(ev(5, 75, null)), "employeeNo'siz");
        assertFalse(FaceTerminalMonitor.isPass(ev(3, 75, "ABC1")), "operatsiya voqeasi");
    }
}
