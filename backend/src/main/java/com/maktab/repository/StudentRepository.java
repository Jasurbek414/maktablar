package com.maktab.repository;

import com.maktab.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByFaceId(String faceId);
    List<Student> findBySchoolId(Long schoolId);
    List<Student> findBySchoolIdIn(List<Long> schoolIds);
    List<Student> findByClassId(Long classId);
    long countBySchoolId(Long schoolId);
    long countByClassId(Long classId);

    // /guardians/telegram/{id}/stats va Student<->Guardian ManyToMany orqali
    // vasiyning barcha farzandlarini topish uchun (bot.py kontrakti).
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Student s JOIN s.guardians g WHERE g.id = :guardianId")
    List<Student> findByGuardianId(@org.springframework.data.repository.query.Param("guardianId") Long guardianId);
}
