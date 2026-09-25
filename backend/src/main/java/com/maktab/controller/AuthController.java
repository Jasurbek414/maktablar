package com.maktab.controller;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import com.maktab.security.JwtUtil;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private I18nService i18n;

    // 2026-09-25 audit: parol almashtirilganda ochiq sessiyalar ham bekor qilinishi shart —
    // aks holda o'g'irlangan refresh token yana 30 kun ishlayverardi.
    @Autowired
    private com.maktab.repository.RefreshTokenRepository refreshTokenRepository;

    /** Butun tizim uchun yagona minimal parol uzunligi (2026-09-25 gacha 6/6/8 xilma-xil edi). */
    public static final int MIN_PASSWORD_LENGTH = 8;

    /**
     * Login endpoint
     * POST /api/auth/login
     * Body: { "username": "superadmin", "password": "admin123" }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.invalid_credentials")));
        }
        if (Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.auth.user_deactivated")));
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", selfMap(user));

        return ResponseEntity.ok(response);
    }

    /**
     * Joriy foydalanuvchi ma'lumotlari
     * GET /api/auth/me
     * Header: Authorization: Bearer <token>
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.token_missing")));
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.token_invalid")));
        }

        String username = jwtUtil.getUsernameFromToken(token);
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", i18n.msg("error.user.not_found")));
        }

        return ResponseEntity.ok(selfMap(user));
    }

    /**
     * Joriy foydalanuvchi o'z profilini yangilaydi (faqat o'zi — rol/ko'lam
     * maydonlariga tegilmaydi, shuning uchun rol-boshqaruv cheklovlariga muhtoj emas).
     * PATCH /api/auth/me
     */
    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(@RequestHeader("Authorization") String authHeader,
                                       @RequestBody Map<String, Object> body) {
        User user = resolveSelf(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.token_invalid")));
        }
        if (body.get("fullName") != null && !body.get("fullName").toString().isBlank()) {
            user.setFullName(body.get("fullName").toString());
        }
        if (body.containsKey("phone")) {
            Object phone = body.get("phone");
            user.setPhone(phone != null ? phone.toString() : null);
        }
        userRepository.save(user);
        return ResponseEntity.ok(selfMap(user));
    }

    /**
     * Joriy foydalanuvchi o'z parolini o'zgartiradi (joriy parolni bilishi shart).
     * POST /api/auth/change-password
     * Body: { "oldPassword": "...", "newPassword": "..." }
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestHeader("Authorization") String authHeader,
                                             @RequestBody Map<String, String> body) {
        User user = resolveSelf(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.auth.token_invalid")));
        }
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || !passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("error", i18n.msg("error.auth.current_password_incorrect")));
        }
        // 2026-09-25: uchta controller'da uch xil chegara bor edi (6/6/8) — endi hammasi 8.
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            return ResponseEntity.status(400).body(Map.of("error", i18n.msg("error.auth.new_password_min_length")));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Barcha ochiq sessiyalarni bekor qilish — parol o'zgargach eski token ishlamasligi kerak
        refreshTokenRepository.revokeAllForUser(user.getId());
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.password_changed")));
    }

    /** Joriy foydalanuvchining o'ziga tegishli javoblarda (login/me/updateMe) qaytariladigan xarita. */
    private Map<String, Object> selfMap(User user) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", user.getId());
        m.put("username", user.getUsername());
        m.put("fullName", user.getFullName());
        m.put("role", user.getRole().name());
        m.put("provinceId", user.getProvinceId() != null ? user.getProvinceId() : "");
        m.put("districtId", user.getDistrictId() != null ? user.getDistrictId() : "");
        m.put("schoolId", user.getSchoolId() != null ? user.getSchoolId() : "");
        m.put("phone", user.getPhone());
        m.put("subject", user.getSubject());
        return m;
    }

    private User resolveSelf(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        String username = jwtUtil.getUsernameFromToken(token);
        return userRepository.findByUsername(username).orElse(null);
    }

    // DTO
    public static class LoginRequest {
        private String username;
        private String password;
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
