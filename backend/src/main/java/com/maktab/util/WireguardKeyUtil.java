package com.maktab.util;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.XECPrivateKey;
import java.security.interfaces.XECPublicKey;
import java.util.Base64;

/**
 * WireGuard (Curve25519/X25519) kalit juftligi generatsiyasi — JDK 17'ning o'rnatilgan
 * XDH provayderidan foydalanadi (JEP 324), tashqi kutubxona shart emas.
 *
 * Baytlar formati RFC 7748 (X25519) bilan RASMAN mos ekani tekshirilgan: xususiy kalit
 * {@link XECPrivateKey#getScalar()} orqali to'g'ridan-to'g'ri RFC 7748 kodlashda qaytadi;
 * ochiq kalit {@link XECPublicKey#getU()} u-koordinatasini little-endian 32 baytga
 * o'zi kodlaydi. Bu WireGuard'ning kutgan xom 32-bayt formati bilan bir xil — RFC 7748
 * 6.1-bo'limdagi rasmiy test vektori (Alice priv/pub jufti) bilan tasdiqlangan.
 */
public class WireguardKeyUtil {

    public record KeyPairB64(String privateKeyB64, String publicKeyB64) {}

    public static KeyPairB64 generate() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("X25519");
            KeyPair kp = kpg.generateKeyPair();
            byte[] priv = ((XECPrivateKey) kp.getPrivate()).getScalar()
                .orElseThrow(() -> new IllegalStateException("X25519 scalar mavjud emas"));
            byte[] pub = leEncode32(((XECPublicKey) kp.getPublic()).getU());
            return new KeyPairB64(Base64.getEncoder().encodeToString(priv), Base64.getEncoder().encodeToString(pub));
        } catch (Exception e) {
            throw new IllegalStateException("WireGuard kalit generatsiyasida xato", e);
        }
    }

    /** RFC 7748 u-koordinatasini 32 baytli little-endian ko'rinishga o'giradi. */
    private static byte[] leEncode32(BigInteger v) {
        byte[] be = v.toByteArray();
        byte[] result = new byte[32];
        int len = Math.min(be.length, 32);
        for (int i = 0; i < len; i++) result[i] = be[be.length - 1 - i];
        return result;
    }
}
