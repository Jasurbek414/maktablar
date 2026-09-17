package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * Face ID terminal — maktabning Mikrotik router VPN tunneli orqali to'g'ridan-to'g'ri
 * markaziy platformaga ulangan yuz tanish qurilmasi (lokal mini-PC gateway yo'q).
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

    /** Qaysi Mikrotik router orqali ulangan (ixtiyoriy — asosiy scoping schoolId orqali) */
    @Column(nullable = true)
    private Long routerId;

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

    /** Ba'zi qurilmalar HTTP so'rovini majburan HTTPS'ga (o'z-o'zidan imzolangan sertifikat bilan)
     * yo'naltiradi — shunday qurilmalarda true bo'lishi kerak (TerminalEndpointResolver). */
    @Column
    private Boolean useHttps;

    /** Qurilmaning o'z HTTP API (masalan Hikvision ISAPI) autentifikatsiya foydalanuvchi nomi. */
    @Column
    private String deviceUsername;

    /** Qurilmaning o'z HTTP API paroli — yuz ma'lumotlarini push qilishda Digest Auth uchun
     * ochiq matn holida kerak (server-tomon parol emas, WireguardKeyUtil private key kabi
     * qurilma-tomon sir — shu sabab bcrypt emas, oddiy ustunda saqlanadi). */
    @Column
    private String devicePassword;

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

    /** Qurilmadan o'qilgan oxirgi voqea tartib raqami (AcsEvent serialNo) — keyingi so'rov shundan
     * keyingisidan boshlanadi, backend yoki VPN uzilib qolsa ham voqealar yo'qolmaydi. null =
     * hali boshlanmagan (birinchi ulanishda qurilmadagi eski voqealar import qilinmaydi). */
    @Column(updatable = false) // faqat FaceTerminalRepository#updateLastEventSerial yozadi — admin tahriri eski qiymatni qaytarmasin
    private Long lastEventSerial;

    /** Oxirgi aloqa xatosi (panelda ko'rsatish uchun) — muvaffaqiyatli ulanishda tozalanadi. */
    @Column(length = 500)
    private String lastError;

    /** Qurilmadagi foydalanuvchilar soni (registeredFaces — yuzi borlari). */
    @Column
    private Integer userCount;

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
