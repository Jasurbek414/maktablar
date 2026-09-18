package com.maktab.service;

import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.repository.PersonLastSeenRepository;
import com.maktab.repository.PersonRecognitionEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Types;
import java.time.OffsetDateTime;

/**
 * Kamera/terminal yuz tanish qurilmasidan kelgan "odam#X ni ko'rdim" signalini qabul qiladi
 * (Kamera-Reja, 2026-09-18). Qurilma-xos parsing bu yerda YO'Q — chaqiruvchi (FaceAttendanceIngestService,
 * keyinroq kamera monitori) allaqachon aniqlangan odamni beradi. Bu servis ikkita umumiy qoidani
 * ta'minlaydi: dublikat yozilmasligi va "oxirgi ko'ringan joy" faqat YANGIROQ hodisa bilan
 * yangilanishi — ikkalasi ham parallel chaqiruvlarda to'g'ri ishlaydi.
 */
@Service
public class PersonLocationService {

    // Bitta atomar SQL: qator bo'lmasa yaratadi, bo'lsa FAQAT yangiroq hodisa bilan yangilaydi.
    // "O'qi-keyin-yoz" usuli parallel hodisalarda unique constraint xatosi berardi yoki
    // yangiroq joylashuvni eskisi bilan bosib ketardi.
    static final String UPSERT_SQL =
        "INSERT INTO person_last_seen (person_type, person_id, school_id, room_id, device_id, device_type, seen_at, confidence, updated_at) "
        + "VALUES (:personType, :personId, :schoolId, :roomId, :deviceId, :deviceType, :seenAt, :confidence, now()) "
        + "ON CONFLICT (person_type, person_id) DO UPDATE SET "
        + "school_id = EXCLUDED.school_id, room_id = EXCLUDED.room_id, device_id = EXCLUDED.device_id, "
        + "device_type = EXCLUDED.device_type, seen_at = EXCLUDED.seen_at, confidence = EXCLUDED.confidence, updated_at = now() "
        + "WHERE person_last_seen.seen_at < EXCLUDED.seen_at";

    @Autowired private PersonRecognitionEventRepository eventRepo;
    @Autowired private PersonLastSeenRepository lastSeenRepo;
    @Autowired private NamedParameterJdbcTemplate jdbc;

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
        PersonRecognitionEvent saved;
        try {
            saved = eventRepo.save(event);
        } catch (DataIntegrityViolationException e) {
            return null; // parallel chaqiruv shu syncKey'ni bir lahza oldin yozib ulgurgan
        }

        // Aniq SQL turlari: null roomId/confidence Hibernate native so'rovida bytea bo'lib bog'lanib,
        // Postgres'da "bigint but expression is of type bytea" xatosini berardi.
        MapSqlParameterSource p = new MapSqlParameterSource()
            .addValue("personType", personType.name(), Types.VARCHAR)
            .addValue("personId", personId, Types.BIGINT)
            .addValue("schoolId", schoolId, Types.BIGINT)
            .addValue("roomId", roomId, Types.BIGINT)
            .addValue("deviceId", deviceId, Types.BIGINT)
            .addValue("deviceType", deviceType.name(), Types.VARCHAR)
            .addValue("seenAt", occurredAt, Types.TIMESTAMP_WITH_TIMEZONE)
            .addValue("confidence", confidence, Types.INTEGER);
        jdbc.update(UPSERT_SQL, p);
        return saved;
    }

    /** Shu qurilma voqeasi (syncKey) allaqachon qayta ishlanganmi — FaceAttendanceIngestService daftar sifatida ishlatadi. */
    public boolean isProcessed(String syncKey) {
        return eventRepo.existsBySyncKey(syncKey);
    }

    /** O'quvchi/xodim o'chirilganda uning barcha joylashuv ma'lumotini o'chiradi (biometrik ma'lumot qolib ketmasin). */
    public void forgetPerson(PersonNote.PersonType personType, Long personId) {
        eventRepo.deleteByPerson(personType, personId);
        lastSeenRepo.deleteByPerson(personType, personId);
    }
}
