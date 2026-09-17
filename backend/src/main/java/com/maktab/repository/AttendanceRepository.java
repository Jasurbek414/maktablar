package com.maktab.repository;

import com.maktab.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentId(Long studentId);
    List<Attendance> findByStudentIdAndTimestampBetween(Long studentId, OffsetDateTime start, OffsetDateTime end);
    List<Attendance> findByStudentIdAndTimestampAfter(Long studentId, OffsetDateTime start);
    List<Attendance> findByStudentIdAndTimestampBefore(Long studentId, OffsetDateTime end);

    // MUHIM: bu uchta so'rov har doim "kunlik" chegara bilan chaqiriladi (from=kun boshi,
    // to=ertangi kun boshi). Avval BETWEEN (ikkala chegara INKLYUZIV) ishlatilardi — agar
    // hodisa aynan yarim tunda (00:00:00.000) bo'lsa, u HAM "kecha" so'rovining `to`siga,
    // HAM "bugun" so'rovining `from`iga mos kelib, ikkala kunga ham hisoblanardi. Endi
    // yarim ochiq oraliq (`>= from AND < to`) bilan har bir hodisa aniq bitta kunga tegishli.
    @Query("SELECT a FROM Attendance a WHERE a.student.school.id = :schoolId AND a.timestamp >= :from AND a.timestamp < :to ORDER BY a.timestamp DESC")
    List<Attendance> findBySchoolAndDateRange(@Param("schoolId") Long schoolId, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    @Query("SELECT a FROM Attendance a WHERE a.student.school.id = :schoolId ORDER BY a.timestamp DESC")
    List<Attendance> findBySchoolId(@Param("schoolId") Long schoolId);

    boolean existsByStudentIdAndTimestampAndType(Long studentId, OffsetDateTime timestamp, Attendance.AttendanceType type);
    boolean existsBySyncKey(String syncKey);

    /**
     * Dublikat aniqlash uchun VAQT OYNASI bo'yicha tekshiruv.
     *
     * MUHIM (2026-09-15 audit): yuqoridagi existsByStudentIdAndTimestampAndType faqat
     * millisekundgacha AYNAN bir xil timestamp'ni dublikat deb biladi. Terminal/tarmoq
     * qayta urinishida (retry) bitta jismoniy o'tish 1 soniya farq bilan qayta kelsa, u
     * dublikat sifatida aniqlanmasdan ikkinchi marta yozilardi — natijada ota-onaga
     * IKKITA "farzandingiz keldi" xabari ketardi. Endi bitta o'quvchining bir xil turdagi
     * hodisasi qisqa oyna (AttendanceController.DEDUP_WINDOW_SECONDS) ichida takrorlansa,
     * u dublikat deb hisoblanadi.
     */
    boolean existsByStudentIdAndTypeAndTimestampBetween(Long studentId, Attendance.AttendanceType type,
                                                         OffsetDateTime from, OffsetDateTime to);

    // /api/v1/attendance/** (Frontend A) uchun qo'shildi: maktabsiz, butun tizim bo'yicha
    // sana oralig'ida davomat olish kerak bo'lgan hollar uchun (masalan superadmin umumiy hisobot).
    // Spring Data derived BETWEEN (inklyuziv) o'rniga @Query bilan yarim ochiq oraliq — yuqoridagi izoh.
    @Query("SELECT a FROM Attendance a WHERE a.timestamp >= :from AND a.timestamp < :to")
    List<Attendance> findByTimestampBetween(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    // ADMIN scoping: bitta viloyatdagi bir nechta maktab bo'yicha sana oralig'ida davomat
    // (server-side scoping — CurrentUserService orqali aniqlangan ruxsat etilgan schoolId ro'yxati).
    @Query("SELECT a FROM Attendance a WHERE a.student.school.id IN :schoolIds AND a.timestamp >= :from AND a.timestamp < :to ORDER BY a.timestamp DESC")
    List<Attendance> findBySchoolsAndDateRange(@Param("schoolIds") List<Long> schoolIds, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);
}
