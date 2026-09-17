package com.maktab.controller;

import com.maktab.model.District;
import com.maktab.model.Province;
import com.maktab.model.School;
import com.maktab.model.SchoolClass;
import com.maktab.model.User;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun "organizations" kontrakti: /api/v1/regions|districts|schools|classes.
 * Frontend B'ning /api/provinces, /api/districts, /api/schools, /api/classes'iga TEGILMAYDI —
 * bu yerda xuddi shu Province/District/School/SchoolClass entitylari va repositorylari
 * qayta ishlatiladi, faqat Frontend A kutgan yo'l va maydon nomlari bilan.
 *
 * Frontend A'ning haqiqiy sahifalari (OrganizationsPage.jsx, DevicesPage.jsx) "region",
 * "district", "school" kabi qisqa parent-id maydon nomlarini ishlatadi (Django uslubi).
 * Orqaga moslik uchun javoblarda ESKI (regionId/districtId/schoolId) va YANGI (region/
 * district/school) nom variantlari bir vaqtda beriladi.
 *
 * Bu sxemada Province/District/School/SchoolClass'da "code", "address", "phone",
 * "director_name", "academic_year" ustunlari YO'Q (Django'da bor edi). Bu maydonlar
 * so'rov tanasida qabul qilinadi, lekin hech qanday joyga saqlanmaydi — soddalashtirish,
 * schema o'zgartirilmadi (vazifa talabiga ko'ra).
 */
@RestController
@RequestMapping("/api/v1")
public class V1OrganizationController {

    @Autowired private ProvinceRepository provinceRepo;
    @Autowired private DistrictRepository districtRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    // ══════════════════════════ REGIONS (Province) ══════════════════════════

    // MUHIM: region/district/school so'rov parametrlari endi client'dan ishonch bilan
    // qabul qilinmaydi — SUPERADMIN'dan boshqa har bir rol Authorization headerdagi
    // haqiqiy foydalanuvchi ko'lamiga (ADMIN -> o'z provinceId'si, DIRECTOR/MUDIR/TEACHER
    // -> o'z schoolId'si) cheklanadi.

    @GetMapping("/regions/")
    public List<Map<String, Object>> getRegions(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                                  @RequestParam(required = false) String search) {
        User user = currentUserService.requireUser(authHeader);
        List<Province> list;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            list = provinceRepo.findAll();
        } else {
            Long pid = currentUserService.resolveUserProvinceId(user);
            list = pid != null ? provinceRepo.findById(pid).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(p -> p.getName() != null && p.getName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toRegionMap).collect(Collectors.toList());
    }

    @PostMapping("/regions/")
    public ResponseEntity<?> createRegion(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        if (body.get("name") == null) return ResponseEntity.badRequest().body(Map.of("name", List.of(i18n.msg("error.validation.required"))));
        Province p = new Province();
        p.setName(body.get("name").toString());
        provinceRepo.save(p);
        return ResponseEntity.ok(toRegionMap(p));
    }

