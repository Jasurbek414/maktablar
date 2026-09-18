package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.OffsetDateTime;

/**
 * Video-kuzatuv kamerasi — maktabga biriktirilgan qurilma metama'lumoti.
 * DIQQAT: bu Face-ID subsistemasi (MikrotikRouter/FaceTerminal) bilan HECH QANDAY
 * bog'liqligi yo'q — butunlay alohida, video-kuzatuv kontseptsiyasi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cameras")
public class Camera {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column
    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column
    private String ipAddress;

    @Column
    private String resolution;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CameraStatus status = CameraStatus.OFFLINE;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ─── Masofadan boshqarish (ixtiyoriy) ───
    // Brend va login kiritilsa kamera platformadan boshqariladi: holat avtomatik kuzatiladi
    // (CameraMonitor), snapshot VPN orqali olinadi. Kiritilmasa — avvalgidek faqat metama'lumot.

    /** Ishlab chiqaruvchi (hozircha boshqaruv faqat "Hikvision" uchun). */
    @Column
    private String brand;

    @Column
    private String model;

    @Column
    private String serialNumber;

    @Column
    private String firmwareVersion;

    /** HTTP (ISAPI) porti, standart 80. */
    @Column
    private Integer port;

    /** Ba'zi qurilmalar HTTP so'rovini majburan HTTPS'ga yo'naltiradi — shunday bo'lsa true. */
    @Column
    private Boolean useHttps;

    /** RTSP porti, standart 554. */
    @Column
    private Integer rtspPort;

    /** Oqim kanali (Hikvision: 101 = 1-kanal asosiy oqim). */
    @Column
    private String streamChannel;

    /** Kamera modeli o'zida yuz tanishni qo'llab-quvvatladimi (masalan Hikvision DeepinView/
     * AcuSense) — barcha Hikvision kameralar ulanishi (masofadan boshqarish, snapshot, holat)
     * mumkin bo'lsa-da, faqat shu belgi TRUE bo'lgan kameralar PersonRecognitionMonitor orqali
     * "odam qayerda" oqimiga qo'shiladi. Admin qo'lda belgilaydi — kamera turi ISAPI orqali
     * ishonchli avtomatik aniqlanmaydi. Standart: false (Kamera-Reja, 2026-09-18). */
    @Column
    private Boolean supportsFaceRecognition = false;

    @Column
    private String deviceUsername;

    /** Qurilma paroli — Digest auth uchun ochiq holda kerak (FaceTerminal.devicePassword bilan bir xil);
     * API javoblarida qaytarilmaydi, faqat hasDevicePassword. */
    @Column
    private String devicePassword;

    @Column
    private java.time.LocalDateTime lastSeen;

    @Column(length = 500)
    private String lastError;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = CameraStatus.OFFLINE;
    }

    public enum CameraStatus {
        ONLINE, OFFLINE, MAINTENANCE
    }
}
