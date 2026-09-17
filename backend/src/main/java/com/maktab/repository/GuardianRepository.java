package com.maktab.repository;

import com.maktab.model.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, Long> {
    // Find by phone or telegramUserId if needed
    Guardian findByPhone(String phone);
    Guardian findByTelegramUserId(String telegramUserId);

    /**
     * Telefon raqamni FORMATDAN QAT'I NAZAR topadi (oxirgi 9 raqam bo'yicha).
     *
     * MUHIM (2026-09-15 audit): avval faqat findByPhone (aniq satr tengligi) ishlatilardi.
     * Operator panelga "+998901234567" deb kiritadi, Telegram esa contact.phone_number ni
     * odatda "998901234567" (+ SIZ) qaytaradi — natijada ota-ona ro'yxatdan o'tmoqchi
     * bo'lganda 404 "Bu telefon raqam tizimda topilmadi" olardi va botga UMUMAN ulana
     * olmasdi. Bo'shliq/tire/qavs bilan kiritilgan raqamlar ham mos kelmasdi.
     * Endi ikkala tomondagi raqam faqat raqamlarga keltirilib, oxirgi 9 xonasi bo'yicha
     * solishtiriladi (O'zbekiston raqamlari uchun ishonchli: 90 123 45 67).
     */
    @Query(value = "SELECT * FROM guardians WHERE RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = :digits9 LIMIT 1",
           nativeQuery = true)
    Guardian findByPhoneLast9Digits(@Param("digits9") String digits9);

    /**
     * Broadcast uchun: berilgan maktablardagi (Student.school orqali) barcha guardian'lar,
     * faqat botga ulangan (telegramUserId bor) va bildirishnomani o'chirmagan. DISTINCT —
     * bir guardian bir nechta farzandi bo'lsa ham bitta marta xabar olishi uchun.
     */
    @Query("SELECT DISTINCT g FROM Student s JOIN s.guardians g " +
           "WHERE s.school.id IN :schoolIds AND g.telegramUserId IS NOT NULL AND g.notificationsEnabled = true")
    List<Guardian> findBroadcastRecipientsBySchoolIds(@Param("schoolIds") List<Long> schoolIds);

    /** SUPERADMIN/ADMIN cheklovsiz broadcast uchun — tizimdagi barcha botga ulangan guardian'lar. */
    @Query("SELECT DISTINCT g FROM Student s JOIN s.guardians g " +
           "WHERE g.telegramUserId IS NOT NULL AND g.notificationsEnabled = true")
    List<Guardian> findAllBroadcastRecipients();
}
