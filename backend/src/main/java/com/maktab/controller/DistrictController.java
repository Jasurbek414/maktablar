package com.maktab.controller;

import com.maktab.model.District;
import com.maktab.model.Province;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.transaction.annotation.Transactional;
import com.maktab.repository.SchoolClassRepository;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/districts")
public class DistrictController {

    @Autowired private DistrictRepository districtRepository;
    @Autowired private ProvinceRepository provinceRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private SchoolClassRepository classRepository;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    /**
     * MUHIM: provinceId endi client'dan ishonch bilan qabul qilinmaydi — SUPERADMIN/ADMIN'dan
     * boshqa har bir rol uchun haqiqiy ko'lam Authorization headerdagi foydalanuvchidan olinadi
     * (AttendanceController'ning tuzatilgan GET metodlari bilan bir xil uslub).
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestParam(required = false) Long provinceId) {
        User user = currentUserService.requireUser(authHeader);
        List<District> districts;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            districts = provinceId != null ? districtRepository.findByProvinceId(provinceId) : districtRepository.findAll();
        } else if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (provinceId != null && !currentUserService.canAccessProvince(user, provinceId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.province.access_denied"));
            }
            districts = districtRepository.findByProvinceId(user.getProvinceId());
        } else if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            districts = districtRepository.findById(user.getDistrictId()).map(List::of).orElse(Collections.emptyList());
        } else { // DIRECTOR/MUDIR/TEACHER — faqat o'z maktabi tumani
            Long ownDistrictId = currentUserService.resolveSchoolDistrictId(user.getSchoolId());
            districts = ownDistrictId != null ? districtRepository.findById(ownDistrictId).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        }
        return districts.stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            m.put("provinceId", d.getProvince().getId());
            m.put("provinceName", d.getProvince().getName());
            List<School> schools = schoolRepository.findByDistrictId(d.getId());
            m.put("schoolCount", schools.size());
            long studentCount = 0;
            for (School s : schools) studentCount += studentRepository.countBySchoolId(s.getId());
            m.put("studentCount", studentCount);
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        if (!currentUserService.isUnrestrictedAdmin(user) && !currentUserService.canAccessDistrict(user, id)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.district.access_denied")));
        }
        return districtRepository.findById(id).map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            m.put("provinceId", d.getProvince().getId());
            m.put("provinceName", d.getProvince().getName());
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        String name = (String) body.get("name");
        Long provinceId = Long.valueOf(body.get("provinceId").toString());
        currentUserService.assertCanWriteDistrict(caller, provinceId);

        Province province = provinceRepository.findById(provinceId).orElse(null);
        if (province == null) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.province.not_found")));
        }

        District d = new District();
        d.setName(name);
        d.setProvince(province);
        District saved = districtRepository.save(d);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "provinceId", province.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        return districtRepository.findById(id).map(d -> {
            Long currentProvinceId = d.getProvince() != null ? d.getProvince().getId() : null;
            currentUserService.assertCanWriteDistrict(caller, currentProvinceId);
            if (body.containsKey("name")) d.setName((String) body.get("name"));
            if (body.containsKey("provinceId")) {
                Long newProvinceId = Long.valueOf(body.get("provinceId").toString());
                currentUserService.assertCanWriteDistrict(caller, newProvinceId);
                Province p = provinceRepository.findById(newProvinceId).orElse(null);
                if (p != null) d.setProvince(p);
            }
            districtRepository.save(d);
            return ResponseEntity.ok(Map.of("id", d.getId(), "name", d.getName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        District existing = districtRepository.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteDistrict(caller, existing.getProvince() != null ? existing.getProvince().getId() : null);

        List<School> schools = schoolRepository.findByDistrictId(id);
        for (School s : schools) {
            studentRepository.deleteAll(studentRepository.findBySchoolId(s.getId()));
            classRepository.deleteAll(classRepository.findBySchoolId(s.getId()));
        }
        schoolRepository.deleteAll(schools);
        districtRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }
}
