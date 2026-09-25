package com.maktab.service;

import com.maktab.model.FaceTerminal;
import com.maktab.model.MikrotikRouter;
import com.maktab.model.School;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.repository.SchoolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Qurilma ogohlantirishlari: faqat mazmunli o'tishlarda, spam va takrorsiz (2026-09-19). */
class DeviceAlertServiceTest {

    private DeviceAlertService service;
    private NotificationService notifications;
    private BotConfigService botConfig;
    private MikrotikRouterRepository routerRepo;
    private MikrotikRouter router;
    private FaceTerminal terminal;

    @BeforeEach
    void setUp() {
        service = new DeviceAlertService();
        notifications = mock(NotificationService.class);
        botConfig = mock(BotConfigService.class);
        SchoolRepository schoolRepo = mock(SchoolRepository.class);
        routerRepo = mock(MikrotikRouterRepository.class);
        ReflectionTestUtils.setField(service, "notificationService", notifications);
        ReflectionTestUtils.setField(service, "botConfigService", botConfig);
        ReflectionTestUtils.setField(service, "schoolRepo", schoolRepo);
        ReflectionTestUtils.setField(service, "routerRepo", routerRepo);

        School school = new School();
        school.setId(5L);
        school.setName("1-maktab");
        when(schoolRepo.findById(5L)).thenReturn(Optional.of(school));
        when(botConfig.adminAlertChatIds()).thenReturn(List.of("123456"));

        router = new MikrotikRouter();
        router.setId(8L);
        router.setName("Router (1-maktab)");
        router.setSchool(school);
        router.setStatus(MikrotikRouter.RouterStatus.ONLINE);
        when(routerRepo.findById(8L)).thenReturn(Optional.of(router));

        terminal = new FaceTerminal();
        terminal.setId(3L);
        terminal.setName("DS-K1T673DX");
        terminal.setIpAddress("192.168.88.253");
        terminal.setSchoolId(5L);
        terminal.setRouterId(8L);
    }

    @Test
    void routerOfflineSendsPanelAndTelegram() {
        service.routerOffline(router);
        verify(notifications, timeout(2000)).createDeviceNotification(contains("Router"), eq(5L), eq(false));
        verify(notifications, timeout(2000)).sendAdminAlert(eq(List.of("123456")),
            argThat(t -> t.contains("aloqa uzildi") && t.contains("1-maktab") && t.contains("WireGuard")));
    }

    @Test
    void terminalRecoveryOnlyAfterOfflineAlert() {
        service.terminalOnline(terminal); // avval "uzildi" yuborilmagan — jim
        service.terminalOffline(terminal, "connect timed out");
        service.terminalOnline(terminal);
        service.terminalOnline(terminal); // ikkinchi marta — jim

        verify(notifications, timeout(2000).times(1)).sendAdminAlert(anyList(), contains("javob bermayapti"));
        verify(notifications, timeout(2000).times(1)).sendAdminAlert(anyList(), contains("qayta ishlayapti"));
        verify(notifications, after(300).times(2)).sendAdminAlert(anyList(), anyString());
    }

    // ─── Xabar bo'g'uvchi (2026-09-25) ──────────────────────────────────────────
    // 2026-09-22 da beqaror aloqa sabab bitta kunda ~65 ta xabar ketgan edi.

    /** Testda vaqtni oldinga surish. */
    private void advance(java.time.Duration d) {
        java.time.Instant now = service.clock.get().plus(d);
        service.clock = () -> now;
    }

    @Test
    void repeatedOfflineWithinCooldownIsSilent() {
        java.time.Instant t0 = java.time.Instant.now();
        service.clock = () -> t0;

        service.routerOffline(router);          // 1-uzilish — xabar ketadi
        service.routerOnline(router, false);    // tiklandi — xabar ketadi
        advance(java.time.Duration.ofMinutes(5));
        service.routerOffline(router);          // COOLDOWN ichida — jim
        service.routerOnline(router, false);    // uzilish e'lon qilinmagan — tiklanish ham jim

        verify(notifications, after(400).times(2)).sendAdminAlert(anyList(), anyString());
    }

    @Test
    void offlineAgainAfterCooldownIsReported() {
        java.time.Instant t0 = java.time.Instant.now();
        service.clock = () -> t0;

        service.routerOffline(router);
        service.routerOnline(router, false);
        advance(DeviceAlertService.COOLDOWN.plusMinutes(1));
        service.routerOffline(router);          // cooldown tugadi — yana xabar

        verify(notifications, after(400).times(3)).sendAdminAlert(anyList(), anyString());
    }

    @Test
    void flappingLinkGetsOneUnstableMessageThenSilence() {
        java.time.Instant t0 = java.time.Instant.now();
        service.clock = () -> t0;

        // Har 31 daqiqada uzilib-ulanish (cooldown har safar tugaydi) — 8 marta
        for (int i = 0; i < 8; i++) {
            service.routerOffline(router);
            service.routerOnline(router, false);
            advance(DeviceAlertService.COOLDOWN.plusMinutes(1));
        }
        // FLAP_LIMIT (5) ga yetgach bitta "BEQAROR" xabari, keyin butunlay jim
        verify(notifications, timeout(2000)).sendAdminAlert(anyList(), contains("BEQAROR"));
        // Cheksiz emas: 65 ta emas — 10 tadan kam
        verify(notifications, after(400).atMost(10)).sendAdminAlert(anyList(), anyString());
    }

    @Test
    void terminalAlertSuppressedWhenItsRouterIsOffline() {
        router.setStatus(MikrotikRouter.RouterStatus.OFFLINE);
        service.terminalOffline(terminal, "connect timed out");
        verify(notifications, after(300).never()).sendAdminAlert(anyList(), anyString());
        verify(notifications, never()).createDeviceNotification(anyString(), any(), anyBoolean());
    }

    @Test
    void withoutChatIdsOnlyPanelNotification() {
        when(botConfig.adminAlertChatIds()).thenReturn(List.of());
        service.routerOnline(router, true);
        verify(notifications, timeout(2000)).createDeviceNotification(anyString(), eq(5L), eq(true));
        verify(notifications, after(300).never()).sendAdminAlert(anyList(), anyString());
    }

    @Test
    void chatIdParsing() {
        assertEquals(List.of("123456", "-1001234567890"),
            BotConfigService.parseChatIds(" 123456, -1001234567890 ;abc 12 123456"));
        assertEquals(List.of(), BotConfigService.parseChatIds(null));
        assertEquals(List.of(), BotConfigService.parseChatIds("  "));
    }
}