    @PatchMapping("/regions/{id}/")
    public ResponseEntity<?> updateRegion(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        return provinceRepo.findById(id).map(p -> {
            if (body.containsKey("name") && body.get("name") != null) p.setName(body.get("name").toString());
            provinceRepo.save(p);
            return ResponseEntity.ok(toRegionMap(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/regions/{id}/")
    public ResponseEntity<?> deleteRegion(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        if (!provinceRepo.existsById(id)) return ResponseEntity.notFound().build();
        // ProvinceController'dagi kaskad o'chirish mantig'ini takrorlaymiz (viloyat -> tumanlar -> maktablar -> sinf/o'quvchi).
        List<District> districts = districtRepo.findByProvinceId(id);
        for (District d : districts) {
            List<School> schools = schoolRepo.findByDistrictId(d.getId());
            for (School s : schools) {
                studentRepo.deleteAll(studentRepo.findBySchoolId(s.getId()));
                classRepo.deleteAll(classRepo.findBySchoolId(s.getId()));
            }
            schoolRepo.deleteAll(schools);
        }
        districtRepo.deleteAll(districts);
        provinceRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    private Map<String, Object> toRegionMap(Province p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("code", null); // schema'da yo'q — soddalashtirish
        List<District> districts = districtRepo.findByProvinceId(p.getId());
        long schoolCount = 0, studentCount = 0;
        for (District d : districts) {
            List<School> schools = schoolRepo.findByDistrictId(d.getId());
            schoolCount += schools.size();
            for (School s : schools) studentCount += studentRepo.countBySchoolId(s.getId());
        }
        m.put("districts_count", districts.size());
        m.put("schools_count", schoolCount);
        m.put("students_count", studentCount);
        return m;
    }

    // ══════════════════════════ DISTRICTS ══════════════════════════

    @GetMapping("/districts/")
    public List<Map<String, Object>> getDistricts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long region,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) String search) {
        User user = currentUserService.requireUser(authHeader);
        Long requestedPid = region != null ? region : (regionId != null ? regionId : provinceId);

        List<District> list;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            list = requestedPid != null ? districtRepo.findByProvinceId(requestedPid) : districtRepo.findAll();
        } else {
            Long ownPid = currentUserService.resolveUserProvinceId(user);
            if (requestedPid != null && !requestedPid.equals(ownPid)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.province.access_denied"));
            }
            list = ownPid != null ? districtRepo.findByProvinceId(ownPid) : Collections.emptyList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(d -> d.getName() != null && d.getName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toDistrictMap).collect(Collectors.toList());
    }

    @PostMapping("/districts/")
    public ResponseEntity<?> createDistrict(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object regionVal = body.containsKey("region") ? body.get("region") : body.get("provinceId");
        if (body.get("name") == null || regionVal == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.district.name_region_required")));
        }
        Long provinceId = Long.valueOf(regionVal.toString());
        currentUserService.assertCanWriteDistrict(caller, provinceId);
        Province province = provinceRepo.findById(provinceId).orElse(null);
        if (province == null) return ResponseEntity.badRequest().body(Map.of("region", List.of(i18n.msg("error.province.not_found"))));

        District d = new District();
        d.setName(body.get("name").toString());
        d.setProvince(province);
        districtRepo.save(d);
        return ResponseEntity.ok(toDistrictMap(d));
    }

    @PatchMapping("/districts/{id}/")
    public ResponseEntity<?> updateDistrict(@PathVariable Long id,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return districtRepo.findById(id).map(d -> {
            Long currentProvinceId = d.getProvince() != null ? d.getProvince().getId() : null;
            currentUserService.assertCanWriteDistrict(caller, currentProvinceId);
            if (body.containsKey("name") && body.get("name") != null) d.setName(body.get("name").toString());
            Object regionVal = body.containsKey("region") ? body.get("region") : body.get("provinceId");
            if (regionVal != null) {
                Long newProvinceId = Long.valueOf(regionVal.toString());
                currentUserService.assertCanWriteDistrict(caller, newProvinceId);
                provinceRepo.findById(newProvinceId).ifPresent(d::setProvince);
            }
            districtRepo.save(d);
            return ResponseEntity.ok(toDistrictMap(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/districts/{id}/")
    public ResponseEntity<?> deleteDistrict(@PathVariable Long id,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        District existing = districtRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteDistrict(caller, existing.getProvince() != null ? existing.getProvince().getId() : null);
        if (!districtRepo.existsById(id)) return ResponseEntity.notFound().build();
        List<School> schools = schoolRepo.findByDistrictId(id);
        for (School s : schools) {
            studentRepo.deleteAll(studentRepo.findBySchoolId(s.getId()));
            classRepo.deleteAll(classRepo.findBySchoolId(s.getId()));
        }
        schoolRepo.deleteAll(schools);
        districtRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    private Map<String, Object> toDistrictMap(District d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("name", d.getName());
        m.put("code", null);
        Long provinceId = d.getProvince() != null ? d.getProvince().getId() : null;
        String provinceName = d.getProvince() != null ? d.getProvince().getName() : null;
        m.put("region", provinceId);       // Frontend A qisqa nom
        m.put("regionId", provinceId);
        m.put("provinceId", provinceId);
        m.put("provinceName", provinceName);
        List<School> schools = schoolRepo.findByDistrictId(d.getId());
        long studentCount = 0;
        for (School s : schools) studentCount += studentRepo.countBySchoolId(s.getId());
        m.put("schools_count", schools.size());
        m.put("students_count", studentCount);
        return m;
    }

    // ══════════════════════════ SCHOOLS ══════════════════════════

    @GetMapping("/schools/")
    public List<Map<String, Object>> getSchools(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long district,
            @RequestParam(required = false) Long districtId,
            @RequestParam(required = false) String search) {
        User user = currentUserService.requireUser(authHeader);
        Long did = district != null ? district : districtId;

        List<School> list;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            list = did != null ? schoolRepo.findByDistrictId(did) : schoolRepo.findAll();
        } else if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (did != null) {
                if (!currentUserService.canAccessDistrict(user, did)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
                }
                list = schoolRepo.findByDistrictId(did);
            } else {
                List<Long> schoolIds = currentUserService.schoolIdsForProvince(user.getProvinceId());
                list = schoolIds.isEmpty() ? Collections.emptyList() : schoolRepo.findAllById(schoolIds);
            }
        } else if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (did != null) {
                if (!currentUserService.canAccessDistrict(user, did)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
                }
                list = schoolRepo.findByDistrictId(did);
            } else {
                list = schoolRepo.findByDistrictId(user.getDistrictId());
            }
        } else { // DIRECTOR/MUDIR/TEACHER — faqat o'z maktabi (client filtriga qaramasdan)
            list = user.getSchoolId() != null
                ? schoolRepo.findById(user.getSchoolId()).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(s -> s.getName() != null && s.getName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toSchoolMap).collect(Collectors.toList());
    }

    // MUHIM: avval bu metodda na requireUser (autentifikatsiya), na scope tekshiruvi bor edi —
    // getSchools() (ro'yxat) to'g'ri cheklangan bo'lsa-da, bitta-maktab endpointi butunlay
    // ochiq qolgan edi (IDOR: istalgan kishi istalgan maktab id'sini so'rab tafsilotlarini
    // olardi). getSchools() bilan bir xil ko'lam qoidasi qo'llanildi.
    @GetMapping("/schools/{id}/")
    public ResponseEntity<?> getSchool(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        School s = schoolRepo.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, s.getId());
        return ResponseEntity.ok(toSchoolMap(s));
    }

    @PostMapping("/schools/")
    public ResponseEntity<?> createSchool(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object districtVal = body.get("district") != null ? body.get("district") : body.get("districtId");
        if (body.get("name") == null || districtVal == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.school.name_district_required")));
        }
        Long districtId = Long.valueOf(districtVal.toString());
        currentUserService.assertCanWriteSchool(caller, districtId);
        District district = districtRepo.findById(districtId).orElse(null);
        if (district == null) return ResponseEntity.badRequest().body(Map.of("district", List.of(i18n.msg("error.district.not_found"))));

        School s = new School();
        s.setName(body.get("name").toString());
        s.setDistrict(district);
        applyOptionalSchoolFields(s, body);
        schoolRepo.save(s);
        return ResponseEntity.ok(toSchoolMap(s));
    }

    @PatchMapping("/schools/{id}/")
    public ResponseEntity<?> updateSchool(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return schoolRepo.findById(id).map(s -> {
            Long currentDistrictId = s.getDistrict() != null ? s.getDistrict().getId() : null;
            currentUserService.assertCanWriteSchool(caller, currentDistrictId);
            if (body.containsKey("name") && body.get("name") != null) s.setName(body.get("name").toString());
            Object districtVal = body.containsKey("district") ? body.get("district") : body.get("districtId");
            if (districtVal != null) {
                Long newDistrictId = Long.valueOf(districtVal.toString());
                currentUserService.assertCanWriteSchool(caller, newDistrictId);
                districtRepo.findById(newDistrictId).ifPresent(s::setDistrict);
            }
            applyOptionalSchoolFields(s, body);
            schoolRepo.save(s);
            return ResponseEntity.ok(toSchoolMap(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** address/phone/schoolNumber/foundedYear — faqat body'da haqiqatan mavjud bo'lganda yangilanadi. */
    private void applyOptionalSchoolFields(School s, Map<String, Object> body) {
        if (body.containsKey("address")) s.setAddress((String) body.get("address"));
        if (body.containsKey("phone")) s.setPhone((String) body.get("phone"));
        Object schoolNumber = body.containsKey("schoolNumber") ? body.get("schoolNumber") : body.get("school_number");
        if (schoolNumber != null) s.setSchoolNumber(schoolNumber.toString());
        Object foundedYear = body.containsKey("foundedYear") ? body.get("foundedYear") : body.get("founded_year");
        if (foundedYear != null && !foundedYear.toString().isBlank()) s.setFoundedYear(Integer.valueOf(foundedYear.toString()));
    }

    @Transactional
    @DeleteMapping("/schools/{id}/")
    public ResponseEntity<?> deleteSchool(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        School existing = schoolRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchool(caller, existing.getDistrict() != null ? existing.getDistrict().getId() : null);
        if (!schoolRepo.existsById(id)) return ResponseEntity.notFound().build();
        studentRepo.deleteAll(studentRepo.findBySchoolId(id));
        classRepo.deleteAll(classRepo.findBySchoolId(id));
        schoolRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    private Map<String, Object> toSchoolMap(School s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        Long districtId = s.getDistrict() != null ? s.getDistrict().getId() : null;
        m.put("district", districtId);
        m.put("districtId", districtId);
        m.put("districtName", s.getDistrict() != null ? s.getDistrict().getName() : null);
        m.put("provinceName", s.getDistrict() != null && s.getDistrict().getProvince() != null
            ? s.getDistrict().getProvince().getName() : null);
        m.put("address", s.getAddress());
        m.put("phone", s.getPhone());
        m.put("schoolNumber", s.getSchoolNumber());
        m.put("school_number", s.getSchoolNumber());
        m.put("foundedYear", s.getFoundedYear());
        m.put("founded_year", s.getFoundedYear());
        m.put("director_name", userRepo.findFirstByRoleAndSchoolId(User.Role.DIRECTOR, s.getId())
            .map(User::getFullName).orElse(null));
        m.put("students_count", studentRepo.countBySchoolId(s.getId()));
        m.put("classCount", classRepo.findBySchoolId(s.getId()).size());
        return m;
    }

    // ══════════════════════════ CLASSES (SchoolClass) ══════════════════════════

    @GetMapping("/classes/")
    public List<Map<String, Object>> getClasses(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);

        List<SchoolClass> list;
        if (scope == null) {
            list = classRepo.findAll();
        } else if (scope.isEmpty()) {
            list = Collections.emptyList();
        } else if (scope.size() == 1) {
            list = classRepo.findBySchoolIdOrderByGradeAscSectionAsc(scope.get(0));
        } else {
            list = classRepo.findBySchoolIdIn(scope);
        }
        return list.stream().map(this::toClassMap).collect(Collectors.toList());
    }

    @PostMapping("/classes/")
    public ResponseEntity<?> createClass(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object schoolVal = body.get("school") != null ? body.get("school") : body.get("schoolId");
        if (schoolVal == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.validation.required"))));
        Long schoolId = Long.valueOf(schoolVal.toString());
        currentUserService.assertCanWriteClass(caller, schoolId);
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.not_found"))));

        SchoolClass sc = new SchoolClass();
        sc.setSchool(school);
        Integer grade = body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null;
        String section = body.get("section") != null ? body.get("section").toString() : null;
        sc.setGrade(grade);
        sc.setSection(section);
        sc.setName(body.get("name") != null && !body.get("name").toString().isBlank()
            ? body.get("name").toString()
            : (grade != null ? grade : "") + "-" + (section != null ? section : ""));
        Object teacherVal = body.get("teacher") != null ? body.get("teacher") : body.get("teacherId");
        sc.setTeacherId(teacherVal != null ? Long.valueOf(teacherVal.toString()) : null);
        classRepo.save(sc);
        return ResponseEntity.ok(toClassMap(sc));
    }

    @PatchMapping("/classes/{id}/")
    public ResponseEntity<?> updateClass(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return classRepo.findById(id).map(sc -> {
            Long currentSchoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
            currentUserService.assertCanWriteClass(caller, currentSchoolId);
            if (body.containsKey("name") && body.get("name") != null) sc.setName(body.get("name").toString());
            if (body.containsKey("grade")) sc.setGrade(body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null);
            if (body.containsKey("section")) sc.setSection(body.get("section") != null ? body.get("section").toString() : null);
            Object schoolVal = body.containsKey("school") ? body.get("school") : body.get("schoolId");
            if (schoolVal != null) {
                Long newSchoolId = Long.valueOf(schoolVal.toString());
                currentUserService.assertCanWriteClass(caller, newSchoolId);
                schoolRepo.findById(newSchoolId).ifPresent(sc::setSchool);
            }
            if (body.containsKey("teacher") || body.containsKey("teacherId")) {
                Object teacherVal = body.get("teacher") != null ? body.get("teacher") : body.get("teacherId");
                sc.setTeacherId(teacherVal != null ? Long.valueOf(teacherVal.toString()) : null);
            }
            classRepo.save(sc);
            return ResponseEntity.ok(toClassMap(sc));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/classes/{id}/")
    public ResponseEntity<?> deleteClass(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        SchoolClass existing = classRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteClass(caller, existing.getSchool() != null ? existing.getSchool().getId() : null);
        classRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toClassMap(SchoolClass sc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", sc.getId());
        m.put("name", sc.getName());
        m.put("grade", sc.getGrade());
        m.put("section", sc.getSection());
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        m.put("school", schoolId);
        m.put("schoolId", schoolId);
        m.put("schoolName", sc.getSchool() != null ? sc.getSchool().getName() : null);
        m.put("academic_year", null); // schema'da yo'q
        m.put("teacher", sc.getTeacherId());
        m.put("teacherId", sc.getTeacherId());
        if (sc.getTeacherId() != null) {
            userRepo.findById(sc.getTeacherId()).ifPresent(u -> {
                m.put("teacher_name", u.getFullName());
                m.put("teacherName", u.getFullName());
            });
        }
        m.put("students_count", studentRepo.countByClassId(sc.getId()));
        return m;
    }
}
