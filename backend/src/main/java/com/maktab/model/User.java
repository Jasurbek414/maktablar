package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // SUPERADMIN        → hamma narsa, cheklovsiz
    // ADMIN             → hamma narsa cheklovsiz KO'RADI (bitta viloyatga endi bog'lanmaydi);
    //                      YOZISH huquqi adminLevel'ga qarab JwtFilter'da cheklanadi
    // REGION_DIRECTOR   → bitta viloyat (provinceId) — eski ADMIN'ning o'rnini bosadi
    // DISTRICT_DIRECTOR → bitta tuman (districtId)
    // DIRECTOR          → bitta maktab (schoolId)
    // MUDIR             → bitta maktab (schoolId)
    // TEACHER           → bitta maktab (schoolId)
    @Column(nullable = true)
    private Long provinceId;

    @Column(nullable = true)
    private Long districtId;

    @Column(nullable = true)
    private Long schoolId;

    // Faqat role == ADMIN bo'lganda ma'noli — superadmin ADMIN yaratganda/tahrirlaganda
    // belgilaydi. Boshqa rollar uchun null/e'tiborsiz. Nullable — mavjud production
    // qatorlarida bu ustun bo'sh bo'ladi (additive migration).
    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private AdminLevel adminLevel;

    // Foydalanuvchi deaktivlashtirilganmi. Nullable qilib qo'yilgan — mavjud production
    // qatorlarida NULL bo'ladi, shuning uchun kod NULL'ni "faol" deb talqin qiladi
    // (faqat aniq FALSE holatda kirish rad etiladi). Yangi foydalanuvchilar uchun default true.
    @Column(nullable = true)
    private Boolean isActive = true;

    // ── O'qituvchi profili uchun qo'shimcha maydonlar (boshqa rollar uchun ixtiyoriy) ──
    @Column(nullable = true)
    private String phone;

    /** O'qituvchi o'qitadigan fan (masalan "Matematika"). Faqat TEACHER uchun ma'noli. */
    @Column(nullable = true)
    private String subject;

    public enum Role {
        SUPERADMIN,
        ADMIN,
        REGION_DIRECTOR,
        DISTRICT_DIRECTOR,
        DIRECTOR,
        MUDIR,
        TEACHER;

        /**
         * Frontend A (Django uslubi, snake_case) kutgan rol nomi.
         * DIRECTOR -> "school_director" maxsus holat (UsersPage.jsx shu nomni tekshiradi),
         * qolganlari to'g'ridan-to'g'ri lowercase.
         */
        public String toApiName() {
            if (this == DIRECTOR) return "school_director";
            return name().toLowerCase();
        }

        /**
         * toApiName() ning teskarisi — frontenddan kelgan snake_case nomni yoki ENUM nomini
         * (katta-kichik harfga sezgir emas) Role'ga aylantiradi. Noma'lum qiymat uchun null.
         */
        public static Role fromApiName(String raw) {
            if (raw == null) return null;
            String v = raw.trim();
            if (v.isEmpty()) return null;
            if (v.equalsIgnoreCase("school_director")) return DIRECTOR;
            try {
                return Role.valueOf(v.toUpperCase());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }

    public enum AdminLevel {
        FULL,
        VIEW_ONLY
    }
}
