package com.maktab.controller;

import com.maktab.model.Province;
import com.maktab.repository.ProvinceRepository;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/provinces")
public class ProvinceController {

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private DistrictRepository districtRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @GetMapping
    public List<Map<String, Object>> getAll() {
        return provinceRepository.findAll().stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            long districtCount = districtRepository.countByProvinceId(p.getId());
            m.put("districtCount", districtCount);
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
        if (!provinceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        provinceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }
}
