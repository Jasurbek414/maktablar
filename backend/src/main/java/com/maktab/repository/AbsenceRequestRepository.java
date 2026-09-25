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
     * Berilgan kunda berilgan holatdagi ruxsati bor o'quvchilar.
     *
     * MUHIM (2026-09-25): holat HQL ichiga enum konstantasi sifatida
     * (`r.status = com.maktab.model.AbsenceRequest.Status.APPROVED`) yozilgan edi —
     * Hibernate 6 buni ichma-ich (nested) enum bo'lgani uchun o'qiy olmadi va ilova
     * ISHGA TUSHMAY qoldi ("Could not interpret path expression"). Bu xatoni birlik
     * testlari topa olmagan, chunki ular repozitoriyni mock qiladi — HQL faqat Spring
     * konteksti ko'tarilayotganda tekshiriladi. Yechim: holatni PARAMETR sifatida berish.
     */
    @Query("SELECT r.studentId FROM AbsenceRequest r "
         + "WHERE r.status = :status "
         + "AND r.studentId IN :studentIds "
         + "AND r.startDate <= :day AND r.endDate >= :day")
    List<Long> findStudentIdsWithStatusOn(@Param("status") AbsenceRequest.Status status,
                                          @Param("studentIds") List<Long> studentIds,
                                          @Param("day") LocalDate day);

    /**
     * Berilgan kunga TASDIQLANGAN ruxsati bor o'quvchilar — sinf davomat jadvalida
     * "Sababli" holatini ko'rsatish uchun (ClassAttendanceService ishlatadi).
     * Bitta so'rovda olinadi, har bir o'quvchi uchun alohida so'rov qilinmaydi.
     */
    default List<Long> findApprovedStudentIdsOn(List<Long> studentIds, LocalDate day) {
        return findStudentIdsWithStatusOn(AbsenceRequest.Status.APPROVED, studentIds, day);
    }
}
