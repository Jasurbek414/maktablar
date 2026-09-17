package com.maktab.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    private final Key key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret:}") String secret,
            @Value("${app.jwt.expirationMs:86400000}") long expirationMs) {
        // MUHIM: avval bu yerda kodga yozilgan (hardcoded) standart JWT kaliti bor edi —
        // repo public bo'lgani uchun bu kalit hammaga ma'lum edi. Agar JWT_SECRET
        // muhit o'zgaruvchisi o'rnatilmagan bo'lsa, endi ilova jim tarzda zaif kalitga
        // tushish o'rniga darhol ishga tushmay xato beradi ("fail closed").
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "app.jwt.secret (JWT_SECRET muhit o'zgaruvchisi) o'rnatilmagan. " +
                "Xavfsizlik uchun standart qiymat endi yo'q — .env faylida JWT_SECRET'ni o'rnating.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username, String role, Long userId) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Opaque refresh token — JWT emas, DB'da saqlanadi va rotatsiya/bekor qilish uchun ishlatiladi
     * (frontend A'ning access+refresh JWT juftligi kontraktiga mos, /api/v1/auth/* uchun).
     */
    public String generateOpaqueToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
