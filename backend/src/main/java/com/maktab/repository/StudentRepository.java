package com.maktab.repository;

import com.maktab.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByFaceId(String faceId);
    List<Student> findBySchoolId(Long schoolId);
    long countBySchoolId(Long schoolId);
}
