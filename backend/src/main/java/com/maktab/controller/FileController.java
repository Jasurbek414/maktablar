package com.maktab.controller;

import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    // Student/device photo yuklash uchun yetarli — StudentController/V1StudentController/
    // DeviceController'da rasm boshqa hech qanday format ishlatmaydi (serve() ham faqat
    // shu uchtasini biladi). GIF/SVG kabi formatlar qabul qilinmaydi (SVG ayniqsa XSS xavfi).
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024; // 10 MB

    @Autowired private I18nService i18n;

    public FileController() {
        try { Files.createDirectories(uploadDir); } catch (IOException e) { throw new RuntimeException(e); }
    }

    /**
     * MUHIM (2026-09-18 audit): mini-PC bridge (yuqoridagi eski izohda aytilgan oqim)
     * 2026-08-10'da butunlay o'chirilgan — endi bu endpointni faqat login qilgan xodim
     * (frontend/src/services/api.js#upload, Authorization header bilan) chaqiradi, shuning
     * uchun SecurityConfig'da endi autentifikatsiya talab qilinadi. Fayl SHAKLI (content-type
     * ro'yxati + hajm chegarasi) tekshiruvi ham qo'shimcha himoya sifatida saqlanadi.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.file.empty")));
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.file.too_large")));
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.file.invalid_type")));
        }
        try {
            String ext = "";
            String orig = file.getOriginalFilename();
            if (orig != null && orig.contains(".")) {
                ext = orig.substring(orig.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString().substring(0, 12) + ext;
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            String url = "/api/files/" + filename;
            return ResponseEntity.ok(Map.of("url", url, "filename", filename));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) {
        try {
            Path file = uploadDir.resolve(filename).normalize();
            // Path-traversal himoyasi: normalize()'dan keyin ham natija uploadDir ICHIDA
            // qolishi shart ("../../etc/passwd" kabi so'rovlarni to'xtatadi).
            if (!file.startsWith(uploadDir)) {
                return ResponseEntity.badRequest().build();
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists()) return ResponseEntity.notFound().build();
            String contentType = "image/jpeg";
            if (filename.endsWith(".png")) contentType = "image/png";
            else if (filename.endsWith(".webp")) contentType = "image/webp";
            return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
