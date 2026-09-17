package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Kamera bo'yicha qayd etilgan hodisa/insident — hozircha xodim tomonidan qo'lda
 * kiritiladi, lekin aynan shu shakl kelajakda haqiqiy AI/computer-vision pipeline
 * POST qiladigan kontraktga mos keladi. Bo'sh jadval — hali hech kim hodisa
 * qayd etmagan bo'lsa — halol to'g'ri holat, mock ma'lumot generatsiya qilinmaydi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "camera_events")
public class CameraEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "camera_id", nullable = false)
    private Camera camera;

    /** camera.school'ning yaratilish vaqtidagi nusxasi — scoping so'rovlari Camera orqali
     * JOIN qilmasdan to'g'ridan-to'g'ri shu ustunga murojaat qiladi (Attendance'dagi
     * denormalizatsiya uslubiga o'xshash qulaylik uchun). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CameraEventType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventSeverity severity;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Hodisa sodir bo'lgan vaqt — qayd etilgan vaqtdan (createdAt) farq qilishi mumkin. */
    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    /** Hodisani kim qayd etgani — kelajakdagi avtomatlashtirilgan manbadan kelsa null. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private User reportedBy;

    @Column(nullable = false)
    private Boolean resolved = false;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (resolved == null) resolved = false;
    }

    public enum CameraEventType {
        MOTION, PERSON_DETECTED, CROWD, UNAUTHORIZED_ACCESS, EQUIPMENT_ISSUE, OTHER
    }

    public enum EventSeverity {
        LOW, MEDIUM, HIGH
    }
}
