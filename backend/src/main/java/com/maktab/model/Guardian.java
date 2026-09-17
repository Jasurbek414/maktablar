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

    // Telegram bot tili — bot.py'dagi USER_LANGUAGES xotira-ichi keshdan farqli, bot
    // qayta ishga tushganda ham saqlanib qolishi uchun shu yerga yoziladi.
    // MUHIM: columnDefinition'dagi DEFAULT shart — mavjud qatorlar bo'lgan jadvalga
    // shunchaki "nullable=false" bilan ustun qo'shilsa, Hibernate ALTER TABLE'da DEFAULT
    // bermaydi va Postgres "contains null values" xatosi bilan ALTER'ni RAD ETADI (bu xato
    // ddl-auto:update'da fatal emas — jim o'tkazib yuboriladi, ustun umuman qo'shilmay
    // qoladi, keyin shu ustunga tegishli har qanday so'rov "column does not exist" beradi).
    @Column(nullable = false, columnDefinition = "VARCHAR(10) DEFAULT 'uz'")
    private String languagePreference = "uz";

    // false bo'lsa, botdagi davomat/xabar bildirishnomalari shu guardian'ga yuborilmaydi.
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean notificationsEnabled = true;
}
