package com.maktab.config;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Ilova birinchi marta ishga tushganda SUPERADMIN foydalanuvchi yaratadi.
 *
 * MUHIM: avval standart parol "admin123" edi — bu qiymat public repo'da (kod, README,
 * commit tarixi) ochiq turgani uchun har kim bilardi. Endi har bir yangi o'rnatishda
 * tasodifiy parol generatsiya qilinadi va faqat BIR MARTA server logiga chiqariladi
 * ("docker compose logs backend" orqali olish mumkin) — kodda/repo'da hech qayerda saqlanmaydi.
 *
 * MUHIM (2026-09-16 aniqlandi): avval faqat username=="superadmin" borligi tekshirilardi —
 * agar admin shu foydalanuvchini boshqa loginga o'zgartirsa yoki o'chirsa (masalan
 * "+998970504202" ga rename qilinsa), HAR safar backend qayta ishga tushganda YANGI,
 * tasodifiy paroli bilan "superadmin" hisobi qayta yaratilardi — bu "faqat bitta
 * superadmin qolsin" niyatini buzardi va nazoratsiz superadmin hisobi paydo bo'lishiga
 * olib kelardi. Endi ANY SUPERADMIN mavjudligi tekshiriladi, faqat aniq username emas.
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Bean
    CommandLineRunner seedData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByRole(User.Role.SUPERADMIN)) {
                String generatedPassword = generatePassword();
                User admin = new User();
                admin.setUsername("superadmin");
                admin.setPassword(passwordEncoder.encode(generatedPassword));
                admin.setFullName("Super Administrator");
                admin.setRole(User.Role.SUPERADMIN);
                userRepository.save(admin);
                log.warn("======================================================================");
                log.warn("SUPERADMIN birinchi marta yaratildi.");
                log.warn("Login: superadmin");
                log.warn("Parol : {}", generatedPassword);
                log.warn("Bu parol faqat shu yerda ko'rsatiladi — darhol kirib, xavfsiz joyga yozib qo'ying.");
                log.warn("======================================================================");
            }
        };
    }

    private String generatePassword() {
        byte[] bytes = new byte[12];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
