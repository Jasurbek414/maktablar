package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.District;
import com.maktab.model.User;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.UserRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {

    @Autowired private SchoolRepository schoolRepository;
    @Autowired private DistrictRepository districtRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private SchoolClassRepository classRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;
    @Autowired private com.maktab.service.BotConfigService botConfigService;

    /**
     * MUHIM: districtId endi client'dan ishonch bilan qabul qilinmaydi — SUPERADMIN/ADMIN'dan
     * boshqa har bir rol uchun haqiqiy ko'lam Authorization headerdagi foydalanuvchidan
     * CurrentUserService#resolveSchoolScope orqali olinadi.
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestParam(required = false) Long districtId) {
        User user = currentUserService.requireUser(authHeader);
        List<School> schools;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            schools = districtId != null ? schoolRepository.findByDistrictId(districtId) : schoolRepository.findAll();
        } else if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (districtId != null) {
                if (!currentUserService.canAccessDistrict(user, districtId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
                }
                schools = schoolRepository.findByDistrictId(districtId);
            } else {
                List<Long> schoolIds = currentUserService.schoolIdsForProvince(user.getProvinceId());
                schools = schoolIds.isEmpty() ? Collections.emptyList() : schoolRepository.findAllById(schoolIds);
            }
        } else if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (districtId != null && !currentUserService.canAccessDistrict(user, districtId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
            }
            schools = schoolRepository.findByDistrictId(user.getDistrictId());
        } else { // DIRECTOR/MUDIR/TEACHER — faqat o'z maktabi (client filtriga qaramasdan)
            schools = user.getSchoolId() != null
                ? schoolRepository.findById(user.getSchoolId()).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        }
        return schools.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("districtId", s.getDistrict().getId());
            m.put("districtName", s.getDistrict().getName());
            m.put("provinceName", s.getDistrict().getProvince().getName());
            m.put("address", s.getAddress());
            m.put("phone", s.getPhone());
            m.put("schoolNumber", s.getSchoolNumber());
            m.put("foundedYear", s.getFoundedYear());
            long studentCount = studentRepository.countBySchoolId(s.getId());
            m.put("studentCount", studentCount);
            long classCount = classRepository.findBySchoolId(s.getId()).size();
            m.put("classCount", classCount);
            // Director name
            userRepository.findFirstByRoleAndSchoolId(User.Role.DIRECTOR, s.getId())
                .ifPresent(d -> m.put("directorName", d.getFullName()));
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        if (!currentUserService.canAccessSchool(user, id)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.school.access_denied")));
        }
        return schoolRepository.findById(id).map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("districtId", s.getDistrict().getId());
            m.put("districtName", s.getDistrict().getName());
            m.put("provinceName", s.getDistrict().getProvince() != null ? s.getDistrict().getProvince().getName() : null);
            m.put("address", s.getAddress());
            m.put("phone", s.getPhone());
            m.put("schoolNumber", s.getSchoolNumber());
            m.put("foundedYear", s.getFoundedYear());
            // Qayta o'tishni bloklash oynasi: maktabning o'zi (null bo'lishi mumkin) + amaldagi + umumiy standart
            m.put("attendanceDedupMinutes", s.getAttendanceDedupMinutes());
            m.put("effectiveDedupMinutes", botConfigService.effectiveDedupMinutes(s.getId()));
            m.put("globalDedupMinutes", botConfigService.globalDedupMinutes());
            m.put("studentCount", studentRepository.countBySchoolId(s.getId()));
            m.put("classCount", classRepository.findBySchoolId(s.getId()).size());
            userRepository.findFirstByRoleAndSchoolId(User.Role.DIRECTOR, s.getId())
                .ifPresent(d -> m.put("directorName", d.getFullName()));
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * MUHIM: bu maktab PROFILINI (manzil/telefon/raqam/ta'sis yili) tahrirlash uchun —
     * assertCanWriteSchool (tarkibiy: nom/tuman) dan farqli, DIRECTOR/MUDIR ham O'Z
     * maktabi profilini shu orqali yangilay oladi (CurrentUserService#assertCanEditSchoolProfile).
     * Boshqa maktabga tegishli so'rov har doim 403 bilan rad etiladi — "har bir maktab
     * ma'lumoti boshqasiga aralashmasligi" shu bilan ta'minlanadi.
     */
    @PatchMapping("/{id}/profile")
    public ResponseEntity<?> updateProfile(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanEditSchoolProfile(caller, id);
        // Qayta o'tishni bloklash oynasi (daqiqa): bo'sh = maktab o'z qiymatidan voz kechadi va
        // superadmin panelidagi umumiy qiymat ishlaydi; aks holda 1..1440 (1 kun).
        Integer dedupMinutes = null;
        Object dedupVal = body.get("attendanceDedupMinutes");
        if (dedupVal != null && !dedupVal.toString().isBlank()) {
            try {
                dedupMinutes = Integer.parseInt(dedupVal.toString().trim());
            } catch (NumberFormatException e) {
                dedupMinutes = -1;
            }
            if (dedupMinutes < 1 || dedupMinutes > 1440) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.invalid_dedup_minutes")));
            }
        }
        final Integer newDedupMinutes = dedupMinutes;
        return schoolRepository.findById(id).map(s -> {
            if (body.containsKey("address")) s.setAddress((String) body.get("address"));
            if (body.containsKey("phone")) s.setPhone((String) body.get("phone"));
            if (body.containsKey("schoolNumber")) s.setSchoolNumber((String) body.get("schoolNumber"));
            if (body.containsKey("foundedYear")) {
                Object fy = body.get("foundedYear");
                s.setFoundedYear(fy != null && !fy.toString().isBlank() ? Integer.valueOf(fy.toString()) : null);
            }
            if (body.containsKey("attendanceDedupMinutes")) s.setAttendanceDedupMinutes(newDedupMinutes);
            schoolRepository.save(s);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("address", s.getAddress());
            m.put("phone", s.getPhone());
            m.put("schoolNumber", s.getSchoolNumber());
            m.put("foundedYear", s.getFoundedYear());
            m.put("attendanceDedupMinutes", s.getAttendanceDedupMinutes());
            m.put("effectiveDedupMinutes", botConfigService.effectiveDedupMinutes(s.getId()));
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        String name = (String) body.get("name");
        Long districtId = Long.valueOf(body.get("districtId").toString());
        currentUserService.assertCanWriteSchool(caller, districtId);

        District district = districtRepository.findById(districtId).orElse(null);
        if (district == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.district.not_found")));
        }

        School s = new School();
        s.setName(name);
        s.setDistrict(district);
        School saved = schoolRepository.save(s);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "districtId", district.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return schoolRepository.findById(id).map(s -> {
            Long currentDistrictId = s.getDistrict() != null ? s.getDistrict().getId() : null;
            currentUserService.assertCanWriteSchool(caller, currentDistrictId);
            if (body.containsKey("name")) s.setName((String) body.get("name"));
            if (body.containsKey("districtId")) {
                Long newDistrictId = Long.valueOf(body.get("districtId").toString());
                currentUserService.assertCanWriteSchool(caller, newDistrictId);
                District d = districtRepository.findById(newDistrictId).orElse(null);
                if (d != null) s.setDistrict(d);
            }
            schoolRepository.save(s);
            return ResponseEntity.ok(Map.of("id", s.getId(), "name", s.getName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        School existing = schoolRepository.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchool(caller, existing.getDistrict() != null ? existing.getDistrict().getId() : null);

        studentRepository.deleteAll(studentRepository.findBySchoolId(id));
        classRepository.deleteAll(classRepository.findBySchoolId(id));

        schoolRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }
}
