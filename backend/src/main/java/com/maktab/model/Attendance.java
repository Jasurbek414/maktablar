package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "attendance", uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "timestamp", "type"}))
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private OffsetDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceType type;

    @Column
    private Double temperature; // optional: Face ID device may send temperature

    @Column
    private String deviceSerial; // which device recorded this

    @Column
    private String photoPath; // Face ID capture rasm yo'li

    @Column
    private Long miniPcDeviceId; // qaysi mini-PC dan kelgan

    @Column(unique = true)
    private String syncKey; // dublikat oldini olish uchun (schoolId-studentId-timestamp-type)

    @Column
    private Boolean notificationSent = false; // Telegram xabar yuborilganmi

    @Column
    private OffsetDateTime syncedAt; // main backend'ga qachon kelgani

    public enum AttendanceType {
        IN,
        OUT
    }
}
