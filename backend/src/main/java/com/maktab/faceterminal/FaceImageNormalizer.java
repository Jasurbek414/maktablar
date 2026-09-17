package com.maktab.faceterminal;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

/**
 * Yuz rasmini terminalga yuklashdan oldin tekshiradi va moslaydi.
 *
 * Hikvision kirish nazorati terminallari yuz rasmi uchun JPEG va ~200 KB chegarasini talab
 * qiladi; juda kichik rasmda yuz aniqlanmaydi. Platformadagi ba'zi "rasmlar" aslida bir necha
 * baytli placeholder — ular qurilmaga yuborilmasdan, tushunarli xato bilan rad etiladi.
 */
public final class FaceImageNormalizer {

    static final int MIN_SIDE = 120;
    static final int MAX_SIDE = 1024;
    static final int MAX_BYTES = 200 * 1024;

    private FaceImageNormalizer() { }

    public static byte[] toDeviceJpeg(byte[] input) {
        if (input == null || input.length == 0) {
            throw new TerminalException("O'quvchi rasmi bo'sh");
        }
        BufferedImage src;
        try {
            src = ImageIO.read(new ByteArrayInputStream(input));
        } catch (Exception e) {
            src = null;
        }
        if (src == null) {
            throw new TerminalException("O'quvchi rasmi o'qilmadi (JPEG/PNG emas yoki buzilgan, " + input.length + " bayt)");
        }
        if (Math.min(src.getWidth(), src.getHeight()) < MIN_SIDE) {
            throw new TerminalException("O'quvchi rasmi juda kichik (" + src.getWidth() + "x" + src.getHeight()
                + ") — yuz aniqlanishi uchun kamida " + MIN_SIDE + "px kerak");
        }

        // Avval sifat pasaytiriladi; yetmasa (katta, mayda detalli foto) o'lcham ham bosqichma-bosqich
        // kichraytiriladi — lekin yuz aniqlanishi uchun MIN_FALLBACK_SIDE'dan pastga tushilmaydi.
        int longSide = Math.min(MAX_SIDE, Math.max(src.getWidth(), src.getHeight()));
        while (true) {
            BufferedImage rgb = toRgb(src, longSide);
            for (float quality = 0.9f; quality >= 0.45f; quality -= 0.15f) {
                byte[] out = encodeJpeg(rgb, quality);
                if (out.length <= MAX_BYTES) return out;
            }
            if (longSide <= MIN_FALLBACK_SIDE) break;
            longSide = Math.max(MIN_FALLBACK_SIDE, (int) (longSide * 0.75));
        }
        throw new TerminalException("O'quvchi rasmini " + (MAX_BYTES / 1024) + " KB dan kichraytirib bo'lmadi");
    }

    static final int MIN_FALLBACK_SIDE = 480;

    /** Uzun tomoni longSide bo'lgan RGB nusxa (kattalashtirilmaydi). PNG shaffofligi/CMYK qurilmada rad etiladi. */
    private static BufferedImage toRgb(BufferedImage src, int longSide) {
        double scale = Math.min(1.0, (double) longSide / Math.max(src.getWidth(), src.getHeight()));
        int w = Math.max(1, (int) Math.round(src.getWidth() * scale));
        int h = Math.max(1, (int) Math.round(src.getHeight() * scale));
        BufferedImage rgb = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, w, h);
            g.drawImage(src, 0, 0, w, h, null);
        } finally {
            g.dispose();
        }
        return rgb;
    }

    private static byte[] encodeJpeg(BufferedImage img, float quality) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
            writer.write(null, new IIOImage(img, null, null), param);
            ios.flush();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new TerminalException("Rasmni JPEG'ga o'tkazib bo'lmadi", e);
        } finally {
            writer.dispose();
        }
    }
}
