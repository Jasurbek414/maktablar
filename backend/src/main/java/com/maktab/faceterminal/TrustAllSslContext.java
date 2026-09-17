package com.maktab.faceterminal;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;
import java.net.Socket;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

/**
 * Kamera/Face ID qurilmalari HTTPS'da odatda o'z-o'zidan imzolangan sertifikat bilan ishlaydi.
 * Bu qurilmalarga faqat maktab VPN tunneli orqali (backend -> WireGuard -> router LAN) yetiladi —
 * ochiq internetga chiqmaydi — shu sabab sertifikatni tekshirmaslik shu doirada xavfsiz. Foydalanuvchi
 * bilan kelishilgan (2026-09-17): self-signed sertifikatni ishonchli deb qabul qilish tanlandi.
 */
public final class TrustAllSslContext {
    private TrustAllSslContext() { }

    public static final SSLContext INSTANCE = build();

    private static SSLContext build() {
        try {
            SSLContext ctx = SSLContext.getInstance("TLS");
            // MUHIM: oddiy X509TrustManager YETARLI EMAS — JSSE uni Socket/SSLEngine bilan
            // ishlatganda avtomatik ravishda X509ExtendedTrustManager'ga o'rab, standart
            // hostname/endpoint tekshiruvini baribir qo'llaydi (kamera sertifikatida
            // "Subject Alternative Name" yo'qligi sabab har doim rad etiladi). Shu sabab
            // to'g'ridan-to'g'ri X509ExtendedTrustManager qo'llaniladi va barcha checkServerTrusted
            // variantlari (shu jumladan SSLEngine bilan) hech narsa tekshirmaydi.
            ctx.init(null, new TrustManager[]{new X509ExtendedTrustManager() {
                public void checkClientTrusted(X509Certificate[] chain, String authType) { }
                public void checkServerTrusted(X509Certificate[] chain, String authType) { }
                public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) { }
                public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) { }
                public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) { }
                public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) { }
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }}, new SecureRandom());
            return ctx;
        } catch (Exception e) {
            throw new IllegalStateException("TLS kontekstini yaratib bo'lmadi", e);
        }
    }
}
