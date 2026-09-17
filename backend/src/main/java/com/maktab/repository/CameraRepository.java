package com.maktab.repository;

import com.maktab.model.Camera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface CameraRepository extends JpaRepository<Camera, Long> {
    List<Camera> findBySchoolId(Long schoolId);
    List<Camera> findBySchoolIdIn(List<Long> schoolIds);
    List<Camera> findByRoomId(Long roomId);
    long countByRoomId(Long roomId);

    // ─── CameraMonitor uchun nishonli yangilashlar (admin tahririni eski qiymat bilan yozib yubormaslik uchun) ───
    // DIQQAT: enum JPQL'da literal sifatida yozilmaydi (Hibernate 6 ichki enum FQN'ini tushunmaydi,
    // 2026-09-15 backend shu sabab ishga tushmay qolgan) — doim parametr sifatida.

    @Modifying
    @Transactional
    @Query("UPDATE Camera c SET c.status = :status, c.lastSeen = :seen, c.lastError = NULL, "
        + "c.model = :model, c.serialNumber = :serial, c.firmwareVersion = :fw WHERE c.id = :id")
    int markOnline(@Param("id") Long id, @Param("status") Camera.CameraStatus status, @Param("seen") LocalDateTime seen,
                   @Param("model") String model, @Param("serial") String serialNumber, @Param("fw") String firmwareVersion);

    @Modifying
    @Transactional
    @Query("UPDATE Camera c SET c.status = :status, c.lastError = :error WHERE c.id = :id")
    int markError(@Param("id") Long id, @Param("status") Camera.CameraStatus status, @Param("error") String error);
}
