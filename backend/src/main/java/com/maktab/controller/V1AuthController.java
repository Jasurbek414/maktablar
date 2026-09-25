package com.maktab.controller;

import com.maktab.model.RefreshToken;
import com.maktab.model.User;
import com.maktab.repository.RefreshTokenRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.JwtUtil;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Superadmin panel (/spd, frontend A) uchun auth kontrakti.
 * Frontend A'ning kodiga tegmasdan ishlashi uchun uning kutgan so'rov/javob
 * shakliga (phone+password, access+refresh JWT juftligi, snake_case user maydonlari)
 * aynan moslashtirilgan. Mavjud /api/auth/** (frontend B, username+password,
 * bitta token) o'zgarishsiz qoladi.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class V1AuthController {

    private static final long REFRESH_TOKEN_TTL_DAYS = 7;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private I18nService i18n;

    @PostMapping("/login/")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String password = body.get("password");
        User user = phone != null ? userRepository.findByUsername(phone).orElse(null) : null;

        if (user == null || password == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.invalid_credentials")));
        }
        if (Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(403).body(Map.of("detail", i18n.msg("error.auth.user_deactivated")));
        }

        return ResponseEntity.ok(buildTokenResponse(user));
    }

    @PostMapping("/refresh/")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refresh = body.get("refresh");
        if (refresh == null) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.refresh_token_missing")));
        }

        RefreshToken stored = refreshTokenRepository.findByToken(refresh).orElse(null);
        if (stored == null || Boolean.TRUE.equals(stored.getRevoked())
                || stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.refresh_token_invalid")));
        }

        User user = userRepository.findById(stored.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.user.not_found")));
        }

        // Rotatsiya: eskisini bekor qilib, yangisini beramiz
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        String newAccess = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());
        String newRefresh = issueRefreshToken(user.getId());

        return ResponseEntity.ok(Map.of("access", newAccess, "refresh", newRefresh));
    }

    @PostMapping("/logout/")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> body) {
        if (body != null && body.get("refresh") != null) {
            refreshTokenRepository.findByToken(body.get("refresh")).ifPresent(t -> {
                t.setRevoked(true);
                refreshTokenRepository.save(t);
            });
        }
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.logged_out")));
    }

    @GetMapping("/me/")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.required")));
        }
        return ResponseEntity.ok(toUserDto(user));
    }

    @PatchMapping("/me/")
    public ResponseEntity<?> updateMe(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                       @RequestBody Map<String, Object> body) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.required")));
        }
        if (body.containsKey("full_name") && body.get("full_name") != null) {
            user.setFullName(body.get("full_name").toString());
        }
        userRepository.save(user);
        return ResponseEntity.ok(toUserDto(user));
    }

    @PostMapping("/change-password/")
    public ResponseEntity<?> changePassword(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestBody Map<String, String> body) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("detail", i18n.msg("error.auth.required")));
        }

        String oldPassword = body.get("old_password");
        String newPassword = body.get("new_password");
        if (oldPassword == null || !passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("old_password", List.of(i18n.msg("error.auth.current_password_incorrect"))));
        }
        if (newPassword == null || newPassword.length() < AuthController.MIN_PASSWORD_LENGTH) {
            return ResponseEntity.status(400).body(Map.of("new_password", List.of(i18n.msg("error.auth.new_password_min_length_8"))));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // 2026-09-25: parol o'zgargach barcha ochiq sessiyalar bekor qilinadi
        refreshTokenRepository.revokeAllForUser(user.getId());
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.password_changed")));
    }

    // ---- helpers ----

    private Map<String, Object> buildTokenResponse(User user) {
        String access = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());
        String refresh = issueRefreshToken(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("access", access);
        response.put("refresh", refresh);
        response.put("user", toUserDto(user));
        return response;
    }

    private String issueRefreshToken(Long userId) {
        String token = jwtUtil.generateOpaqueToken();
        RefreshToken rt = new RefreshToken();
        rt.setToken(token);
        rt.setUserId(userId);
        rt.setExpiresAt(OffsetDateTime.now().plusDays(REFRESH_TOKEN_TTL_DAYS));
        rt.setRevoked(false);
        rt.setCreatedAt(OffsetDateTime.now());
        refreshTokenRepository.save(rt);
        return token;
    }

    private User resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        String username = jwtUtil.getUsernameFromToken(token);
        return userRepository.findByUsername(username).orElse(null);
    }

    /**
     * Django'ning UserDetailSerializer shakliga moslashtirilgan (snake_case,
     * roles ro'yxati, is_superuser) — frontend A kodiga tegmasdan ishlashi uchun.
     */
    private Map<String, Object> toUserDto(User user) {
        boolean isSuperAdmin = user.getRole() == User.Role.SUPERADMIN;
        String fullName = user.getFullName() == null ? "" : user.getFullName().trim();
        String[] nameParts = fullName.split("\\s+", 2);
        String firstName = nameParts.length > 0 ? nameParts[0] : "";
        String lastName = nameParts.length > 1 ? nameParts[1] : "";

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", user.getId());
        dto.put("phone", user.getUsername());
        dto.put("email", null);
        dto.put("first_name", firstName);
        dto.put("last_name", lastName);
        dto.put("full_name", user.getFullName());
        dto.put("is_active", !Boolean.FALSE.equals(user.getIsActive()));
        dto.put("is_superuser", isSuperAdmin);
        dto.put("roles", List.of(Map.of("role", user.getRole().toApiName())));
        dto.put("provinceId", user.getProvinceId());
        dto.put("districtId", user.getDistrictId());
        dto.put("schoolId", user.getSchoolId());
        return dto;
    }
}
