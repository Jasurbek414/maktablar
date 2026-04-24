package com.maktab.controller;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import com.maktab.security.JwtUtil;
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
            return ResponseEntity.status(401).body(Map.of("error", "Login yoki parol noto'g'ri"));
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "role", user.getRole().name(),
                "provinceId", user.getProvinceId() != null ? user.getProvinceId() : "",
                "districtId", user.getDistrictId() != null ? user.getDistrictId() : "",
                "schoolId", user.getSchoolId() != null ? user.getSchoolId() : ""
        ));

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
            return ResponseEntity.status(401).body(Map.of("error", "Token topilmadi"));
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Token yaroqsiz"));
        }

        String username = jwtUtil.getUsernameFromToken(token);
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Foydalanuvchi topilmadi"));
        }

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "role", user.getRole().name(),
                "provinceId", user.getProvinceId() != null ? user.getProvinceId() : "",
                "districtId", user.getDistrictId() != null ? user.getDistrictId() : "",
                "schoolId", user.getSchoolId() != null ? user.getSchoolId() : ""
        ));
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
