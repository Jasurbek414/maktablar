package com.maktab.devices;

import com.maktab.faceterminal.HikvisionIsapiClient;
import com.maktab.faceterminal.TerminalEndpointResolver;
import com.maktab.faceterminal.TerminalException;
import com.maktab.model.Camera;
import com.maktab.repository.CameraRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Platformadan boshqariladigan kameralar holatini kuzatadi (har 60s, VPN orqali).
 *
 * Faqat brend+login kiritilgan kameralar (TerminalEndpointResolver#isManaged); MAINTENANCE
 * holatidagi kameraga tegilmaydi — uni foydalanuvchi qo'lda belgilaydi. Bir martalik uzilishda
 * darhol OFFLINE qilinmaydi, lekin xato matni darhol ko'rinadi.
 */
@Component
public class CameraMonitor {

    private static final Logger log = LoggerFactory.getLogger(CameraMonitor.class);
    static final long OFFLINE_AFTER_MINUTES = 3;

    @Autowired private CameraRepository cameraRepo;
    @Autowired private TerminalEndpointResolver resolver;

    @Scheduled(fixedDelay = 60_000, initialDelay = 25_000)
    public void refreshAll() {
        for (Camera c : cameraRepo.findAll()) {
            if (!TerminalEndpointResolver.isManaged(c) || c.getStatus() == Camera.CameraStatus.MAINTENANCE) continue;
            try {
                refresh(c);
            } catch (TerminalException ignored) {
                // refresh() xatoni DB'ga yozib bo'lgan
            } catch (Exception e) {
                log.warn("Kamera {} holatini tekshirishda kutilmagan xato: {}", c.getId(), e.toString());
            }
        }
    }

    /** Bitta kamerani hozir tekshiradi; muvaffaqiyatsiz bo'lsa xatoni yozib, TerminalException tashlaydi. */
    public HikvisionIsapiClient.DeviceInfo refresh(Camera c) {
        try {
            HikvisionIsapiClient.DeviceInfo info = resolver.hikvision(c).deviceInfo();
            cameraRepo.markOnline(c.getId(), Camera.CameraStatus.ONLINE, LocalDateTime.now(),
                info.model() != null ? info.model() : c.getModel(),
                info.serialNumber() != null ? info.serialNumber() : c.getSerialNumber(),
                info.firmwareVersion() != null ? info.firmwareVersion() : c.getFirmwareVersion());
            return info;
        } catch (TerminalException e) {
            boolean stale = c.getLastSeen() == null
                || c.getLastSeen().isBefore(LocalDateTime.now().minusMinutes(OFFLINE_AFTER_MINUTES));
            Camera.CameraStatus status = c.getStatus() == Camera.CameraStatus.MAINTENANCE
                ? Camera.CameraStatus.MAINTENANCE
                : (stale ? Camera.CameraStatus.OFFLINE : c.getStatus());
            String msg = e.getMessage();
            cameraRepo.markError(c.getId(), status, msg != null && msg.length() > 500 ? msg.substring(0, 500) : msg);
            throw e;
        }
    }
}
