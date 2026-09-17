package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Ota-ona (Guardian) va maktab xodimi (User) o'rtasidagi xabar almashinuvi —
 * har doim bitta aniq o'quvchi kontekstida (masalan "Aliyev Vali haqida savol").
 * Ikki tomonlama: senderType SENDER kim yozganini bildiradi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType;

    @Column(name = "sender_guardian_id")
    private Long senderGuardianId;

    @Column(name = "sender_user_id")
    private Long senderUserId;

    @Column(name = "sender_name", nullable = false)
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public enum SenderType {
        GUARDIAN, STAFF
    }
}
