package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.District;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.UserRepository;
import com.maktab.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long districtId) {
        List<School> schools;
        if (districtId != null) {
            schools = schoolRepository.findByDistrictId(districtId);
        } else {
            schools = schoolRepository.findAll();
        }
        return schools.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("districtId", s.getDistrict().getId());
            m.put("districtName", s.getDistrict().getName());
            m.put("provinceName", s.getDistrict().getProvince().getName());
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
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return schoolRepository.findById(id).map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("districtId", s.getDistrict().getId());
            m.put("districtName", s.getDistrict().getName());
            m.put("studentCount", studentRepository.countBySchoolId(s.getId()));
            m.put("classCount", classRepository.findBySchoolId(s.getId()).size());
            userRepository.findFirstByRoleAndSchoolId(User.Role.DIRECTOR, s.getId())
                .ifPresent(d -> m.put("directorName", d.getFullName()));
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        Long districtId = Long.valueOf(body.get("districtId").toString());

        District district = districtRepository.findById(districtId).orElse(null);
        if (district == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tuman topilmadi"));
        }

        School s = new School();
        s.setName(name);
        s.setDistrict(district);
        School saved = schoolRepository.save(s);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "districtId", district.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return schoolRepository.findById(id).map(s -> {
            if (body.containsKey("name")) s.setName((String) body.get("name"));
            if (body.containsKey("districtId")) {
                District d = districtRepository.findById(Long.valueOf(body.get("districtId").toString())).orElse(null);
                if (d != null) s.setDistrict(d);
            }
            schoolRepository.save(s);
            return ResponseEntity.ok(Map.of("id", s.getId(), "name", s.getName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!schoolRepository.existsById(id)) return ResponseEntity.notFound().build();
        
        studentRepository.deleteAll(studentRepository.findBySchoolId(id));
        classRepository.deleteAll(classRepository.findBySchoolId(id));
        
        schoolRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }
}
