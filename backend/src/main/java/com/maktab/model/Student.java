package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String faceId; // auto-generated identifier

    @Column
    private LocalDate birthDate;

    @Column
    private String photoUrl;

    // MUHIM (2026-09-15 audit): avval LAZY edi. NotificationService#notifyGuardians va
    // #createAttendanceNotification @Async (alohida thread)da ishlaydi — u yerda Hibernate
    // sessiyasi allaqachon yopilgan bo'ladi, shu sabab student.getSchool().getName()
    // LazyInitializationException tashlardi. Bu xato catch (Exception) ichida JIM YUTILARDI
    // → ota-onaga Telegram xabari UMUMAN ketmasdi va web bildirishnoma ham yaratilmasdi,
    // lekin panel "yuborildi" deb ko'rsatardi. Pastdagi `guardians` allaqachon EAGER
    // bo'lgani kabi, `school` ham EAGER qilindi (School — kichik jadval, qo'shimcha yuk
    // sezilarli emas, va u allaqachon deyarli har bir mapper'da o'qiladi).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "class_id")
    private Long classId;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "student_guardians",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "guardian_id")
    )
    private List<Guardian> guardians;
}
