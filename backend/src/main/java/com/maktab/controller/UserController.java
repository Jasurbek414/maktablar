package com.maktab.controller;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
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

    @Autowired
    private I18nService i18n;

    @Autowired
    private com.maktab.service.PersonLocationService personLocationService;

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
    public ResponseEntity<?> getById(@PathVariable Long id,
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
        return ResponseEntity.ok(toMap(target));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User.Role role = User.Role.valueOf((String) body.get("role"));
        boolean directorManagingTeacher = isSchoolLead(caller) && role == User.Role.TEACHER;
        if (directorManagingTeacher) {
            currentUserService.assertCanManageTeacher(caller, caller.getSchoolId());
        } else {
            currentUserService.assertCanManageUsers(caller);
            currentUserService.assertCanManageTargetRole(caller, role);
        }

        String username = (String) body.get("username");
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.login.already_exists")));
        }

        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode((String) body.get("password")));
        u.setFullName((String) body.get("fullName"));
        u.setRole(role);
        if (directorManagingTeacher) {
            // DIRECTOR/MUDIR faqat o'z maktabi uchun o'qituvchi yarata oladi — body'dagi
            // schoolId'ga ISHONILMAYDI, doim chaqiruvchining o'z maktabiga majburlanadi.
            u.setSchoolId(caller.getSchoolId());
        } else {
            if (body.get("provinceId") != null && !body.get("provinceId").toString().isEmpty())
                u.setProvinceId(Long.valueOf(body.get("provinceId").toString()));
            if (body.get("districtId") != null && !body.get("districtId").toString().isEmpty())
                u.setDistrictId(Long.valueOf(body.get("districtId").toString()));
            if (body.get("schoolId") != null && !body.get("schoolId").toString().isEmpty())
                u.setSchoolId(Long.valueOf(body.get("schoolId").toString()));
        }
        if (body.get("phone") != null) u.setPhone(body.get("phone").toString());
        if (body.get("subject") != null) u.setSubject(body.get("subject").toString());

        if (!directorManagingTeacher) {
            currentUserService.assertScopeFieldsInCallerScope(caller, u.getProvinceId(), u.getDistrictId(), u.getSchoolId());
        }

        User saved = userRepository.save(u);
        return ResponseEntity.ok(toMap(saved));
    }

    /** DIRECTOR/MUDIR — o'z maktabidagi o'qituvchilarni boshqarish uchun maxsus (tor) ruxsat yo'li. */
    private boolean isSchoolLead(User caller) {
        return caller.getRole() == User.Role.DIRECTOR || caller.getRole() == User.Role.MUDIR;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();

        boolean directorManagingTeacher = isSchoolLead(caller) && target.getRole() == User.Role.TEACHER
                && target.getSchoolId() != null && target.getSchoolId().equals(caller.getSchoolId());
        if (directorManagingTeacher) {
            currentUserService.assertCanManageTeacher(caller, caller.getSchoolId());
        } else {
            currentUserService.assertCanManageUsers(caller);
            currentUserService.assertCanManageTargetRole(caller, target.getRole());
            currentUserService.assertTargetInCallerScope(caller, target);
        }

        if (body.containsKey("fullName")) target.setFullName((String) body.get("fullName"));
        if (body.containsKey("role") && !directorManagingTeacher) {
            User.Role newRole = User.Role.valueOf((String) body.get("role"));
            currentUserService.assertCanManageTargetRole(caller, newRole);
            target.setRole(newRole);
        }
        if (body.containsKey("password") && body.get("password") != null && !body.get("password").toString().isEmpty()) {
            target.setPassword(passwordEncoder.encode((String) body.get("password")));
        }
        if (body.containsKey("phone")) target.setPhone(body.get("phone") != null ? body.get("phone").toString() : null);
        if (body.containsKey("subject")) target.setSubject(body.get("subject") != null ? body.get("subject").toString() : null);

        if (!directorManagingTeacher) {
            if (body.containsKey("provinceId")) target.setProvinceId(body.get("provinceId") != null ? Long.valueOf(body.get("provinceId").toString()) : null);
            if (body.containsKey("districtId")) target.setDistrictId(body.get("districtId") != null ? Long.valueOf(body.get("districtId").toString()) : null);
            if (body.containsKey("schoolId")) target.setSchoolId(body.get("schoolId") != null ? Long.valueOf(body.get("schoolId").toString()) : null);
            currentUserService.assertScopeFieldsInCallerScope(caller, target.getProvinceId(), target.getDistrictId(), target.getSchoolId());
        }

        userRepository.save(target);
        return ResponseEntity.ok(toMap(target));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        User target = opt.get();
        if (target.getRole() == User.Role.SUPERADMIN) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.user.cannot_delete_superadmin")));
        }
        boolean directorManagingTeacher = isSchoolLead(caller) && target.getRole() == User.Role.TEACHER
                && target.getSchoolId() != null && target.getSchoolId().equals(caller.getSchoolId());
        if (directorManagingTeacher) {
            currentUserService.assertCanManageTeacher(caller, caller.getSchoolId());
        } else {
            currentUserService.assertCanManageUsers(caller);
            currentUserService.assertCanManageTargetRole(caller, target.getRole());
            currentUserService.assertTargetInCallerScope(caller, target);
        }
        personLocationService.forgetPerson(com.maktab.model.PersonNote.PersonType.TEACHER, id);
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
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
        m.put("phone", u.getPhone());
        m.put("subject", u.getSubject());
        return m;
    }
}
