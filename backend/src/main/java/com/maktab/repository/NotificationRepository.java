package com.maktab.repository;

import com.maktab.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // Foydalanuvchiga tegishli bildirishnomalar (shaxsiy + umumiy)
    @Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL) " +
           "AND (n.targetRole = :role OR n.targetRole IS NULL) " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findForUser(@Param("userId") Long userId, @Param("role") String role);

    // O'qilmagan bildirishnomalar soni
    @Query("SELECT COUNT(n) FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL) " +
           "AND (n.targetRole = :role OR n.targetRole IS NULL) AND n.isRead = false")
    long countUnreadForUser(@Param("userId") Long userId, @Param("role") String role);

    // Barcha bildirishnomalarni o'qilgan deb belgilash
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE (n.userId = :userId OR n.userId IS NULL) " +
           "AND (n.targetRole = :role OR n.targetRole IS NULL) AND n.isRead = false")
    void markAllReadForUser(@Param("userId") Long userId, @Param("role") String role);

    // Maktab bo'yicha bildirishnomalar
    List<Notification> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    // Tur bo'yicha
    List<Notification> findByTypeOrderByCreatedAtDesc(Notification.NotificationType type);
}
