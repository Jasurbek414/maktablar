package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Ota-onaning "farzandim falon kunlari kelmaydi" deb oldindan bergan ruxsat so'rovi.
 * Maktab xodimi (direktor/mudir yoki shu sinf rahbari) uni tasdiqlaydi yoki rad etadi.
 *
 * Mobil ilovadagi ekranlar (`mobile/lib/features/parent/submit_absence_screen.dart`,
 * `my_requests_tab.dart`, `mobile/lib/features/director/absence_requests_screen.dart`)
 * 2026-08 dan beri tayyor turgan edi, lekin serverda bu funksiya UMUMAN yo'q edi —
 * ilova hech qachon ishlamaydigan endpointga murojaat qilardi. Shuning uchun maydon
 * nomlari `mobile/lib/models/models.dart#AbsenceRequest` bilan AYNAN mos qilingan
 * (ilovani o'zgartirishga hojat qolmasligi uchun).
 *
 * Message.java bilan bir xil uslub: FK'lar oddiy Long ustun sifatida saqlanadi,
 * @ManyToOne ishlatilmaydi (lazy-loading muammolarining oldini olish uchun).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "absence_requests")
public class AbsenceRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    /** Ko'lamlash (scoping) uchun — so'rov qaysi maktabga tegishli. */
    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    /**
     * Sinf rahbari o'z sinfining so'rovlarini ko'rishi uchun. So'rov yaratilganda
     * o'quvchining o'sha paytdagi sinfidan nusxalanadi (o'quvchi keyin boshqa sinfga
     * o'tsa ham so'rov o'z tarixiy sinfida qoladi).
     */
    @Column(name = "class_id")
    private Long classId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false)
    private ReasonType reasonType;

    @Column(name = "reason_text", columnDefinition = "TEXT")
    private String reasonText;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    /** Ko'rib chiqqan xodimning ismi — ilovada "Direktor: izoh" ko'rinishida chiqadi. */
    @Column(name = "reviewed_by_name")
    private String reviewedByName;

    @Column(name = "created_by_guardian_id", nullable = false)
    private Long createdByGuardianId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = Status.PENDING;
    }

    /** Berilgan kun shu so'rov davriga tushadimi (ikkala chegara ham kiradi). */
    public boolean covers(LocalDate day) {
        return day != null && startDate != null && endDate != null
                && !day.isBefore(startDate) && !day.isAfter(endDate);
    }

    public enum ReasonType {
        ILLNESS, FAMILY, OTHER
    }

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}
