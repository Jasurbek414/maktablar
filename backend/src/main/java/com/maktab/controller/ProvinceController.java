package com.maktab.controller;

import com.maktab.model.Province;
import com.maktab.model.District;
import com.maktab.model.School;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/provinces")
public class ProvinceController {

    @Autowired private ProvinceRepository provinceRepository;
    @Autowired private DistrictRepository districtRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private StudentRepository studentRepository;

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return provinceRepository.findAll().stream().map(p -> {
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
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return provinceRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Province create(@RequestBody Province province) {
        return provinceRepository.save(province);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Province updated) {
        return provinceRepository.findById(id).map(p -> {
            p.setName(updated.getName());
            return ResponseEntity.ok(provinceRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!provinceRepository.existsById(id)) return ResponseEntity.notFound().build();
        provinceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }
}
