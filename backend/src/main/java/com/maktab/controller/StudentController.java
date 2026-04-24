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
import java.time.LocalDate;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @GetMapping
    public List<Map<String, Object>> getAll(@RequestParam(required = false) Long schoolId, @RequestParam(required = false) Long classId) {
        List<Student> students;
        if (classId != null) {
            students = studentRepository.findByClassId(classId);
        } else if (schoolId != null) {
            students = studentRepository.findBySchoolId(schoolId);
        } else {
            students = studentRepository.findAll();
        }
        return students.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("fullName", s.getFullName());
            m.put("faceId", s.getFaceId());
            m.put("birthDate", s.getBirthDate() != null ? s.getBirthDate().toString() : null);
            m.put("photoUrl", s.getPhotoUrl());
            m.put("schoolId", s.getSchool().getId());
            m.put("schoolName", s.getSchool().getName());
            m.put("classId", s.getClassId());
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
            m.put("birthDate", s.getBirthDate() != null ? s.getBirthDate().toString() : null);
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
        // Auto-generate faceId: SCH{schoolId}-{UUID short}
        s.setFaceId("SCH" + schoolId + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setPhotoUrl((String) body.get("photoUrl"));
        if (body.containsKey("birthDate") && body.get("birthDate") != null) {
            s.setBirthDate(LocalDate.parse(body.get("birthDate").toString()));
        }
        s.setSchool(school);
        if (body.containsKey("classId") && body.get("classId") != null) {
            s.setClassId(Long.valueOf(body.get("classId").toString()));
        }
        Student saved = studentRepository.save(s);

        Map<String, Object> result = new HashMap<>();
        result.put("id", saved.getId());
        result.put("fullName", saved.getFullName());
        result.put("faceId", saved.getFaceId());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return studentRepository.findById(id).map(s -> {
            if (body.containsKey("fullName")) s.setFullName((String) body.get("fullName"));
            if (body.containsKey("photoUrl")) s.setPhotoUrl((String) body.get("photoUrl"));
            if (body.containsKey("birthDate") && body.get("birthDate") != null) {
                s.setBirthDate(LocalDate.parse(body.get("birthDate").toString()));
            }
            if (body.containsKey("schoolId")) {
                School school = schoolRepository.findById(Long.valueOf(body.get("schoolId").toString())).orElse(null);
                if (school != null) s.setSchool(school);
            }
            if (body.containsKey("classId")) {
                s.setClassId(body.get("classId") != null ? Long.valueOf(body.get("classId").toString()) : null);
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
