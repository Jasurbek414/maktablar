package com.maktab.repository;

import com.maktab.model.AbsenceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AbsenceRequestRepository extends JpaRepository<AbsenceRequest, Long> {

    List<AbsenceRequest> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    /** Sinf rahbari uchun — faqat o'z sinf(lar)ining so'rovlari. */
    List<AbsenceRequest> findByClassIdInOrderByCreatedAtDesc(List<Long> classIds);

    /** Ota-ona uchun — faqat o'z farzandlariniki. */
    List<AbsenceRequest> findByStudentIdInOrderByCreatedAtDesc(List<Long> studentIds);

    /**
     * Berilgan kunga TASDIQLANGAN ruxsati bor o'quvchilar — sinf davomat jadvalida
     * "Sababli" holatini ko'rsatish uchun (ClassAttendanceService ishlatadi).
     * Bitta so'rovda olinadi, har bir o'quvchi uchun alohida so'rov qilinmaydi.
     */
    @Query("SELECT r.studentId FROM AbsenceRequest r "
         + "WHERE r.status = com.maktab.model.AbsenceRequest.Status.APPROVED "
         + "AND r.studentId IN :studentIds "
         + "AND r.startDate <= :day AND r.endDate >= :day")
    List<Long> findApprovedStudentIdsOn(@Param("studentIds") List<Long> studentIds,
                                        @Param("day") LocalDate day);
}
