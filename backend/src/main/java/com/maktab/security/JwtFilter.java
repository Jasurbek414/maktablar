package com.maktab.security;

import com.maktab.model.User;
import com.maktab.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Set;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    /**
     * Faqat o'z-o'ziga xizmat qiluvchi (self-service) auth amallari — bular ADMIN'ning
     * adminLevel'idan (FULL/VIEW_ONLY) qat'i nazar HAR DOIM ishlashi kerak. E'TIBOR: bu
     * ataylab /api/v1/auth/** ning HAMMASI emas — /api/v1/auth/users/** (V1UserController)
     * ham shu prefiks ostida, lekin ular haqiqiy "yozish" amallari (foydalanuvchi
     * yaratish/tahrirlash/rol berish) bo'lgani uchun VIEW_ONLY ADMIN uchun BLOKLANISHI kerak —
     * shuning uchun faqat quyidagi aniq self-service yo'llar istisno qilinadi.
     */
    private static final Set<String> SELF_SERVICE_AUTH_PATHS = Set.of(
            "/api/v1/auth/login/",
            "/api/v1/auth/refresh/",
            "/api/v1/auth/logout/",
            "/api/v1/auth/change-password/",
            "/api/v1/auth/me/",
            "/api/auth/login",
            "/api/auth/me"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.validateToken(token)) {
                String username = jwtUtil.getUsernameFromToken(token);
                String role = jwtUtil.getRoleFromToken(token);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                        );

                SecurityContextHolder.getContext().setAuthentication(auth);

                // ── Markazlashtirilgan VIEW_ONLY ADMIN yozish bloki ──
                // ADMIN roli (istalgan adminLevel) ko'rish uchun cheklovsiz, lekin
                // adminLevel == VIEW_ONLY bo'lgan ADMIN hech qanday mutating (POST/PUT/PATCH/DELETE)
                // so'rov yubora olmasligi kerak — self-service auth (login/refresh/logout/
                // change-password/me) bundan mustasno. DB'ga qo'shimcha lookup faqat ADMIN roli +
                // mutating metod bo'lganda ishga tushadi (kamdan-kam), boshqa har bir so'rovda emas.
                if ("ADMIN".equals(role) && isMutatingMethod(request.getMethod())
                        && !isSelfServiceAuthPath(request.getRequestURI())) {
                    User user = userRepository.findByUsername(username).orElse(null);
                    if (user != null && user.getAdminLevel() == User.AdminLevel.VIEW_ONLY) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json;charset=UTF-8");
                        response.getWriter().write("{\"error\":\"Faqat ko'rish huquqi mavjud\"}");
                        return;
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isMutatingMethod(String method) {
        return "POST".equals(method) || "PUT".equals(method)
                || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private boolean isSelfServiceAuthPath(String requestUri) {
        return requestUri != null && SELF_SERVICE_AUTH_PATHS.contains(requestUri);
    }
}
