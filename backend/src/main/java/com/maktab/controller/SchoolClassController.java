package com.maktab.controller;

import com.maktab.model.SchoolClass;
import com.maktab.model.School;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classes")
public class SchoolClassController {

    @Autowired private SchoolClassRepository classRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private StudentRepository studentRepo;

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long schoolId) {
        List<SchoolClass> list = schoolId != null
            ? classRepo.findBySchoolIdOrderByGradeAscSectionAsc(schoolId)
            : classRepo.findAll();
        return list.stream().map(this::toMap).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return classRepo.findById(id)
            .map(c -> ResponseEntity.ok(toMap(c)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", "School not found"));

        SchoolClass sc = new SchoolClass();
        sc.setSchool(school);
        sc.setName(body.get("name").toString());
        sc.setGrade(body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null);
        sc.setSection(body.get("section") != null ? body.get("section").toString() : null);
        sc.setTeacherId(body.get("teacherId") != null ? Long.valueOf(body.get("teacherId").toString()) : null);
        classRepo.save(sc);
        return ResponseEntity.ok(toMap(sc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        SchoolClass sc = classRepo.findById(id).orElse(null);
        if (sc == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name")) sc.setName(body.get("name").toString());
        if (body.containsKey("grade")) sc.setGrade(body.get("grade") != null ? Integer.valueOf(body.get("grade").toString()) : null);
        if (body.containsKey("section")) sc.setSection(body.get("section") != null ? body.get("section").toString() : null);
        if (body.containsKey("teacherId")) sc.setTeacherId(body.get("teacherId") != null ? Long.valueOf(body.get("teacherId").toString()) : null);
        if (body.containsKey("schoolId")) {
            School school = schoolRepo.findById(Long.valueOf(body.get("schoolId").toString())).orElse(null);
            if (school != null) sc.setSchool(school);
        }
        classRepo.save(sc);
        return ResponseEntity.ok(toMap(sc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        classRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(SchoolClass sc) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", sc.getId());
        m.put("name", sc.getName());
        m.put("grade", sc.getGrade());
        m.put("section", sc.getSection());
        m.put("schoolId", sc.getSchool().getId());
        m.put("schoolName", sc.getSchool().getName());
        m.put("teacherId", sc.getTeacherId());
        // Count students in this class
        long count = studentRepo.countByClassId(sc.getId());
        m.put("studentCount", count);
        return m;
    }
}
