package com.maktab.security;

import com.maktab.model.District;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.DistrictRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.UserRepository;
import com.maktab.service.I18nService;
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
    @Autowired private I18nService i18n;

    /**
     * V1AuthController#resolveUser bilan bir xil mantiq — token yo'q/yaroqsiz bo'lsa null.
     *
     * MUHIM (2026-09-15 audit): avval bu yerda FAQAT token imzosi tekshirilardi va
     * foydalanuvchining `isActive` holati umuman qaralmasdi. `isActive=false` tekshiruvi
     * faqat LOGIN paytida bor edi — natijada admin xodimni deaktivlashtirsa ham, uning
     * qo'lidagi mavjud JWT token muddati tugagunicha (24 soat) BUTUN tizimda ishlashda
     * davom etardi. Ya'ni "hisobni bloklash" amalda faqat yangi login'ni bloklardi, joriy
     * sessiyani emas. Endi deaktivlashtirilgan foydalanuvchi keyingi so'rovdayoq 401 oladi.
     */
    public User resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        // MUHIM (2026-09-18 audit): avval bu yerda tokenning "role" claim'i UMUMAN
        // tekshirilmasdi — faqat subject (username) bo'yicha User qidirilardi. Guardian
        // (ota-ona) tokenining subject'i ham telefon raqami (GuardianAppController#login),
        // shu sabab agar SHU TELEFON RAQAMI bilan xodim (User) qatori mavjud bo'lsa (masalan
        // superadmin raqami), haqiqiy Guardian tokeni bilan O'SHA XODIM sifatida (uning
        // haqiqiy roli bilan!) kirish mumkin edi — token o'zining "role":"GUARDIAN" claim'ini
        // aytib tursa ham. Endi token GUARDIAN uchun chiqarilgan bo'lsa, bu yerda rad etiladi —
        // Guardian oqimlari faqat GuardianAppController#resolveGuardian orqali o'tadi.
        String tokenRole = jwtUtil.getRoleFromToken(token);
        if (tokenRole == null || !isStaffRole(tokenRole)) return null;
        String username = jwtUtil.getUsernameFromToken(token);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return null;
        if (Boolean.FALSE.equals(user.getIsActive())) return null;
        // Qo'shimcha himoya: tokendagi rol qatordagi joriy rol bilan mos kelishi shart —
        // token chiqarilgandan keyin rol o'zgargan bo'lsa ham eski token ishlab qolmasin.
        if (user.getRole() == null || !user.getRole().name().equals(tokenRole)) return null;
        return user;
    }

    private static boolean isStaffRole(String role) {
        for (User.Role r : User.Role.values()) {
            if (r.name().equals(role)) return true;
        }
        return false;
    }

    /** resolveUser + majburiy autentifikatsiya: topilmasa/yaroqsiz bo'lsa 401 tashlaydi. */
    public User requireUser(String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, i18n.msg("error.auth.required"));
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
        if (user == null) return false;
        if (user.getRole() == null) return false;
        // MUHIM: avval schoolId == null bo'lsa HAMMA uchun (SUPERADMIN/ADMIN ham) false
        // qaytarilardi — natijada hali maktabga biriktirilmagan (schoolId=null) qurilmani
        // hech kim, hatto SUPERADMIN ham ko'ra/boshqara olmasdi (o'z-o'zini bloklovchi holat).
        // SUPERADMIN/ADMIN cheklovsiz bo'lgani uchun schoolId=null bo'lsa ham ruxsat berilishi
        // kerak; boshqa rollar uchun esa schoolId=null bo'lsa hech qachon mos kelmaydi (false).
        if (schoolId == null) {
            return user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN;
        }
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
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, i18n.msg("error.auth.required"));
        }
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) {
            return requestedSchoolId != null ? List.of(requestedSchoolId) : null;
        }
        if (user.getRole() == User.Role.REGION_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
                }
                return List.of(requestedSchoolId);
            }
            return schoolIdsForProvince(user.getProvinceId());
        }
        if (user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
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
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, i18n.msg("error.auth.required"));
        }
        if (user.getRole() == User.Role.SUPERADMIN || user.getRole() == User.Role.ADMIN) {
            return requestedSchoolId;
        }
        if (user.getRole() == User.Role.REGION_DIRECTOR || user.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (requestedSchoolId != null) {
                if (!canAccessSchool(user, requestedSchoolId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
                }
                return requestedSchoolId;
            }
            return null;
        }
        // DIRECTOR/MUDIR/TEACHER — client filtriga ishonilmaydi, doim o'z maktabi
        return user.getSchoolId();
    }

    // ══════════════════════════════════════════════════════════════════
    // Yozish (create/update/delete) amallari uchun umumiy tekshiruvlar.
    // Bularning barchasi ruxsat yo'q bo'lsa ResponseStatusException(403) tashlaydi —
    // controller'lar shunchaki chaqiradi, qiymat qaytarilishini kutmaydi.
    // ══════════════════════════════════════════════════════════════════

    /** canAccessSchool'ning "throw qiluvchi" varianti — controller'larda bitta qatorli tekshiruv uchun. */
    public void assertCanAccessSchool(User caller, Long schoolId) {
        if (!canAccessSchool(caller, schoolId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.access_denied"));
        }
    }

    /**
     * Foydalanuvchilarni boshqarish (yaratish/tahrirlash/faollashtirish/parol o'rnatish)
     * DIRECTOR/MUDIR/TEACHER'ga umuman TAQIQLANGAN — faqat SUPERADMIN/ADMIN/REGION_DIRECTOR/
     * DISTRICT_DIRECTOR shu amallarni bajara oladi (keyingi tekshiruvlar bilan birga).
     */
    public void assertCanManageUsers(User caller) {
        if (caller == null || caller.getRole() == null
                || !(caller.getRole() == User.Role.SUPERADMIN || caller.getRole() == User.Role.ADMIN
                     || caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.permission.denied_generic"));
        }
    }

    /**
     * Chaqiruvchi berilgan rolli foydalanuvchini (yangi yaratilayotgan yoki mavjud target'ning
     * yangi/joriy roli) boshqara oladimi:
     *  - SUPERADMIN: cheklovsiz.
     *  - ADMIN: ADMIN/SUPERADMIN'dan tashqari hammasini boshqara oladi (V1UserController'dagi
     *    guardAdminCannotTouch bilan bir xil qoida).
     *  - REGION_DIRECTOR/DISTRICT_DIRECTOR: FAQAT DIRECTOR/MUDIR/TEACHER'ni boshqara oladi —
     *    ADMIN/SUPERADMIN/REGION_DIRECTOR/DISTRICT_DIRECTOR'ga tegolmaydi (yuqori/lateral rol).
     */
    public void assertCanManageTargetRole(User caller, User.Role targetRole) {
        if (caller.getRole() == User.Role.SUPERADMIN) return;
        if (caller.getRole() == User.Role.ADMIN) {
            if (targetRole == User.Role.ADMIN || targetRole == User.Role.SUPERADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.user.admin_cannot_manage_admin"));
            }
            return;
        }
        if (caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (targetRole == User.Role.DIRECTOR || targetRole == User.Role.MUDIR || targetRole == User.Role.TEACHER) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    i18n.msg("error.user.director_scope_only"));
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.permission.denied_generic"));
    }

    /**
     * Mavjud target foydalanuvchi chaqiruvchining ko'lamiga kiradimi (REGION_DIRECTOR/
     * DISTRICT_DIRECTOR uchun) — SUPERADMIN/ADMIN uchun har doim ruxsat. assertCanManageTargetRole
     * bilan birga ishlatilganda target har doim DIRECTOR/MUDIR/TEACHER (demak schoolId'ga ega)
     * bo'ladi, shuning uchun asosan schoolId orqali tekshiriladi; ehtiyot chorasi sifatida
     * district/province maydonlari ham tekshiriladi.
     */
    public void assertTargetInCallerScope(User caller, User target) {
        if (isUnrestrictedAdmin(caller)) return;
        if (target.getSchoolId() != null && canAccessSchool(caller, target.getSchoolId())) return;
        if (target.getDistrictId() != null && canAccessDistrict(caller, target.getDistrictId())) return;
        if (target.getProvinceId() != null && canAccessProvince(caller, target.getProvinceId())) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.user.out_of_scope"));
    }

    /**
     * Yaratilayotgan (hali saqlanmagan) foydalanuvchi uchun so'ralgan schoolId/districtId/
     * provinceId chaqiruvchining ko'lamiga kirishini tekshiradi — SUPERADMIN/ADMIN uchun
     * cheklovsiz. REGION_DIRECTOR/DISTRICT_DIRECTOR eng tor berilgan maydon bo'yicha tekshiriladi
     * (schoolId > districtId > provinceId ustuvorligida), hech biri berilmagan bo'lsa ko'lamni
     * tasdiqlab bo'lmagani uchun rad etiladi.
     */
    public void assertScopeFieldsInCallerScope(User caller, Long provinceId, Long districtId, Long schoolId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (schoolId != null) {
            assertCanAccessSchool(caller, schoolId);
            return;
        }
        if (districtId != null) {
            if (!canAccessDistrict(caller, districtId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.access_denied"));
            }
            return;
        }
        if (provinceId != null) {
            if (!canAccessProvince(caller, provinceId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.province.access_denied"));
            }
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.scope.required"));
    }

    /** Viloyat yaratish/tahrirlash/o'chirish — faqat SUPERADMIN/ADMIN. */
    public void assertCanWriteProvince(User caller) {
        if (!isUnrestrictedAdmin(caller)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.permission.superadmin_admin_only"));
        }
    }

    /** Tuman yaratish/tahrirlash/o'chirish — SUPERADMIN/ADMIN yoki o'z viloyatidagi REGION_DIRECTOR. */
    public void assertCanWriteDistrict(User caller, Long provinceId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (caller.getRole() == User.Role.REGION_DIRECTOR && provinceId != null && provinceId.equals(caller.getProvinceId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.district.manage_denied"));
    }

    /**
     * Maktab PROFILI (manzil/telefon/raqam/ta'sis yili — tarkibiy tuzilma emas, faqat
     * kontakt/ma'lumot maydonlari) ni tahrirlash — {@link #assertCanWriteSchool}dan ATAYLAB
     * KENGROQ: yuqoridagi rollardan tashqari, maktabning O'Z DIRECTOR/MUDIR'i ham o'z maktabi
     * profilini tahrirlay oladi (lekin boshqa maktabnikini EMAS — schoolId aniq mos kelishi shart,
     * shu bilan "har bir maktab ma'lumoti boshqasiga aralashmasligi" talabi ta'minlanadi).
     * TEACHER bu yerga kirmaydi — faqat ko'rish huquqi bor ({@link #canAccessSchool}).
     */
    public void assertCanEditSchoolProfile(User caller, Long schoolId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (canAccessSchool(caller, schoolId)) return;
        } else if (caller.getRole() == User.Role.DIRECTOR || caller.getRole() == User.Role.MUDIR) {
            if (schoolId != null && schoolId.equals(caller.getSchoolId())) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.manage_denied"));
    }

    /** Maktab yaratish/tahrirlash/o'chirish — SUPERADMIN/ADMIN, o'z viloyatidagi REGION_DIRECTOR yoki o'z tumanidagi DISTRICT_DIRECTOR. */
    public void assertCanWriteSchool(User caller, Long districtId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (caller.getRole() == User.Role.REGION_DIRECTOR) {
            Long schoolProvinceId = resolveDistrictProvinceId(districtId);
            if (schoolProvinceId != null && schoolProvinceId.equals(caller.getProvinceId())) return;
        }
        if (caller.getRole() == User.Role.DISTRICT_DIRECTOR && districtId != null && districtId.equals(caller.getDistrictId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school.manage_denied"));
    }

    /**
     * Sinf yaratish/tahrirlash/o'chirish — SUPERADMIN/ADMIN, o'z ko'lamidagi REGION_DIRECTOR/
     * DISTRICT_DIRECTOR, yoki o'z maktabidagi DIRECTOR/MUDIR (TEACHER BUNGA KIRMAYDI).
     */
    public void assertCanWriteClass(User caller, Long schoolId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (canAccessSchool(caller, schoolId)) return;
        } else if (caller.getRole() == User.Role.DIRECTOR || caller.getRole() == User.Role.MUDIR) {
            if (schoolId != null && schoolId.equals(caller.getSchoolId())) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.class.manage_denied"));
    }

    /**
     * V1StudentController#createTeacher/updateTeacher/deleteTeacher uchun: o'qituvchi (User,
     * role=TEACHER) hisobini boshqarish — shu jumladan parolni qayta o'rnatish. canAccessSchool'dan
     * ATAYLAB farqli — u yerda DIRECTOR/MUDIR/TEACHER barchasi o'z maktabini "ko'ra oladi", lekin
     * bu yerda TEACHER hamkasbi (boshqa TEACHER) hisobini boshqarishi/parolini reset qilishi
     * MUMKIN EMAS — faqat SUPERADMIN/ADMIN/REGION_DIRECTOR/DISTRICT_DIRECTOR (o'z ko'lami) yoki
     * DIRECTOR/MUDIR (o'z maktabi) buni bajara oladi.
     */
    public void assertCanManageTeacher(User caller, Long schoolId) {
        if (isUnrestrictedAdmin(caller)) return;
        if (caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            if (canAccessSchool(caller, schoolId)) return;
        } else if (caller.getRole() == User.Role.DIRECTOR || caller.getRole() == User.Role.MUDIR) {
            if (schoolId != null && schoolId.equals(caller.getSchoolId())) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.teacher.manage_denied"));
    }

    /**
     * Maktab MA'LUMOTLARINI O'ZGARTIRISH uchun umumiy tekshiruv — o'quvchi yaratish/tahrirlash/
     * o'chirish, ota-ona biriktirish, davomat yozuvini tuzatish, qurilma/kamera/xona boshqaruvi
     * va shunga o'xshash barcha YOZUV amallari uchun.
     *
     * MUHIM (2026-09-15 auditda topilgan xato): bu amallarning aksariyati avval faqat
     * {@link #assertCanAccessSchool} bilan himoyalangan edi — u esa KO'RISH darajasidagi
     * tekshiruv bo'lib, TEACHER'ga ham "true" qaytaradi. Natijada oddiy o'qituvchi o'z
     * maktabidagi ISTALGAN o'quvchini tahrirlashi va O'CHIRISHI mumkin edi (jonli sinovda
     * tasdiqlangan: PATCH 200, DELETE 200, o'quvchi haqiqatan o'chib ketdi), shuningdek
     * davomat yozuvlarini tuzatishi (soxtalashtirishi) mumkin edi.
     *
     * Ruxsat: SUPERADMIN/ADMIN cheklovsiz; REGION_DIRECTOR/DISTRICT_DIRECTOR o'z ko'lamida;
     * DIRECTOR/MUDIR faqat o'z maktabida; TEACHER — RAD ETILADI (faqat ko'rish huquqi bor).
     * Bu {@link #assertCanWriteClass}/{@link #assertCanManageTeacher} bilan bir xil qoida.
     */
    public void assertCanWriteSchoolData(User caller, Long schoolId) {
        if (!canWriteSchoolData(caller, schoolId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, i18n.msg("error.school_data.write_denied"));
        }
    }

    /**
     * {@link #assertCanWriteSchoolData} ning boolean varianti — exception tashlash o'rniga
     * javobni o'zi shakllantiradigan controller'lar uchun (masalan StudentController'dagi
     * "if (!canAccessSchool(...)) return 403" naqshi).
     */
    public boolean canWriteSchoolData(User caller, Long schoolId) {
        if (caller == null) return false;
        if (isUnrestrictedAdmin(caller)) return true;
        if (caller.getRole() == User.Role.REGION_DIRECTOR || caller.getRole() == User.Role.DISTRICT_DIRECTOR) {
            return canAccessSchool(caller, schoolId);
        }
        if (caller.getRole() == User.Role.DIRECTOR || caller.getRole() == User.Role.MUDIR) {
            return schoolId != null && schoolId.equals(caller.getSchoolId());
        }
        return false; // TEACHER va boshqalar — faqat ko'rish
    }
}
