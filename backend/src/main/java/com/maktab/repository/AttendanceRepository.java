package com.maktab.repository;

import com.maktab.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentId(Long studentId);
    List<Attendance> findByStudentIdAndTimestampBetween(Long studentId, OffsetDateTime start, OffsetDateTime end);
    List<Attendance> findByStudentIdAndTimestampAfter(Long studentId, OffsetDateTime start);
    List<Attendance> findByStudentIdAndTimestampBefore(Long studentId, OffsetDateTime end);
}
