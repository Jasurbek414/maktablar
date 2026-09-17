package com.maktab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * O'quvchi/o'qituvchi haqida xodim tomonidan qo'lda yozilgan izohlar tarixi —
 * append-only jurnal (tahrirlash/o'chirish yo'q, faqat qo'shish), har biri sana bilan.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "person_notes")
public class PersonNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "person_type")
    private PersonType personType;

    @Column(nullable = false, name = "person_id")
    private Long personId;

    @Column(name = "author_id")
    private Long authorId;

    @Column(name = "author_name")
    private String authorName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum PersonType {
        STUDENT, TEACHER
    }
}
