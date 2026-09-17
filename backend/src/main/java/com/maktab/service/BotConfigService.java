package com.maktab.service;

import com.maktab.model.BotConfig;
import com.maktab.repository.BotConfigRepository;
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

    /** Bir xil turdagi (IN/OUT) qayta o'tishni "dublikat" hisoblash oynasi (soniyada). */
    public long attendanceDedupSeconds() {
        BotConfig c = current();
        int minutes = (c != null && c.getAttendanceDedupMinutes() != null)
            ? c.getAttendanceDedupMinutes() : DEFAULT_DEDUP_MINUTES;
        return minutes * 60L;
    }
}
