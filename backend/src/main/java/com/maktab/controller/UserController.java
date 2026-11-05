package com.maktab.controller;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CurrentUserService currentUserService;

    /**
     * MUHIM: role/schoolId/provinceId endi client'dan ishonch bilan qabul qilinmaydi —
     * xodimlar ro'yxati (ism, rol, viloyat/maktab) haqiqiy Authorization headerdagi
     * foydalanuvchi ko'lamiga cheklanadi. SUPERADMIN uchun bu filtrlar ixtiyoriy qoladi.
     */
    @GetMapping
    public List<Map<String, Object>> getAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long provinceId) {
        User caller = currentUserService.requireUser(authHeader);
        User.Role roleFilter = (role != null && !role.isBlank()) ? User.Role.valueOf(role) : null;

        List<User> users;
        if (currentUserService.isSuperAdmin(caller) || caller.getRole() == User.Role.ADMIN) {
            if (roleFilter != null && schoolId != null) {
                users = userRepository.findByRoleAndSchoolId(roleFilter, schoolId);
            } else if (roleFilter != null && provinceId != null) {
                users = userRepository.findByRoleAndProvinceId(roleFilter, provinceId);
            } else if (roleFilter != null) {
                users = userRepository.findByRole(roleFilter);
            } else if (schoolId != null) {
                users = userRepository.findBySchoolId(schoolId);
            } else {
                users = userRepository.findAll();
            }
        } else if (caller.getRole() == User.Role.REGION_DIRECTOR) {
            List<Long> scope = currentUserService.schoolIdsForProvince(caller.getProvinceId());
            if (scope.isEmpty()) {
                users = Collections.emptyList();
            } else if (roleFilter != null) {
                users = userRepository.findByRoleAndSchoolIdIn(roleFilter, scope);
            } else {
                users = userRepository.findBySchoolIdIn(scope);
            }
        } else if (caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            List<Long> scope = currentUserService.schoolIdsForDistrict(caller.getDistrictId());
            if (scope.isEmpty()) {
                users = Collections.emptyList();
            } else if (roleFilter != null) {
                users = userRepository.findByRoleAndSchoolIdIn(roleFilter, scope);
            } else {
                users = userRepository.findBySchoolIdIn(scope);
            }
        } else { // DIRECTOR/MUDIR/TEACHER — faqat o'z maktabi
            Long sid = caller.getSchoolId();
            if (sid == null) {
                users = Collections.emptyList();
            } else if (roleFilter != null) {
                users = userRepository.findByRoleAndSchoolId(roleFilter, sid);
            } else {
                users = userRepository.findBySchoolId(sid);
            }
        }
        return users.stream().map(this::toMap).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return userRepository.findById(id).map(u -> ResponseEntity.ok(toMap(u)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bu login allaqachon mavjud"));
        }

        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode((String) body.get("password")));
        u.setFullName((String) body.get("fullName"));
        u.setRole(User.Role.valueOf((String) body.get("role")));
        if (body.get("provinceId") != null && !body.get("provinceId").toString().isEmpty())
            u.setProvinceId(Long.valueOf(body.get("provinceId").toString()));
        if (body.get("districtId") != null && !body.get("districtId").toString().isEmpty())
            u.setDistrictId(Long.valueOf(body.get("districtId").toString()));
        if (body.get("schoolId") != null && !body.get("schoolId").toString().isEmpty())
            u.setSchoolId(Long.valueOf(body.get("schoolId").toString()));

        User saved = userRepository.save(u);
        return ResponseEntity.ok(toMap(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return userRepository.findById(id).map(u -> {
            if (body.containsKey("fullName")) u.setFullName((String) body.get("fullName"));
            if (body.containsKey("role")) u.setRole(User.Role.valueOf((String) body.get("role")));
            if (body.containsKey("password") && body.get("password") != null && !body.get("password").toString().isEmpty()) {
                u.setPassword(passwordEncoder.encode((String) body.get("password")));
            }
            if (body.containsKey("provinceId")) u.setProvinceId(body.get("provinceId") != null ? Long.valueOf(body.get("provinceId").toString()) : null);
            if (body.containsKey("districtId")) u.setDistrictId(body.get("districtId") != null ? Long.valueOf(body.get("districtId").toString()) : null);
            if (body.containsKey("schoolId")) u.setSchoolId(body.get("schoolId") != null ? Long.valueOf(body.get("schoolId").toString()) : null);
            userRepository.save(u);
            return ResponseEntity.ok(toMap(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        if (opt.get().getRole() == User.Role.SUPERADMIN) {
            return ResponseEntity.badRequest().body(Map.of("error", "SUPERADMIN o'chirib bo'lmaydi"));
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }

    private Map<String, Object> toMap(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("fullName", u.getFullName());
        m.put("role", u.getRole().name());
        m.put("provinceId", u.getProvinceId());
        m.put("districtId", u.getDistrictId());
        m.put("schoolId", u.getSchoolId());
        return m;
    }
}
