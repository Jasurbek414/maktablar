package com.maktab.controller;

import com.maktab.model.Student;
import com.maktab.model.School;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long schoolId) {
        List<Student> students;
        if (schoolId != null) {
            students = studentRepository.findBySchoolId(schoolId);
        } else {
            students = studentRepository.findAll();
        }
        return students.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("fullName", s.getFullName());
            m.put("faceId", s.getFaceId());
            m.put("photoUrl", s.getPhotoUrl());
            m.put("schoolId", s.getSchool().getId());
            m.put("schoolName", s.getSchool().getName());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return studentRepository.findById(id).map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("fullName", s.getFullName());
            m.put("faceId", s.getFaceId());
            m.put("photoUrl", s.getPhotoUrl());
            m.put("schoolId", s.getSchool().getId());
            m.put("schoolName", s.getSchool().getName());
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/face/{faceId}")
    public ResponseEntity<?> getByFaceId(@PathVariable String faceId) {
        return studentRepository.findByFaceId(faceId)
            .map(s -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", s.getId());
                m.put("fullName", s.getFullName());
                m.put("faceId", s.getFaceId());
                return ResponseEntity.ok(m);
            }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", "Maktab topilmadi"));

        Student s = new Student();
        s.setFullName((String) body.get("fullName"));
        s.setFaceId((String) body.get("faceId"));
        s.setPhotoUrl((String) body.get("photoUrl"));
        s.setSchool(school);
        Student saved = studentRepository.save(s);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "fullName", saved.getFullName(), "faceId", saved.getFaceId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return studentRepository.findById(id).map(s -> {
            if (body.containsKey("fullName")) s.setFullName((String) body.get("fullName"));
            if (body.containsKey("faceId")) s.setFaceId((String) body.get("faceId"));
            if (body.containsKey("photoUrl")) s.setPhotoUrl((String) body.get("photoUrl"));
            if (body.containsKey("schoolId")) {
                School school = schoolRepository.findById(Long.valueOf(body.get("schoolId").toString())).orElse(null);
                if (school != null) s.setSchool(school);
            }
            studentRepository.save(s);
            return ResponseEntity.ok(Map.of("id", s.getId(), "fullName", s.getFullName()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!studentRepository.existsById(id)) return ResponseEntity.notFound().build();
        studentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }
}
