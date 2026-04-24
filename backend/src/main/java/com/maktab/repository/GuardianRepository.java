package com.maktab.repository;

import com.maktab.model.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, Long> {
    // Find by phone or telegramUserId if needed
    Guardian findByPhone(String phone);
    Guardian findByTelegramUserId(String telegramUserId);
}
