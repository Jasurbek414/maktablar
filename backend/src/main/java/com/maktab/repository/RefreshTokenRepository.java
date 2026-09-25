package com.maktab.repository;

import com.maktab.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    /**
     * Parol o'zgartirilganda barcha ochiq sessiyalarni bekor qiladi (2026-09-25).
     * Avval parol almashtirilsa ham o'g'irlangan refresh token 30 kun ishlayverardi.
     */
    @Modifying
    @Transactional
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.userId = :userId AND t.revoked = false")
    int revokeAllForUser(@Param("userId") Long userId);

    /** Retention: muddati o'tgan yoki ancha oldin bekor qilingan tokenlar (jadval cheksiz o'smasligi uchun). */
    @Modifying
    @Transactional
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :cutoff OR (t.revoked = true AND t.createdAt < :cutoff)")
    int deleteExpiredOrRevokedBefore(@Param("cutoff") OffsetDateTime cutoff);
}
