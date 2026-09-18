package com.maktab.repository;

import com.maktab.model.FaceTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceTerminalRepository extends JpaRepository<FaceTerminal, Long> {
    List<FaceTerminal> findByRouterId(Long routerId);
    List<FaceTerminal> findByRouterIdIn(List<Long> routerIds);
    List<FaceTerminal> findBySchoolId(Long schoolId);
    List<FaceTerminal> findBySchoolIdIn(List<Long> schoolIds);
    List<FaceTerminal> findByStatus(FaceTerminal.TerminalStatus status);
    Optional<FaceTerminal> findBySerialNumber(String serialNumber);
    long countByRouterId(Long routerId);
    long countByRouterIdAndDirection(Long routerId, FaceTerminal.Direction direction);

    // ─── FaceTerminalMonitor uchun nishonli yangilashlar ───
    // To'liq save() o'rniga: monitor, voqea so'rovi va admin tahriri parallel ishlaganda bir-birining
    // maydonlarini eski qiymat bilan qayta yozib yubormasligi uchun faqat kerakli ustunlar yangilanadi.

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.lastEventSerial = :serial WHERE t.id = :id")
    int updateLastEventSerial(@org.springframework.data.repository.query.Param("id") Long id,
                              @org.springframework.data.repository.query.Param("serial") Long serial);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.status = :status, "
        + "t.lastSeen = :seen, t.lastError = NULL, t.model = :model, t.firmwareVersion = :fw, "
        + "t.userCount = :users, t.registeredFaces = :faces WHERE t.id = :id")
    int markOnline(@org.springframework.data.repository.query.Param("id") Long id,
                   @org.springframework.data.repository.query.Param("status") FaceTerminal.TerminalStatus status,
                   @org.springframework.data.repository.query.Param("seen") java.time.LocalDateTime seen,
                   @org.springframework.data.repository.query.Param("model") String model,
                   @org.springframework.data.repository.query.Param("fw") String firmwareVersion,
                   @org.springframework.data.repository.query.Param("users") Integer users,
                   @org.springframework.data.repository.query.Param("faces") Integer faces);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.status = :status, "
        + "t.lastSeen = :seen, t.lastError = NULL WHERE t.id = :id")
    int touchOnline(@org.springframework.data.repository.query.Param("id") Long id,
                    @org.springframework.data.repository.query.Param("status") FaceTerminal.TerminalStatus status,
                    @org.springframework.data.repository.query.Param("seen") java.time.LocalDateTime seen);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.status = :status, t.lastError = :error WHERE t.id = :id")
    int markError(@org.springframework.data.repository.query.Param("id") Long id,
                  @org.springframework.data.repository.query.Param("status") FaceTerminal.TerminalStatus status,
                  @org.springframework.data.repository.query.Param("error") String error);

    /** Xona o'chirilganda — terminallar "xonasiz" holatga o'tadi (monitor maydonlariga tegmasdan). */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.roomId = NULL WHERE t.roomId = :roomId")
    int clearRoom(@org.springframework.data.repository.query.Param("roomId") Long roomId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE FaceTerminal t SET t.lastEventAt = :at WHERE t.id = :id")
    int updateLastEventAt(@org.springframework.data.repository.query.Param("id") Long id,
                          @org.springframework.data.repository.query.Param("at") java.time.LocalDateTime at);
}
