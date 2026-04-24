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

    // SUPERADMIN  → hamma viloyat
    // ADMIN       → bitta viloyat (provinceId)
    // DIRECTOR    → bitta maktab (schoolId)
    // MUDIR       → bitta maktab (schoolId)
    // TEACHER     → bitta maktab (schoolId)
    @Column(nullable = true)
    private Long provinceId;

    @Column(nullable = true)
    private Long districtId;

    @Column(nullable = true)
    private Long schoolId;

    public enum Role {
        SUPERADMIN,
        ADMIN,
        DIRECTOR,
        MUDIR,
        TEACHER
    }
}
