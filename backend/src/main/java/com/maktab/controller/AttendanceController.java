package com.maktab.controller;

import com.maktab.model.Attendance;
import com.maktab.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @PostMapping
    public ResponseEntity<Attendance> recordAttendance(@RequestBody AttendanceDto dto) {
        Attendance saved = attendanceService.record(dto.getStudentId(), dto.getTimestamp(), dto.getType());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<Attendance>> getByStudent(@PathVariable Long studentId,
                                                          @RequestParam(required = false) String from,
                                                          @RequestParam(required = false) String to) {
        OffsetDateTime fromDt = from != null ? OffsetDateTime.parse(from) : null;
        OffsetDateTime toDt = to != null ? OffsetDateTime.parse(to) : null;
        List<Attendance> list = attendanceService.findByStudent(studentId, fromDt, toDt);
        return ResponseEntity.ok(list);
    }

    // DTO class
    public static class AttendanceDto {
        private Long studentId;
        private OffsetDateTime timestamp;
        private Attendance.AttendanceType type;
        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }
        public OffsetDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }
        public Attendance.AttendanceType getType() { return type; }
        public void setType(Attendance.AttendanceType type) { this.type = type; }
    }
}
