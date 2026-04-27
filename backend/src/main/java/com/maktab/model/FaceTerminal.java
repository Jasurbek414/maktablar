package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Face ID terminal — Mini-PC serverga ulangan yuz tanish qurilmasi.
 * Istalgan model va ishlab chiqaruvchi qo'llab-quvvatlanadi.
 * Serial Number — asosiy identifikator (IP o'zgarganda ham topiladi).
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

    /** Qaysi Mini-PC ga ulangan */
    @Column(nullable = true)
    private Long deviceId;

    /** Qaysi maktabga tegishli */
    @Column(nullable = true)
    private Long schoolId;

    /** Qurilma nomi (masalan: "1-qavat kirish") */
    @Column(nullable = false)
    private String name;

    /** Serial raqami — ASOSIY IDENTIFIKATOR */
    @Column(unique = true)
    private String serialNumber;

    /** Ishlab chiqaruvchi (Hikvision, ZKTeco, Dahua, ...) */
    @Column
    private String brand;

    /** Qurilma modeli */
    @Column
    private String model;

    /** MAC manzili — ikkinchi darajali identifikator */
    @Column
    private String macAddress;

    /** Yo'nalishi — KIRISH yoki CHIQISH */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    /** Onlayn holati */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TerminalStatus status = TerminalStatus.OFFLINE;

    /** Terminal IP manzili (lokal tarmoq — o'zgarishi mumkin) */
    @Column
    private String ipAddress;

    /** Ulanish porti */
    @Column
    private Integer port;

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

    /** Qo'shimcha izoh */
    @Column
    private String notes;

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
