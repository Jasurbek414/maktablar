package com.maktab.controller;

import com.maktab.model.District;
import com.maktab.model.Province;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd, superadmin panel) uchun foydalanuvchi/rol boshqaruvi:
 * /api/v1/auth/users/**, /api/v1/auth/roles/, /api/v1/auth/audit-logs/.
 * V1AuthController'dan ATAYLAB alohida — u faqat login/token oqimi bilan shug'ullanadi,
 * bu yerda esa xodimlarni CRUD qilish (UsersPage.jsx kontrakti) joylashgan, xuddi
 * V1OrganizationController/V1StudentController resurs bo'yicha ajratilgani kabi.
 *
 * MUHIM SXEMA MOSLASHUVI: Django frontendi (UsersPage.jsx) dastlab har bir foydalanuvchiga
 * BIR NECHTA rol biriktirish mumkin bo'lgan tizim uchun yozilgan (roles/ sub-resource,
 * assignRole/removeRole). Bu Spring backendda User'da FAQAT BITTA `role` ustuni bor —
 * multi-role join table yo'q. Shuning uchun har bir foydalanuvchining "roles" ro'yxati
 * doim BITTA elementli bo'ladi, "rol biriktirish" esa mavjud rolni ALMASHTIRADI (qo'shmaydi),
 * "rol olib tashlash" esa qo'llab-quvvatlanmaydi (pastda izohlangan). Bu V1StudentController'da
 * parent-link uchun ishlatilgan "bu sxemada bunday holat yo'q" shimi bilan bir xil uslub.
 *
 * MANUAL AUTH: bu controller /api/v1/auth/** ostida, SecurityConfig'da permitAll() —
 * boshqa /api/v1/auth/* endpointlar kabi har bir metod o'zi currentUserService.requireUser(...)
 * chaqiradi.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class V1UserController {

    @Autowired private UserRepository userRepository;
    @Autowired private ProvinceRepository provinceRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    // ══════════════════════════ USERS ══════════════════════════

    @GetMapping("/users/")
    public ResponseEntity<?> getUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String is_active) {
        User caller = currentUserService.requireUser(authHeader);
        User.Role roleFilter = (role != null && !role.isBlank()) ? User.Role.fromApiName(role) : null;

        List<User> users;
        if (currentUserService.isUnrestrictedAdmin(caller)) {
            // SUPERADMIN va ADMIN — ko'rish cheklovsiz, query filtrlari faqat qulaylik uchun.
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
            // Client'dan kelgan schoolId/provinceId e'tiborga olinmaydi — doim o'z viloyati.
            List<Long> scope = currentUserService.schoolIdsForProvince(caller.getProvinceId());
            users = scope.isEmpty() ? Collections.emptyList()
                    : (roleFilter != null ? userRepository.findByRoleAndSchoolIdIn(roleFilter, scope)
                                           : userRepository.findBySchoolIdIn(scope));
        } else if (caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            List<Long> scope = currentUserService.schoolIdsForDistrict(caller.getDistrictId());
            users = scope.isEmpty() ? Collections.emptyList()
                    : (roleFilter != null ? userRepository.findByRoleAndSchoolIdIn(roleFilter, scope)
                                           : userRepository.findBySchoolIdIn(scope));
        } else { // DIRECTOR/MUDIR/TEACHER — faqat o'z maktabi
            Long sid = caller.getSchoolId();
            users = sid == null ? Collections.emptyList()
                    : (roleFilter != null ? userRepository.findByRoleAndSchoolId(roleFilter, sid)
                                           : userRepository.findBySchoolId(sid));
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            users = users.stream().filter(u ->
                    (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                    || (u.getUsername() != null && u.getUsername().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }
        if (is_active != null && !is_active.isBlank()) {
            boolean want = Boolean.parseBoolean(is_active);
            users = users.stream().filter(u -> isActive(u) == want).collect(Collectors.toList());
        }

        return ResponseEntity.ok(users.stream().map(this::toUserDto).collect(Collectors.toList()));
    }

    // MUHIM: avval bu metod faqat autentifikatsiyani tekshirardi (requireUser), lekin
    // target foydalanuvchi chaqiruvchining ko'lamiga kiradimi tekshirmasdi — natijada
    // masalan bitta maktab TEACHER'i boshqa viloyat SUPERADMIN'ining yoki istalgan
    // xodimning to'liq profilini ID bo'yicha ko'ra olardi (IDOR). UserController#getById
    // bilan bir xil qoida qo'llanildi.
    @GetMapping("/users/{id}/")
    public ResponseEntity<?> getUser(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        if (!currentUserService.isUnrestrictedAdmin(caller)) {
            boolean visible = (target.getSchoolId() != null && currentUserService.canAccessSchool(caller, target.getSchoolId()))
                    || (target.getDistrictId() != null && currentUserService.canAccessDistrict(caller, target.getDistrictId()))
                    || (target.getProvinceId() != null && currentUserService.canAccessProvince(caller, target.getProvinceId()))
                    || target.getId().equals(caller.getId());
            if (!visible) {
                return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.user.view_denied")));
            }
        }
        return ResponseEntity.ok(toUserDto(target));
    }

    @PostMapping("/users/")
    public ResponseEntity<?> createUser(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                         @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanManageUsers(caller);

        Object usernameVal = firstNonNull(body.get("username"), body.get("phone"));
        if (usernameVal == null || usernameVal.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("phone", List.of(i18n.msg("error.login_phone_required"))));
        }
        String username = usernameVal.toString();
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("phone", List.of(i18n.msg("error.login.already_exists"))));
        }
        Object passwordVal = body.get("password");
        if (passwordVal == null || passwordVal.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("password", List.of(i18n.msg("error.password_required"))));
        }

        // Rol: berilgan bo'lsa shuni ishlatamiz. UsersPage.jsx'ning "Foydalanuvchi qo'shish"
        // formasida rol maydoni umuman yo'q (avval yaratiladi, keyin RoleAssignModal orqali
        // POST .../roles/ bilan haqiqiy rol biriktiriladi) — shu oqim uchun rol ko'rsatilmasa
        // ko'lamsiz TEACHER bilan vaqtinchalik yaratiladi (role NOT NULL ustun, bo'sh qoldirib
        // bo'lmaydi; TEACHER+schoolId=null eng cheklovli holat — hech narsa ko'rmaydi).
        Object roleVal = firstNonNull(body.get("role"), body.get("roleName"));
        User.Role role = roleVal != null ? User.Role.fromApiName(roleVal.toString()) : User.Role.TEACHER;
        if (roleVal != null && role == null) {
            return ResponseEntity.badRequest().body(Map.of("role", List.of(i18n.msg("error.role.unknown"))));
        }
        // Chaqiruvchi shu rolli foydalanuvchini yarata oladimi (SUPERADMIN/ADMIN'dan tashqari
        // ADMIN/SUPERADMIN yarata olmaydi; REGION_DIRECTOR/DISTRICT_DIRECTOR faqat
        // DIRECTOR/MUDIR/TEACHER yarata oladi) — CurrentUserService#assertCanManageTargetRole.
        currentUserService.assertCanManageTargetRole(caller, role);

        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(passwordVal.toString()));
        u.setFullName(resolveFullName(body, username));
        u.setRole(role);
        u.setIsActive(true);
        applyScopeFields(u, body);
        u.setAdminLevel(role == User.Role.ADMIN ? resolveAdminLevel(body) : null);

        // REGION_DIRECTOR/DISTRICT_DIRECTOR faqat o'z ko'lamidagi (viloyat/tuman/maktab)
        // foydalanuvchi yaratishi mumkin — so'ralgan ko'lam maydonlari tekshiriladi.
        currentUserService.assertScopeFieldsInCallerScope(caller, u.getProvinceId(), u.getDistrictId(), u.getSchoolId());

        userRepository.save(u);
        return ResponseEntity.ok(toUserDto(u));
    }

    @PatchMapping("/users/{id}/")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader,
                                         @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();

        currentUserService.assertCanManageUsers(caller);
        currentUserService.assertCanManageTargetRole(caller, target.getRole());
        currentUserService.assertTargetInCallerScope(caller, target);

        if (containsAny(body, "full_name", "fullName", "first_name", "last_name", "middle_name")) {
            String fn = resolveFullName(body, target.getFullName());
            if (fn != null && !fn.isBlank()) target.setFullName(fn);
        }
        Object usernameVal = firstNonNull(body.get("username"), body.get("phone"));
        if (usernameVal != null && !usernameVal.toString().isBlank()
                && !usernameVal.toString().equals(target.getUsername())) {
            if (userRepository.findByUsername(usernameVal.toString()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("phone", List.of(i18n.msg("error.login.already_exists"))));
            }
            target.setUsername(usernameVal.toString());
        }
        if (body.containsKey("is_active")) {
            target.setIsActive(toBoolean(body.get("is_active")));
        }

        Object roleVal = firstNonNull(body.get("role"), body.get("roleName"));
        if (roleVal != null) {
            User.Role newRole = User.Role.fromApiName(roleVal.toString());
            if (newRole == null) return ResponseEntity.badRequest().body(Map.of("role", List.of(i18n.msg("error.role.unknown"))));
            currentUserService.assertCanManageTargetRole(caller, newRole);
            target.setRole(newRole);
            target.setAdminLevel(newRole == User.Role.ADMIN ? resolveAdminLevel(body) : null);
        } else if (target.getRole() == User.Role.ADMIN && containsAny(body, "admin_level", "adminLevel")) {
            target.setAdminLevel(resolveAdminLevel(body));
        }

        applyScopeFields(target, body);
        // REGION_DIRECTOR/DISTRICT_DIRECTOR o'zgartirilgan (yoki mavjud) ko'lam maydonlari
        // hamon o'z ko'lamiga tegishli ekanligini tekshiradi (masalan schoolId'ni o'z
        // tumani/viloyatidan tashqariga chiqarib bo'lmaydi).
        currentUserService.assertScopeFieldsInCallerScope(caller, target.getProvinceId(), target.getDistrictId(), target.getSchoolId());

        userRepository.save(target);
        return ResponseEntity.ok(toUserDto(target));
    }

    @PostMapping("/users/{id}/deactivate/")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageUsers(caller);
        currentUserService.assertCanManageTargetRole(caller, target.getRole());
        currentUserService.assertTargetInCallerScope(caller, target);
        target.setIsActive(false);
        userRepository.save(target);
        return ResponseEntity.ok(toUserDto(target));
    }

    @PostMapping("/users/{id}/activate/")
    public ResponseEntity<?> activateUser(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageUsers(caller);
        currentUserService.assertCanManageTargetRole(caller, target.getRole());
        currentUserService.assertTargetInCallerScope(caller, target);
        target.setIsActive(true);
        userRepository.save(target);
        return ResponseEntity.ok(toUserDto(target));
    }

    @PostMapping("/users/{id}/set-password/")
    public ResponseEntity<?> setUserPassword(@PathVariable Long id,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageUsers(caller);
        currentUserService.assertCanManageTargetRole(caller, target.getRole());
        currentUserService.assertTargetInCallerScope(caller, target);

        Object pwd = firstNonNull(body.get("new_password"), body.get("newPassword"), body.get("password"));
        if (pwd == null || pwd.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("new_password", List.of("Majburiy")));
        }
        target.setPassword(passwordEncoder.encode(pwd.toString()));
        userRepository.save(target);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.password_changed")));
    }

    // ══════════════════════════ ROLES (bitta-rol sxemasi) ══════════════════════════

    // MUHIM: getUser() bilan bir xil IDOR — scope tekshiruvi yo'q edi.
    @GetMapping("/users/{id}/roles/")
    public ResponseEntity<?> getUserRoles(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        if (!currentUserService.isUnrestrictedAdmin(caller)) {
            boolean visible = (target.getSchoolId() != null && currentUserService.canAccessSchool(caller, target.getSchoolId()))
                    || (target.getDistrictId() != null && currentUserService.canAccessDistrict(caller, target.getDistrictId()))
                    || (target.getProvinceId() != null && currentUserService.canAccessProvince(caller, target.getProvinceId()))
                    || target.getId().equals(caller.getId());
            if (!visible) {
                return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.user.view_denied")));
            }
        }
        return ResponseEntity.ok(List.of(toRoleDto(target)));
    }

    @PostMapping("/users/{id}/roles/")
    public ResponseEntity<?> assignRole(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader,
                                         @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageUsers(caller);
        currentUserService.assertCanManageTargetRole(caller, target.getRole());
        currentUserService.assertTargetInCallerScope(caller, target);

        Object roleVal = body.get("role");
        if (roleVal == null || roleVal.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("role", List.of(i18n.msg("error.validation.required"))));
        }
        User.Role newRole = User.Role.fromApiName(roleVal.toString());
        if (newRole == null) return ResponseEntity.badRequest().body(Map.of("role", List.of(i18n.msg("error.role.unknown"))));
        currentUserService.assertCanManageTargetRole(caller, newRole);

        // Bitta-rol sxemasi: yangi rol ESKISINI TO'LIQ ALMASHTIRADI (qo'shilmaydi) —
        // shuning uchun eski ko'lam maydonlari ham rolga mos ravishda qayta o'rnatiladi.
        target.setRole(newRole);
        target.setProvinceId(null);
        target.setDistrictId(null);
        target.setSchoolId(null);
        applyScopeFields(target, body);
        target.setAdminLevel(newRole == User.Role.ADMIN ? resolveAdminLevel(body) : null);

        // Rol almashtirilgandan keyingi yangi ko'lam ham chaqiruvchining ko'lamiga tegishli bo'lishi kerak.
        currentUserService.assertScopeFieldsInCallerScope(caller, target.getProvinceId(), target.getDistrictId(), target.getSchoolId());

        userRepository.save(target);
        return ResponseEntity.ok(List.of(toRoleDto(target)));
    }

    @DeleteMapping("/users/{userId}/roles/{rolePk}/")
    public ResponseEntity<?> removeRole(@PathVariable Long userId, @PathVariable String rolePk,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        currentUserService.requireUser(authHeader);
        // Bu sxemada User'da FAQAT BITTA `role` ustuni bor (multi-role join table yo'q, ustun
        // NOT NULL) — "bitta rolni olib tashlash" tushunchasi mazmunsiz, chunki natijada
        // foydalanuvchi rolsiz qolar edi. Shuning uchun faqat ALMASHTIRISH (POST .../roles/)
        // qo'llab-quvvatlanadi, bu yerda esa aniq xabar bilan 400 qaytariladi.
        return ResponseEntity.status(400).body(Map.of("detail", i18n.msg("error.role.single_role_replace_only")));
    }

    @GetMapping("/roles/")
    public ResponseEntity<?> getRoles(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        currentUserService.requireUser(authHeader);
        List<Map<String, Object>> roles = Arrays.stream(User.Role.values()).map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.name());
            m.put("name", r.toApiName());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }

    // ══════════════════════════ AUDIT LOGS (stub) ══════════════════════════

    @GetMapping("/audit-logs/")
    public ResponseEntity<?> getAuditLogs(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        currentUserService.requireUser(authHeader);
        // Bu Spring backendda audit-log yozish/jadval hali amalga oshirilmagan — AuditPage.jsx
        // 404 o'rniga bo'sh natija bilan ishlashi uchun stub qaytariladi.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("results", Collections.emptyList());
        body.put("count", 0);
        return ResponseEntity.ok(body);
    }

    // ══════════════════════════ HELPERS ══════════════════════════
    // Rol/ko'lam boshqaruv tekshiruvlari endi CurrentUserService#assertCanManageUsers /
    // assertCanManageTargetRole / assertTargetInCallerScope / assertScopeFieldsInCallerScope
    // orqali amalga oshiriladi (UserController.java bilan bir xil, markazlashtirilgan).

    private boolean isActive(User u) {
        return !Boolean.FALSE.equals(u.getIsActive());
    }

    private String resolveFullName(Map<String, Object> body, String fallback) {
        if (body.get("full_name") != null) return body.get("full_name").toString();
        if (body.get("fullName") != null) return body.get("fullName").toString();
        if (containsAny(body, "first_name", "last_name", "middle_name")) {
            String last = body.get("last_name") != null ? body.get("last_name").toString() : "";
            String first = body.get("first_name") != null ? body.get("first_name").toString() : "";
            String middle = body.get("middle_name") != null ? body.get("middle_name").toString() : "";
            String combined = (last + " " + first + " " + middle).trim().replaceAll("\\s+", " ");
            return combined.isBlank() ? fallback : combined;
        }
        return fallback;
    }

    private User.AdminLevel resolveAdminLevel(Map<String, Object> body) {
        Object v = firstNonNull(body.get("admin_level"), body.get("adminLevel"));
        if (v == null) return User.AdminLevel.VIEW_ONLY; // xavfsizroq default
        String s = v.toString().trim().toUpperCase().replace('-', '_');
        return "FULL".equals(s) ? User.AdminLevel.FULL : User.AdminLevel.VIEW_ONLY;
    }

    /**
     * Faqat body'da haqiqatan mavjud bo'lgan ko'lam maydonlarini yangilaydi — shu bilan bir xil
     * metod ham PATCH (mavjud rolga tegmasdan qisman yangilash) ham POST/roles (rol almashtirish,
     * chaqiruvchi oldindan eski qiymatlarni null qilib qo'yadi) uchun xavfsiz.
     */
    private void applyScopeFields(User u, Map<String, Object> body) {
        if (containsAny(body, "region", "province", "provinceId", "regionId")) {
            u.setProvinceId(toLong(firstNonNull(body.get("region"), body.get("province"),
                    body.get("provinceId"), body.get("regionId"))));
        }
        if (containsAny(body, "district", "districtId")) {
            u.setDistrictId(toLong(firstNonNull(body.get("district"), body.get("districtId"))));
        }
        if (containsAny(body, "school", "schoolId")) {
            u.setSchoolId(toLong(firstNonNull(body.get("school"), body.get("schoolId"))));
        }
    }

    private boolean containsAny(Map<String, Object> body, String... keys) {
        for (String k : keys) if (body.containsKey(k)) return true;
        return false;
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... vals) {
        for (T v : vals) if (v != null) return v;
        return null;
    }

    private Long toLong(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : Long.valueOf(s);
    }

    private Boolean toBoolean(Object v) {
        if (v == null) return null;
        if (v instanceof Boolean) return (Boolean) v;
        return Boolean.parseBoolean(v.toString());
    }

    private Map<String, Object> toUserDto(User u) {
        String full = u.getFullName() == null ? "" : u.getFullName().trim();
        String[] parts = full.isEmpty() ? new String[0] : full.split("\\s+", 3);
        String lastName = parts.length > 0 ? parts[0] : "";
        String firstName = parts.length > 1 ? parts[1] : "";
        String middleName = parts.length > 2 ? parts[2] : "";

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("phone", u.getUsername());
        m.put("full_name", u.getFullName());
        m.put("fullName", u.getFullName());
        m.put("first_name", firstName);
        m.put("last_name", lastName);
        m.put("middle_name", middleName);
        m.put("email", null); // schema'da yo'q — V1OrganizationController'dagi kabi soddalashtirish
        m.put("is_active", isActive(u));
        m.put("is_superuser", u.getRole() == User.Role.SUPERADMIN);
        m.put("created_at", null); // schema'da createdAt ustuni yo'q
        m.put("last_login", null); // login vaqtini kuzatish hozircha amalga oshirilmagan
        m.put("role", u.getRole().toApiName());
        m.put("provinceId", u.getProvinceId());
        m.put("districtId", u.getDistrictId());
        m.put("schoolId", u.getSchoolId());
        if (u.getRole() == User.Role.ADMIN) {
            String level = u.getAdminLevel() != null ? u.getAdminLevel().name().toLowerCase() : null;
            m.put("admin_level", level);
            m.put("adminLevel", level);
        }
        m.put("roles", List.of(toRoleDto(u)));
        return m;
    }

    /** Bitta-rol sxemasida "rol yozuvi" = foydalanuvchining o'zi — id sifatida user.id ishlatiladi. */
    private Map<String, Object> toRoleDto(User u) {
        String roleName = u.getRole().toApiName();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", u.getId());
        r.put("role_id", u.getId());
        r.put("role", roleName);       // UsersPage.jsx jadval qatoridagi RoleBadge shuni o'qiydi
        r.put("role_name", roleName);  // RoleAssignModal shuni o'qiydi
        r.put("region", u.getProvinceId());
        r.put("district", u.getDistrictId());
        r.put("school", u.getSchoolId());
        r.put("region_name", u.getProvinceId() != null
                ? provinceRepo.findById(u.getProvinceId()).map(Province::getName).orElse(null) : null);
        r.put("district_name", u.getDistrictId() != null
                ? districtRepo.findById(u.getDistrictId()).map(District::getName).orElse(null) : null);
        r.put("school_name", u.getSchoolId() != null
                ? schoolRepo.findById(u.getSchoolId()).map(School::getName).orElse(null) : null);
        return r;
    }
}
