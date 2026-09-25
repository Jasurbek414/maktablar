package com.maktab.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Ochiq endpointlar
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll() // /spd (frontend A) auth kontrakti
                // MUHIM (2026-09-18): mini-PC/ISUP davridan qolgan /api/attendance (POST /,
                // /sync, /students, /offline-data, /heartbeat) permitAll qoidalari olib
                // tashlandi — mos endpointlar AttendanceController'dan o'chirildi (o'quvchi/
                // maktab chegarasini tekshirmasdan hujum yuzasi bo'lib turgan edi).
                .requestMatchers("/api/students/face/**").permitAll() // terminaldan, X-Api-Key o'z ichida tekshiriladi
                // MUHIM (2026-09-18 audit): mini-PC bridge allaqachon (2026-08-10) butunlay
                // o'chirilgan — "avvalgi izoh"dagi asoslash endi ESKIRGAN. Frontend/upload allaqachon
                // Authorization header yuboradi (frontend/src/services/api.js#upload), shuning uchun
                // yuklashni endi autentifikatsiya talab qiladi (diskni to'ldirish hujumidan himoya).
                // GET /api/files/{filename} esa ATAYLAB ochiq qoladi — rasm <img src> orqali
                // ko'rsatiladi, brauzer bunga Authorization header qo'shib yubora olmaydi; fayl nomi
                // taxmin qilib bo'lmaydigan tasodifiy UUID bo'lgani uchun bu qabul qilinadigan xavf.
                .requestMatchers(HttpMethod.POST, "/api/files/upload").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                .requestMatchers("/api/guardians/**").permitAll() // Telegram bot — JWT'siz, X-Bot-Key bilan o'z ichida autentifikatsiya qiladi
                .requestMatchers("/api/guardian-app/**").permitAll() // Ota-ona mobil ilovasi — o'z GUARDIAN JWT'i bilan o'z ichida autentifikatsiya qiladi (GuardianAppController)
                // Mikrotik router (VPN tunnel ichidan) — X-Api-Key bilan o'z ichida autentifikatsiya
                // qiladi, foydalanuvchi JWT'i yo'q. Qolgan /api/routers/** (CRUD, create-key,
                // terminal boshqaruvi va h.k.) tizimga kirgan xodim uchun autentifikatsiya talab qiladi.
                .requestMatchers(HttpMethod.POST, "/api/routers/heartbeat").permitAll()
                // WireGuard server (alohida joylashtiriladi, foydalanuvchi JWT'i yo'q) —
                // X-Wg-Sync-Key bilan o'z ichida autentifikatsiya qiladi (WireguardSyncController).
                .requestMatchers(HttpMethod.GET, "/api/internal/wg-peers").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/internal/wg-handshakes").permitAll()
                // OpenVPN zaxira transporti (2026-09-19) — xuddi shu hub, xuddi shu X-Wg-Sync-Key.
                .requestMatchers(HttpMethod.GET, "/api/internal/ovpn-clients").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/internal/ovpn-status").permitAll()
                // Telegram bot (bot.py) — X-Bot-Key bilan o'z ichida autentifikatsiya qiladi
                // (BotConfigController), token'ni panel'dan olish uchun.
                .requestMatchers(HttpMethod.GET, "/api/internal/bot-config/token").permitAll()
                // SUPERADMIN – hamma narsa
                .requestMatchers("/api/admin/**").hasRole("SUPERADMIN")
                // Qolgan barcha endpointlar (shu jumladan /api/routers/**, /api/provinces/**,
                // /api/districts/**, /api/schools/**, /api/notifications/** ustidagi qolgan CRUD)
                // avval blanket permitAll() edi — endi tizimga kirgan xodim uchun autentifikatsiya talab qiladi.
                .anyRequest().authenticated()
            )
            // MUHIM (2026-09-18 audit): standart holatda Spring Security anonim so'rovni ham
            // "authenticated=true" (AnonymousAuthenticationToken) deb hisoblaydi — shuning
            // uchun token yo'q/muddati tugagan bo'lsa ham .authenticated() qoidasi "o'tib",
            // keyin ruxsat yo'qligi sabab 403 (AccessDenied) qaytardi, 401 (Unauthenticated)
            // EMAS. Frontend interceptor'lari esa faqat 401'ni "token muddati tugagan" deb
            // ushlaydi — natijada token eskirganda foydalanuvchiga tushunarsiz "ruxsat yo'q"
            // xatosi ko'rsatilardi, avtomatik logout/refresh ishlamasdi. Anonim
            // autentifikatsiya butunlay o'chirilib, token yo'q/yaroqsiz holat endi to'g'ri
            // 401 sifatida qaytadi.
            .anonymous(anon -> anon.disable())
            .exceptionHandling(handling -> handling
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "https://maktab.ecos.uz",
            "http://localhost:5173",
            "http://frontend:5173"
        ));
        // MUHIM (2026-09-16 aniqlandi): "PATCH" ro'yxatda yo'q edi — /spd panelidagi BARCHA
        // tahrirlash amallari (maktab/tuman/viloyat/sinf, kamera hodisasi va h.k.) V1OrganizationController
        // kabi joylarda @PatchMapping ishlatadi. Brauzer buni CORS darajasida "Invalid CORS request"
        // bilan rad etardi — so'rov controller'ga, permission tekshiruviga yetib ham bormasdan. curl orqali
        // sinov CORS'ni tekshirmagani uchun bu xato uzoq vaqt "backend to'g'ri ishlayapti" degan noto'g'ri
        // taassurot qoldirgan edi.
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
