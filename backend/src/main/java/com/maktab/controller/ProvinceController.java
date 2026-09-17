package com.maktab.controller;

import com.maktab.model.Province;
import com.maktab.model.District;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import com.maktab.repository.SchoolClassRepository;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/provinces")
public class ProvinceController {

    @Autowired private ProvinceRepository provinceRepository;
    @Autowired private DistrictRepository districtRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private SchoolClassRepository classRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;

    /**
     * MUHIM: bu legacy endpoint avval hech qanday auth/scoping'siz butun ro'yxatni qaytarardi.
     * Endi AttendanceController'ning tuzatilgan GET metodlari bilan bir xil uslubda —
     * SUPERADMIN/ADMIN uchun cheklovsiz, qolganlar uchun faqat o'z viloyati (yoki hech narsa).
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        List<Province> provinces;
        if (currentUserService.isUnrestrictedAdmin(user)) {
            provinces = provinceRepository.findAll();
        } else {
            Long ownProvinceId = currentUserService.resolveUserProvinceId(user);
            provinces = ownProvinceId != null
                ? provinceRepository.findById(ownProvinceId).map(List::of).orElse(Collections.emptyList())
                : Collections.emptyList();
        }
        return provinces.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());

            List<District> districts = districtRepository.findByProvinceId(p.getId());
            m.put("districtCount", districts.size());

            long schoolCount = 0;
            long studentCount = 0;
            for (District d : districts) {
                List<School> schools = schoolRepository.findByDistrictId(d.getId());
                schoolCount += schools.size();
                for (School s : schools) {
                    studentCount += studentRepository.countBySchoolId(s.getId());
                }
            }
            m.put("schoolCount", schoolCount);
            m.put("studentCount", studentCount);
            // attendance percentage placeholder - real data would come from attendance table
            m.put("attendancePercent", studentCount > 0 ? 0 : 0);

            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        if (!currentUserService.isUnrestrictedAdmin(user) && !currentUserService.canAccessProvince(user, id)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.province.access_denied")));
        }
        return provinceRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Province province) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        return ResponseEntity.ok(provinceRepository.save(province));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Province updated) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        return provinceRepository.findById(id).map(p -> {
            p.setName(updated.getName());
            return ResponseEntity.ok(provinceRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteProvince(caller);
        if (!provinceRepository.existsById(id)) return ResponseEntity.notFound().build();

        List<District> districts = districtRepository.findByProvinceId(id);
        for (District d : districts) {
            List<School> schools = schoolRepository.findByDistrictId(d.getId());
            for (School s : schools) {
                studentRepository.deleteAll(studentRepository.findBySchoolId(s.getId()));
                classRepository.deleteAll(classRepository.findBySchoolId(s.getId()));
            }
            schoolRepository.deleteAll(schools);
        }
        districtRepository.deleteAll(districts);
        provinceRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }
}
