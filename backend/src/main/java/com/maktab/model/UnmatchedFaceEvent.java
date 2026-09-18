package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Face ID terminal "tanidi" deb voqea yuborgan, lekin platforma HECH QANDAY joriy
 * o'quvchiga moslay olmagan holatlar — avval faqat backend log'ida ko'rinardi
 * (log.warn/log.error), operator uchun butunlay ko'rinmas edi. Endi shu jadvalga
 * yoziladi, "Boshqarish" panelida ko'rsatiladi (FaceAttendanceIngestService).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "unmatched_face_events")
public class UnmatchedFaceEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "terminal_id", nullable = false)
    private Long terminalId;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "employee_no")
    private String employeeNo;

    @Column(nullable = false)
    private OffsetDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Reason reason;

    /** Qurilma voqeasi kaliti (hik-{terminalId}-{serialNo}) — monitor har siklda oxirgi voqealarni
     * qayta o'qiydi, shu kalitsiz bitta tanilmagan voqea har 5 soniyada yangi qator bo'lib yozilardi. */
    @Column(name = "sync_key", unique = true)
    private String syncKey;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public enum Reason {
        UNKNOWN_STUDENT,   // employeeNo hech qaysi joriy o'quvchiga mos kelmadi (masalan o'chirilgan/eski yuz)
        AMBIGUOUS_STUDENT  // employeeNo bir nechta o'quvchiga mos keldi
    }
}
