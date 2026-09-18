package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Kamera/terminal yuz tanish qurilmasi "odam#X ni ko'rdim" deb xabar bergan har bir hodisa —
 * append-only jurnal (PersonLastSeen shu jurnaldan "hozirgi holat"ni denormallashtiradi).
 *
 * DIQQAT: bu Attendance (davomat, faqat FaceTerminal kirish/chiqish uchun) BILAN ALMASHTIRILMAYDI —
 * u alohida, huquqiy/rasmiy davomat yozuvi. Bu jadval esa har qanday kuzatuv kamerasidan kelgan
 * "shu daqiqada shu odam shu joyda ko'rindi" signalidir (Kamera-Reja, 2026-09-18).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "person_recognition_events")
public class PersonRecognitionEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Qaysi qurilma ko'rdi — Camera yoki FaceTerminal id'si (ikkalasi ham bo'lishi mumkin,
     * shu sabab bevosita FK emas — qaysi turdan ekanini deviceType bildiradi). */
    @Column(nullable = false)
    private Long deviceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceType deviceType;

    /** Scoping so'rovlari uchun denormallashtirilgan (CameraEvent'dagi bilan bir xil uslub). */
    @Column(nullable = false)
    private Long schoolId;

    /** Ixtiyoriy — qurilmaga xona biriktirilmagan bo'lishi mumkin. */
    @Column
    private Long roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "person_type")
    private PersonNote.PersonType personType;

    @Column(nullable = false, name = "person_id")
    private Long personId;

    /** 0-100, qurilma bergan mos kelish ishonchi (ma'lum bo'lmasa null). */
    @Column
    private Integer confidence;

    /** Qurilmada hodisa sodir bo'lgan vaqt (qabul qilingan vaqtdan farqli). */
    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    /** Dublikat oldini olish uchun — "cam-{deviceId}-{qurilma o'zining voqea id'si}"
     * (Attendance.syncKey/FaceAttendanceIngestService bilan bir xil naqsh). */
    @Column(unique = true)
    private String syncKey;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public enum DeviceType {
        CAMERA, FACE_TERMINAL
    }
}
