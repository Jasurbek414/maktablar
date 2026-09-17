package com.maktab.faceterminal;

import com.maktab.model.FaceTerminal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Hikvision terminaliga o'quvchi yuzini yuklaydi (HikvisionIsapiClient orqali).
 *
 * Avvalgi implementatsiya jismoniy qurilmada sinalmagan va uchta sababga ko'ra ishlamasdi
 * (2026-09-15 DS-K1T673DX'da aniqlangan):
 *  1. faceId "-" bilan yuborilardi — qurilma bunday employeeNo'ni rad etadi (FaceIdMapping);
 *  2. qurilmaga LAN IP bilan to'g'ridan-to'g'ri murojaat qilinardi — VPN manzili ishlatilmasdi
 *     (TerminalEndpointResolver);
 *  3. rasm tekshirilmasdi — placeholder fayllar qurilmaga yuborilib, tushunarsiz xato qaytardi
 *     (FaceImageNormalizer).
 */
@Component
public class HikvisionFaceTerminalDriver implements FaceTerminalDriver {

    private static final Logger log = LoggerFactory.getLogger(HikvisionFaceTerminalDriver.class);

    @Autowired private TerminalEndpointResolver resolver;

    @Override
    public boolean supports(String brand) {
        return brand != null && brand.trim().equalsIgnoreCase("hikvision");
    }

    @Override
    public void pushFace(FaceTerminal terminal, String faceId, String fullName,
                          byte[] imageBytes, String imageContentType) {
        String employeeNo = FaceIdMapping.toEmployeeNo(faceId);
        if (employeeNo == null) {
            throw new TerminalException("O'quvchi Face ID'si qurilmaga mos emas: \"" + faceId + "\"");
        }
        byte[] jpeg = FaceImageNormalizer.toDeviceJpeg(imageBytes);

        HikvisionIsapiClient client = resolver.hikvision(terminal);
        client.upsertUser(employeeNo, fullName);
        client.setFace(employeeNo, jpeg);
        log.info("Hikvision: terminal {} ga yuz yuklandi (employeeNo={}, {} bayt)", terminal.getId(), employeeNo, jpeg.length);
    }

    /** O'quvchini (yuzi bilan) terminaldan o'chiradi. */
    public void removeUser(FaceTerminal terminal, String faceId) {
        String employeeNo = FaceIdMapping.toEmployeeNo(faceId);
        if (employeeNo == null) {
            throw new TerminalException("O'quvchi Face ID'si qurilmaga mos emas: \"" + faceId + "\"");
        }
        resolver.hikvision(terminal).deleteUser(employeeNo);
    }
}
