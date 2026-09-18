package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Har bir odam uchun BITTA qator — "hozir qayerda" so'rovi PersonRecognitionEvent jurnalini
 * (yuzlab-minglab yozuv) qidirmasin, shu denormallashtirilgan holatni o'qisin (Kamera-Reja,
 * 2026-09-18, 150 kameragacha miqyoslash uchun shart).
 *
 * Yozish: PersonLocationService yangi PersonRecognitionEvent kelganda shu qatorni faqat
 * seenAt YANGIROQ bo'lsa yangilaydi (qurilma hodisalari tartibsiz kelishi mumkin —
 * FaceTerminalMonitor'da 2026-09-17 aynan shu turdagi xato tuzatilgan edi).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "person_last_seen", uniqueConstraints = @UniqueConstraint(columnNames = {"person_type", "person_id"}))
public class PersonLastSeen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "person_type")
    private PersonNote.PersonType personType;

    @Column(nullable = false, name = "person_id")
    private Long personId;

    @Column(nullable = false)
    private Long schoolId;

    @Column
    private Long roomId;

    @Column(nullable = false)
    private Long deviceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PersonRecognitionEvent.DeviceType deviceType;

    @Column(nullable = false)
    private OffsetDateTime seenAt;

    @Column
    private Integer confidence;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
