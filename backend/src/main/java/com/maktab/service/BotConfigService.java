package com.maktab.service;

import com.maktab.model.BotConfig;
import com.maktab.model.School;
import com.maktab.repository.BotConfigRepository;
import com.maktab.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * BotConfig (bitta-qatorli sozlama jadvali) feature-toggle qiymatlarini o'qish uchun
 * yagona joy — BotConfigController.currentConfig()dagi bilan bir xil naqsh, boshqa
 * controller/service'larda takrorlanmasligi uchun.
 */
@Service
public class BotConfigService {

    @Autowired private BotConfigRepository botConfigRepo;
    @Autowired private SchoolRepository schoolRepo;

    private BotConfig current() {
        return botConfigRepo.findAll().stream().findFirst().orElse(null);
    }

    /** Qator hali yaratilmagan bo'lsa — standart holat yoqilgan (true) hisoblanadi. */
    public boolean isBroadcastEnabled() {
        BotConfig c = current();
        return c == null || Boolean.TRUE.equals(c.getBroadcastEnabled());
    }

    public boolean isGuardianMessagingEnabled() {
        BotConfig c = current();
        return c == null || Boolean.TRUE.equals(c.getGuardianMessagingEnabled());
    }

    public boolean isAttendanceNotificationsEnabled() {
        BotConfig c = current();
        return c == null || Boolean.TRUE.equals(c.getAttendanceNotificationsEnabled());
    }

    private static final int DEFAULT_DEDUP_MINUTES = 180; // 3 soat

    /** Superadmin panelidagi umumiy qiymat — o'z qiymatini o'rnatmagan maktablar uchun standart (daqiqa). */
    public int globalDedupMinutes() {
        BotConfig c = current();
        return (c != null && c.getAttendanceDedupMinutes() != null) ? c.getAttendanceDedupMinutes() : DEFAULT_DEDUP_MINUTES;
    }

    /** Maktabning o'z qiymati (direktor profilida o'rnatiladi), bo'lmasa umumiy qiymat (daqiqa). */
    public int effectiveDedupMinutes(Long schoolId) {
        if (schoolId != null) {
            Integer own = schoolRepo.findById(schoolId).map(School::getAttendanceDedupMinutes).orElse(null);
            if (own != null) return own;
        }
        return globalDedupMinutes();
    }

    /** Bir xil turdagi (IN/OUT) qayta o'tishni "dublikat" hisoblash oynasi (soniyada), shu maktab uchun. */
    public long attendanceDedupSeconds(Long schoolId) {
        return effectiveDedupMinutes(schoolId) * 60L;
    }
}
