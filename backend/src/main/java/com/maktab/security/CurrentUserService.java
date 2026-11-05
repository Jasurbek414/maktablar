package com.maktab.security;

import com.maktab.model.District;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Server-side scoping uchun umumiy komponent. Controller'lar client yuborgan
 * role/provinceId/districtId/schoolId query parametrlariga ISHONMASLIGI kerak —
 * Authorization headerdagi JWT'dan aniqlangan HAQIQIY foydalanuvchi (uning
 * role/provinceId/districtId/schoolId ustunlari) asosida ko'rinadigan ma'lumotlar
 * chegarasi shu servis orqali hisoblanadi.
 *
 * Qoida (User.java'dagi izohga mos, 7 ta rol):
 *   SUPERADMIN        -> hamma narsa, cheklovsiz (o'qish HAM, yozish HAM)
 *   ADMIN             -> KO'RISH cheklovsiz — SUPERADMIN bilan bir xil (butun tizim).
 *                         YOZISH huquqi (adminLevel: FULL/VIEW_ONLY) bu servisga aloqasi yo'q —
 *                         markazlashtirilgan ravishda JwtFilter'da tekshiriladi, chunki bu servis
 *                         faqat KO'RISH ko'lami (data visibility scope) haqida, ikkala tier ham
 *                         bu yerda bir xil — cheklovsiz.
 *   REGION_DIRECTOR   -> faqat o'z provinceId'si (eski ADMIN'ning aynan o'zi, nomi almashgan)
 *   DISTRICT_DIRECTOR -> faqat o'z districtId'si
 *   DIRECTOR/MUDIR/TEACHER -> faqat o'z schoolId'si
 */
@Component
public class CurrentUserService {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private DistrictRepository districtRepository;

    /** V1AuthController#resolveUser bilan bir xil mantiq — token yo'q/yaroqsiz bo'lsa null. */
    public User resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        String username = jwtUtil.getUsernameFromToken(token);
        return userRepository.findByUsername(username).orElse(null);
    }

    /** resolveUser + majburiy autentifikatsiya: topilmasa/yaroqsiz bo'lsa 401 tashlaydi. */
    public User requireUser(String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentifikatsiya talab qilinadi");
        }
        return user;
    }

    public boolean isSuperAdmin(User user) {
        return user != null && user.getRole() == User.Role.SUPERADMIN;
    }

    /** ADMIN (istalgan adminLevel) — SUPERADMIN'dan farqli, lekin ko'rish uchun xuddi shunday cheklovsiz. */
    public boolean isUnrestrictedAdmin(User user) {
        return user != null && (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN);
    }

    /**
     * Foydalanuvchining "o'z viloyati":
     *  - REGION_DIRECTOR uchun to'g'ridan-to'g'ri user.provinceId,
     *  - DISTRICT_DIRECTOR uchun district->province zanjiri orqali,
     *  - DIRECTOR/MUDIR/TEACHER uchun o'z maktabi orqali aniqlangan viloyat.
     *  - SUPERADMIN/ADMIN uchun ma'nosiz (null) — chaqiruvchi ularni alohida (cheklovsiz) ishlatishi kerak.
     */
    public Long resolveUserProvinceId(User user) {
        if (user == null) return null;
        if (user.getRole() == User.Role.REGION_DIRECTOR) return user.getProvinceId();
        if (user.getRole() == User.Role.DISTRICT_DIRECTOR) return resolveDistrictProvinceId(user.getDistrictId());
        if (user.getRole() == User.Role.DIRECTOR || user.getRole() == User.Role.MUDIR
                || user.getRole() == User.Role.TEACHER) {
            return resolveSchoolProvinceId(user.getSchoolId());
        }
        return null;
    }

    /** Maktabning viloyatini School->District->Province zanjiri orqali aniqlaydi. */
    public Long resolveSchoolProvinceId(Long schoolId) {
        if (schoolId == null) return null;
        return schoolRepository.findById(schoolId)
                .map(School::getDistrict)
                .map(d -> d != null ? d.getProvince() : null)
                .map(p -> p != null ? p.getId() : null)
                .orElse(null);
    }

    /** Maktabning tumanini School->District zanjiri orqali aniqlaydi. */
    public Long resolveSchoolDistrictId(Long schoolId) {
        if (schoolId == null) return null;
        return schoolRepository.findById(schoolId)
                .map(School::getDistrict)
                .map(d -> d != null ? d.getId() : null)
                .orElse(null);
    }

    /** Tumanning viloyatini District->Province zanjiri orqali aniqlaydi. */
    public Long resolveDistrictProvinceId(Long districtId) {
        if (districtId == null) return null;
        return districtRepository.findById(districtId)
                .map(District::getProvince)
                .map(p -> p != null ? p.getId() : null)
                .orElse(null);
    }

    public boolean canAccessSchool(User user, Long schoolId) {
        if (user == null || schoolId == null) return false;
        if (user.getRole() == null) return false;
        switch (user.getRole()) {
            case SUPERADMIN:
            case ADMIN:
                return true;
            case REGION_DIRECTOR:
                Long provinceId = resolveSchoolProvinceId(schoolId);
                return provinceId != null && provinceId.equals(user.getProvinceId());
            case DISTRICT_DIRECTOR:
                Long districtId = resolveSchoolDistrictId(schoolId);
                return districtId != null && districtId.equals(user.getDistrictId());
            case DIRECTOR:
            case MUDIR:
            case TEACHER:
            default:
                return schoolId.equals(user.getSchoolId());
        }
    }

    public boolean canAccessProvince(User user, Long provinceId) {
        if (user == null || provinceId == null) return false;
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) return true;
        if (user.getRole() == User.Role.REGION_DIRECTOR) return provinceId.equals(user.getProvinceId());
        if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            Long ownProvinceId = resolveDistrictProvinceId(user.getDistrictId());
            return ownProvinceId != null && ownProvinceId.equals(provinceId);
        }
        return false; // DIRECTOR/MUDIR/TEACHER'da viloyat darajasidagi ko'rish yo'q
    }

    public boolean canAccessDistrict(User user, Long districtId) {
        if (user == null || districtId == null) return false;
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) return true;
        if (user.getRole() == User.Role.REGION_DIRECTOR) {
            District d = districtRepository.findById(districtId).orElse(null);
            return d != null && d.getProvince() != null
                    && d.getProvince().getId().equals(user.getProvinceId());
        }
        if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            return districtId.equals(user.getDistrictId());
        }
        return false;
    }

    /** Bitta viloyatdagi barcha maktablarning id ro'yxati (REGION_DIRECTOR ko'lami uchun). */
    public List<Long> schoolIdsForProvince(Long provinceId) {
        if (provinceId == null) return Collections.emptyList();
        List<Long> districtIds = districtRepository.findByProvinceId(provinceId)
                .stream().map(District::getId).collect(Collectors.toList());
        if (districtIds.isEmpty()) return Collections.emptyList();
        return schoolRepository.findByDistrictIdIn(districtIds)
                .stream().map(School::getId).collect(Collectors.toList());
    }

    /** Bitta tumandagi barcha maktablarning id ro'yxati (DISTRICT_DIRECTOR ko'lami uchun). */
    public List<Long> schoolIdsForDistrict(Long districtId) {
        if (districtId == null) return Collections.emptyList();
        return schoolRepository.findByDistrictId(districtId)
                .stream().map(School::getId).collect(Collectors.toList());
    }

    /**
     * Foydalanuvchining ko'rish huquqi bo'lgan maktablar ro'yxati.
     * SUPERADMIN/ADMIN uchun {@code null} qaytaradi — bu "cheklov yo'q, hammasi ko'rinadi" degani
     * (chaqiruvchi buni maxsus tekshirishi kerak, chunki bo'sh ro'yxat bilan farqlanadi).
     */
    public List<Long> allowedSchoolIds(User user) {
        if (user == null) return Collections.emptyList();
        switch (user.getRole()) {
            case SUPERADMIN:
            case ADMIN:
                return null;
            case REGION_DIRECTOR:
                return schoolIdsForProvince(user.getProvinceId());
            case DISTRICT_DIRECTOR:
                return schoolIdsForDistrict(user.getDistrictId());
            case DIRECTOR:
            case MUDIR:
            case TEACHER:
            default:
                return user.getSchoolId() != null ? List.of(user.getSchoolId()) : Collections.emptyList();
        }
    }

    /**
     * V1* controller'lar uchun umumiy holat: bitta ixtiyoriy schoolId so'ralganda (masalan
     * ?schoolId=5) foydalanuvchi ko'lamiga mos "ruxsat etilgan maktablar" ro'yxatini qaytaradi —
     * chaqiruvchi shu ro'yxat bilan studentRepo.findBySchoolIdIn(...) kabi so'rov qiladi.
     *  - SUPERADMIN/ADMIN: requestedSchoolId berilgan bo'lsa shu bitta maktab bilan cheklaydi
     *    (ixtiyoriy tor filtr), aks holda {@code null} (cheklovsiz — chaqiruvchi butun tizim
     *    bo'yicha so'rov qiladi).
     *  - REGION_DIRECTOR: requestedSchoolId berilgan va o'ziniki bo'lsa shu bitta maktab (aks
     *    holda 403); berilmagan bo'lsa — o'z provinceId'sidagi BARCHA maktablar.
     *  - DISTRICT_DIRECTOR: requestedSchoolId berilgan va o'ziniki bo'lsa shu bitta maktab (aks
     *    holda 403); berilmagan bo'lsa — o'z districtId'sidagi BARCHA maktablar.
     *  - DIRECTOR/MUDIR/TEACHER: client nima yuborishidan qat'i nazar har doim faqat o'z maktabi.
     */
    public List<Long> resolveSchoolScope(User user, Long requestedSchoolId) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentifikatsiya talab qilinadi");
        }
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) {
            return requestedSchoolId != null ? List.of(requestedSchoolId) : null;
        }
        if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu maktabga ruxsat yo'q");
                }
                return List.of(requestedSchoolId);
            }
            return schoolIdsForProvince(user.getProvinceId());
        }
        if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu maktabga ruxsat yo'q");
                }
                return List.of(requestedSchoolId);
            }
            return schoolIdsForDistrict(user.getDistrictId());
        }
        // DIRECTOR/MUDIR/TEACHER — client filtriga ishonilmaydi, doim o'z maktabi
        return user.getSchoolId() != null ? List.of(user.getSchoolId()) : Collections.emptyList();
    }

    /**
     * Client so'ragan schoolId'ni foydalanuvchi ko'lami bilan solishtirib, "amaldagi"
     * schoolId'ni qaytaradi:
     *  - SUPERADMIN/ADMIN: client so'ragani qanday bo'lsa (null ham) shundayligicha qaytadi
     *    (ixtiyoriy tor filtr).
     *  - REGION_DIRECTOR/DISTRICT_DIRECTOR: client schoolId bergan bo'lsa — o'z ko'lamiga tegishli
     *    ekanligi tekshiriladi (aks holda 403); bermagan bo'lsa — null qaytadi (chaqiruvchi
     *    allowedSchoolIds bilan butun viloyat/tuman bo'yicha jamlashi kerak).
     *  - DIRECTOR/MUDIR/TEACHER: client nima yuborishidan qat'i nazar HAR DOIM o'z schoolId'siga majburlanadi.
     */
    public Long resolveEffectiveSchoolId(User user, Long requestedSchoolId) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentifikatsiya talab qilinadi");
        }
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) {
            return requestedSchoolId;
        }
        if (user.getRole() == User.Role.REGION_DIRECTOR || user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu maktabga ruxsat yo'q");
                }
                return requestedSchoolId;
            }
            return null;
        }
        // DIRECTOR/MUDIR/TEACHER — client filtriga ishonilmaydi, doim o'z maktabi
        return user.getSchoolId();
    }
}
