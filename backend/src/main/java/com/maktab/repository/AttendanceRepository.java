package com.maktab.repository;

import com.maktab.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentId(Long studentId);
    List<Attendance> findByStudentIdAndTimestampBetween(Long studentId, OffsetDateTime start, OffsetDateTime end);
    List<Attendance> findByStudentIdAndTimestampAfter(Long studentId, OffsetDateTime start);
    List<Attendance> findByStudentIdAndTimestampBefore(Long studentId, OffsetDateTime end);

    @Query("SELECT a FROM Attendance a WHERE a.student.school.id = :schoolId AND a.timestamp BETWEEN :from AND :to ORDER BY a.timestamp DESC")
    List<Attendance> findBySchoolAndDateRange(@Param("schoolId") Long schoolId, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    @Query("SELECT a FROM Attendance a WHERE a.student.school.id = :schoolId ORDER BY a.timestamp DESC")
    List<Attendance> findBySchoolId(@Param("schoolId") Long schoolId);

    boolean existsByStudentIdAndTimestampAndType(Long studentId, OffsetDateTime timestamp, Attendance.AttendanceType type);
}
