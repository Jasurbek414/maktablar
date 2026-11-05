package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "guardians")
public class Guardian {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = true, unique = true)
    private String telegramUserId; // Telegram user identifier

    // BCrypt bilan shifrlangan parol — Telegram bot orqali ro'yxatdan o'tish uchun.
    // NULLABLE: V1StudentController#createParentLink orqali operator tomonidan yaratilgan
    // eski Guardian yozuvlarida hali parol yo'q — birinchi /start urinishida shu parol
    // "birinchi marta o'rnatiladigan parol" sifatida qabul qilinadi (GuardianController'ga qarang).
    @Column(nullable = true)
    private String password;
}
