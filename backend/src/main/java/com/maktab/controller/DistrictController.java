package com.maktab.controller;

import com.maktab.model.District;
import com.maktab.model.Province;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/districts")
public class DistrictController {

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long provinceId) {
        List<District> districts;
        if (provinceId != null) {
            districts = districtRepository.findByProvinceId(provinceId);
        } else {
            districts = districtRepository.findAll();
        }
        return districts.stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            m.put("provinceId", d.getProvince().getId());
            m.put("provinceName", d.getProvince().getName());
            long schoolCount = schoolRepository.countByDistrictId(d.getId());
            m.put("schoolCount", schoolCount);
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
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
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        Long provinceId = Long.valueOf(body.get("provinceId").toString());

        Province province = provinceRepository.findById(provinceId).orElse(null);
        if (province == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Viloyat topilmadi"));
        }

        District d = new District();
        d.setName(name);
        d.setProvince(province);
        District saved = districtRepository.save(d);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "provinceId", province.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return districtRepository.findById(id).map(d -> {
            if (body.containsKey("name")) d.setName((String) body.get("name"));
            if (body.containsKey("provinceId")) {
                Province p = provinceRepository.findById(Long.valueOf(body.get("provinceId").toString())).orElse(null);
                if (p != null) d.setProvince(p);
            }
            districtRepository.save(d);
            return ResponseEntity.ok(Map.of("id", d.getId(), "name", d.getName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!districtRepository.existsById(id)) return ResponseEntity.notFound().build();
        districtRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }
}
