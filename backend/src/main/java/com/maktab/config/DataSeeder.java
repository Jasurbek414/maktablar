package com.maktab.config;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Ilova birinchi marta ishga tushganda SUPERADMIN foydalanuvchi yaratadi.
 * Login: superadmin / Parol: admin123
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByUsername("superadmin")) {
                User admin = new User();
                admin.setUsername("superadmin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setFullName("Super Administrator");
                admin.setRole(User.Role.SUPERADMIN);
                userRepository.save(admin);
                System.out.println("✅ SUPERADMIN yaratildi: superadmin / admin123");
            }
        };
    }
}
