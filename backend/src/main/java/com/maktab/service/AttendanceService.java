package com.maktab.service;

import com.maktab.model.Attendance;
import com.maktab.model.Student;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private StudentRepository studentRepository;

    public Attendance record(Long studentId, OffsetDateTime timestamp, Attendance.AttendanceType type) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        Attendance attendance = new Attendance();
        attendance.setStudent(student);
        attendance.setTimestamp(timestamp);
        attendance.setType(type);
        return attendanceRepository.save(attendance);
    }

    public List<Attendance> findByStudent(Long studentId, OffsetDateTime from, OffsetDateTime to) {
        if (from != null && to != null) {
            return attendanceRepository.findByStudentIdAndTimestampBetween(studentId, from, to);
        } else if (from != null) {
            return attendanceRepository.findByStudentIdAndTimestampAfter(studentId, from);
        } else if (to != null) {
            return attendanceRepository.findByStudentIdAndTimestampBefore(studentId, to);
        } else {
            return attendanceRepository.findByStudentId(studentId);
        }
    }
}
