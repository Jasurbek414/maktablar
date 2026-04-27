package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Face ID terminal — Mini-PC serverga ulangan yuz tanish qurilmasi.
 * Har bir Mini-PC da kamida 2 ta terminal bo'ladi: KIRISH va CHIQISH.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "face_terminals")
public class FaceTerminal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Qaysi Mini-PC ga ulangan (Cloud ISUP uchun null bo'lishi mumkin) */
    @Column(nullable = true)
    private Long deviceId;

    /** Qaysi maktabga tegishli */
    @Column(nullable = true)
    private Long schoolId;

    /** Qurilma nomi (masalan: "1-qavat kirish") */
    @Column(nullable = false)
    private String name;

    /** Hikvision serial raqami */
    @Column
    private String serialNumber;

    /** Qurilma modeli (masalan: DS-K1T341CMF) */
    @Column
    private String model;

    /** Yo'nalishi — KIRISH yoki CHIQISH */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    /** Onlayn holati */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TerminalStatus status = TerminalStatus.OFFLINE;

    /** Terminal IP manzili (lokal tarmoq) */
    @Column
    private String ipAddress;

    /** Firmware versiyasi */
    @Column
    private String firmwareVersion;

    /** Oxirgi ulanish vaqti */
    @Column
    private LocalDateTime lastSeen;

    /** Qo'shilgan sana */
    @Column
    private LocalDateTime createdAt;

    /** Oxirgi davomat eventi vaqti */
    @Column
    private LocalDateTime lastEventAt;

    /** Ro'yxatdan o'tgan yuzlar soni */
    @Column
    private Integer registeredFaces = 0;

    public enum Direction {
        ENTRANCE,   // Kirish eshigi
        EXIT        // Chiqish eshigi
    }

    public enum TerminalStatus {
        ONLINE,     // Ishlayapti
        OFFLINE,    // O'chiq
        ERROR       // Xatolik
    }
}
