package com.maktab.repository;

import com.maktab.model.CameraEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface CameraEventRepository extends JpaRepository<CameraEvent, Long> {
    List<CameraEvent> findByCameraIdOrderByOccurredAtDesc(Long cameraId);
    long countByCameraId(Long cameraId);

    List<CameraEvent> findAllByOrderByOccurredAtDesc();
    List<CameraEvent> findBySchoolIdInOrderByOccurredAtDesc(List<Long> schoolIds);

    // AttendanceRepository'dagi findBySchoolsAndDateRange/findByTimestampBetween bilan bir xil
    // uslub: /stats agregatsiyasi uchun ko'lam ichidagi (yoki cheklovsiz) hodisalarni sana
    // oralig'ida olib, keyin controller'da guruhlab hisoblaydi (V1ReportsController'dagi
    // "sodda, izohlangan hisob-kitoblar" konvensiyasiga mos — kichik hajmdagi ma'lumot uchun).
    @Query("SELECT e FROM CameraEvent e WHERE e.school.id IN :schoolIds AND e.occurredAt BETWEEN :from AND :to ORDER BY e.occurredAt DESC")
    List<CameraEvent> findBySchoolsAndDateRange(@Param("schoolIds") List<Long> schoolIds, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    @Query("SELECT e FROM CameraEvent e WHERE e.occurredAt BETWEEN :from AND :to ORDER BY e.occurredAt DESC")
    List<CameraEvent> findByDateRange(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);
}
