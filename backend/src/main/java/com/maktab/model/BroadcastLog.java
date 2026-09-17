package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Ommaviy xabar (broadcast) audit yozuvi — real ota-onalarga xabar yuborilgani uchun
 * kim, qachon, qaysi maktab(lar)ga, nechta kishiga yuborganini kuzatib borish shart.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "broadcast_logs")
public class BroadcastLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sentByUserId;

    @Column(nullable = false)
    private String sentByName;

    // null = butun tizim bo'yicha (faqat SUPERADMIN/ADMIN uchun mumkin)
    @Column
    private Long schoolId;

    @Column
    private String schoolName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private Integer recipientCount;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
