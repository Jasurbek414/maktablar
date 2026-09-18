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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Platformadan boshqariladigan kameralar holatini kuzatadi (har 60s, VPN orqali).
 *
 * Faqat brend+login kiritilgan kameralar (TerminalEndpointResolver#isManaged); MAINTENANCE
 * holatidagi kameraga tegilmaydi — uni foydalanuvchi qo'lda belgilaydi. Bir martalik uzilishda
 * darhol OFFLINE qilinmaydi, lekin xato matni darhol ko'rinadi.
 *
 * NVR orqali ulangan kameralar (nvrChannel != null): bitta NVR'ga bitta holat so'rovi yuboriladi va
 * har bir kanal ALOHIDA baholanadi — avval NVR javob bersa, undagi uzilgan kamera ham "ONLINE" ko'rinardi,
 * va har bir kameraga NVR'ning model/seriya raqami yozib qo'yilardi.
 */
@Component
public class CameraMonitor {

    private static final Logger log = LoggerFactory.getLogger(CameraMonitor.class);
    static final long OFFLINE_AFTER_MINUTES = 3;

    @Autowired private CameraRepository cameraRepo;
    @Autowired private TerminalEndpointResolver resolver;

    @Scheduled(fixedDelay = 60_000, initialDelay = 25_000)
    public void refreshAll() {
        Map<String, List<Camera>> nvrGroups = new LinkedHashMap<>();
        for (Camera c : cameraRepo.findAll()) {
            if (!TerminalEndpointResolver.isManaged(c) || c.getStatus() == Camera.CameraStatus.MAINTENANCE) continue;
            try {
                if (c.getNvrChannel() != null) {
                    nvrGroups.computeIfAbsent(resolver.baseUrl(c) + "|" + c.getDeviceUsername(), k -> new ArrayList<>()).add(c);
                } else {
                    refresh(c);
                }
            } catch (TerminalException e) {
                // mustaqil kamera: refresh() xatoni DB'ga yozib bo'lgan; NVR kanali: manzil aniqlanmadi
                if (c.getNvrChannel() != null) recordFailure(c, e.getMessage());
            } catch (Exception e) {
                log.warn("Kamera {} holatini tekshirishda kutilmagan xato: {}", c.getId(), e.toString());
            }
        }
        for (List<Camera> group : nvrGroups.values()) {
            try {
                refreshNvrGroup(group);
            } catch (Exception e) {
                log.warn("NVR kameralari holatini tekshirishda kutilmagan xato: {}", e.toString());
            }
        }
    }

    /** Bitta kamerani hozir tekshiradi; muvaffaqiyatsiz bo'lsa xatoni yozib, TerminalException tashlaydi. */
    public HikvisionIsapiClient.DeviceInfo refresh(Camera c) {
        try {
            HikvisionIsapiClient client = resolver.hikvision(c);
            HikvisionIsapiClient.DeviceInfo info = client.deviceInfo();
            if (c.getNvrChannel() != null) {
                // NVR kanali: NVR javob bergani yetarli emas — kanalning o'zi onlayn bo'lishi shart
                String problem = channelProblem(client.nvrChannelOnline().get(c.getNvrChannel()), c.getNvrChannel());
                if (problem != null) throw new TerminalException(problem);
                markChannelOnline(c);
            } else {
                cameraRepo.markOnline(c.getId(), Camera.CameraStatus.ONLINE, LocalDateTime.now(),
                    info.model() != null ? info.model() : c.getModel(),
                    info.serialNumber() != null ? info.serialNumber() : c.getSerialNumber(),
                    info.firmwareVersion() != null ? info.firmwareVersion() : c.getFirmwareVersion());
            }
            return info;
        } catch (TerminalException e) {
            recordFailure(c, e.getMessage());
            throw e;
        }
    }

    /** Bir NVR'dagi kameralar: holat bitta so'rov bilan olinadi. */
    void refreshNvrGroup(List<Camera> group) {
        Map<Integer, Boolean> online;
        try {
            online = resolver.hikvision(group.get(0)).nvrChannelOnline();
        } catch (TerminalException e) {
            for (Camera c : group) recordFailure(c, e.getMessage());
            return;
        }
        for (Camera c : group) {
            String problem = channelProblem(online.get(c.getNvrChannel()), c.getNvrChannel());
            if (problem == null) markChannelOnline(c); else recordFailure(c, problem);
        }
    }

    static String channelProblem(Boolean online, Integer channel) {
        if (online == null) return "NVR'da " + channel + "-kanal topilmadi";
        if (!online) return "Kamera NVR'ga ulanmagan (" + channel + "-kanal oflayn)";
        return null;
    }

    // Model/seriya/firmware — kameraning o'ziniki qoladi (NVR'niki yozilmaydi).
    private void markChannelOnline(Camera c) {
        cameraRepo.markOnline(c.getId(), Camera.CameraStatus.ONLINE, LocalDateTime.now(),
            c.getModel(), c.getSerialNumber(), c.getFirmwareVersion());
    }

    private void recordFailure(Camera c, String msg) {
        boolean stale = c.getLastSeen() == null
            || c.getLastSeen().isBefore(LocalDateTime.now().minusMinutes(OFFLINE_AFTER_MINUTES));
        Camera.CameraStatus status = c.getStatus() == Camera.CameraStatus.MAINTENANCE
            ? Camera.CameraStatus.MAINTENANCE
            : (stale ? Camera.CameraStatus.OFFLINE : c.getStatus());
        cameraRepo.markError(c.getId(), status, msg != null && msg.length() > 500 ? msg.substring(0, 500) : msg);
    }
}
