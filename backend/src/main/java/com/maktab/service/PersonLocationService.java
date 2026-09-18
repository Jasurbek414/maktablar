package com.maktab.service;

import com.maktab.model.PersonLastSeen;
import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.repository.PersonLastSeenRepository;
import com.maktab.repository.PersonRecognitionEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

/**
 * Kamera/terminal yuz tanish qurilmasidan kelgan "odam#X ni ko'rdim" signalini qabul qiladi
 * (Kamera-Reja, 2026-09-18, 1-bosqich). Qurilma-xos parsing (Hikvision ISAPI va h.k.) bu yerda
 * YO'Q — u 3-bosqichdagi PersonRecognitionMonitor'da, aniq kamera modeli tanlangach yoziladi.
 * Bu servis faqat ikkita umumiy qoidani ta'minlaydi: dublikat qo'shilmasligi va "hozirgi
 * joylashuv" faqat YANGIROQ hodisa bilan yangilanishi (FaceTerminalMonitor'da 2026-09-17
 * tuzatilgan tartib-buzilish xatosining oldini olish uchun ataylab shu tarzda qurilgan).
 */
@Service
public class PersonLocationService {

    @Autowired private PersonRecognitionEventRepository eventRepo;
    @Autowired private PersonLastSeenRepository lastSeenRepo;

    /**
     * @return saqlangan hodisa, yoki syncKey allaqachon mavjud bo'lsa null (dublikat, jim o'tkazib yuboriladi).
     */
    public PersonRecognitionEvent recordRecognitionEvent(Long deviceId, PersonRecognitionEvent.DeviceType deviceType,
                                                           Long schoolId, Long roomId,
                                                           PersonNote.PersonType personType, Long personId,
                                                           Integer confidence, OffsetDateTime occurredAt,
                                                           String syncKey) {
        if (syncKey != null && eventRepo.existsBySyncKey(syncKey)) {
            return null;
        }

        PersonRecognitionEvent event = new PersonRecognitionEvent();
        event.setDeviceId(deviceId);
        event.setDeviceType(deviceType);
        event.setSchoolId(schoolId);
        event.setRoomId(roomId);
        event.setPersonType(personType);
        event.setPersonId(personId);
        event.setConfidence(confidence);
        event.setOccurredAt(occurredAt);
        event.setSyncKey(syncKey);
        PersonRecognitionEvent saved = eventRepo.save(event);

        updateLastSeenIfNewer(deviceId, deviceType, schoolId, roomId, personType, personId, confidence, occurredAt);
        return saved;
    }

    private void updateLastSeenIfNewer(Long deviceId, PersonRecognitionEvent.DeviceType deviceType,
                                        Long schoolId, Long roomId,
                                        PersonNote.PersonType personType, Long personId,
                                        Integer confidence, OffsetDateTime occurredAt) {
        PersonLastSeen row = lastSeenRepo.findByPersonTypeAndPersonId(personType, personId).orElse(null);
        if (row != null && row.getSeenAt() != null && !occurredAt.isAfter(row.getSeenAt())) {
            return; // tartibsiz/eskiroq hodisa — "hozirgi holat"ni orqaga surmaydi
        }
        if (row == null) {
            row = new PersonLastSeen();
            row.setPersonType(personType);
            row.setPersonId(personId);
        }
        row.setSchoolId(schoolId);
        row.setRoomId(roomId);
        row.setDeviceId(deviceId);
        row.setDeviceType(deviceType);
        row.setConfidence(confidence);
        row.setSeenAt(occurredAt);
        lastSeenRepo.save(row);
    }
}
