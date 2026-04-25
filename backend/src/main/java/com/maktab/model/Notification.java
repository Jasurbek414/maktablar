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
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationLevel level;

    // Qaysi foydalanuvchiga (null = hammaga)
    @Column
    private Long userId;

    // Qaysi rolga (null = hammaga)
    @Column
    private String targetRole;

    // Qaysi maktabga tegishli
    @Column
    private Long schoolId;

    @Column(nullable = false)
    private Boolean isRead = false;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    // Bog'liq entity
    @Column
    private String relatedEntity; // STUDENT, SCHOOL, CLASS, DEVICE, ATTENDANCE

    @Column
    private Long relatedId;

    public enum NotificationType {
        ATTENDANCE,     // Davomat eventi
        SYSTEM,         // Tizim xabarlari
        DEVICE_STATUS,  // Mini-PC/Face ID holati
        USER_ACTION,    // Foydalanuvchi amallari
        ALERT           // Muhim ogohlantirishlar
    }

    public enum NotificationLevel {
        INFO,     // Oddiy ma'lumot
        SUCCESS,  // Muvaffaqiyatli
        WARNING,  // Ogohlantirish
        ERROR     // Xato
    }
}
