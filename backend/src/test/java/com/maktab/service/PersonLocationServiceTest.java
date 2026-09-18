package com.maktab.service;

import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.repository.PersonLastSeenRepository;
import com.maktab.repository.PersonRecognitionEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// "Faqat yangiroq hodisa yangilaydi" qoidasi UPSERT_SQL ichida (ON CONFLICT ... WHERE seen_at <) —
// u haqiqiy Postgres'da tekshiriladi; bu yerda servisning qolgan mantiqi sinaladi.
class PersonLocationServiceTest {

    private PersonLocationService service;
    private PersonRecognitionEventRepository eventRepo;
    private PersonLastSeenRepository lastSeenRepo;
    private NamedParameterJdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        service = new PersonLocationService();
        eventRepo = mock(PersonRecognitionEventRepository.class);
        lastSeenRepo = mock(PersonLastSeenRepository.class);
        jdbc = mock(NamedParameterJdbcTemplate.class);
        ReflectionTestUtils.setField(service, "eventRepo", eventRepo);
        ReflectionTestUtils.setField(service, "lastSeenRepo", lastSeenRepo);
        ReflectionTestUtils.setField(service, "jdbc", jdbc);
        when(eventRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void duplicateSyncKeyIsIgnored() {
        when(eventRepo.existsBySyncKey("cam-1-100")).thenReturn(true);

        PersonRecognitionEvent result = service.recordRecognitionEvent(1L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 305L, PersonNote.PersonType.STUDENT, 118L, 92, OffsetDateTime.now(), "cam-1-100");

        assertNull(result);
        verify(eventRepo, never()).save(any());
        verifyNoInteractions(jdbc);
    }

    @Test
    void concurrentDuplicateInsertIsIgnored() {
        when(eventRepo.save(any())).thenThrow(new DataIntegrityViolationException("uk sync_key"));

        PersonRecognitionEvent result = service.recordRecognitionEvent(1L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 305L, PersonNote.PersonType.STUDENT, 118L, 92, OffsetDateTime.now(), "cam-1-101");

        assertNull(result);
        verifyNoInteractions(jdbc);
    }

    @Test
    void sightingIsStoredAndUpsertedWithTypedNullableParams() {
        OffsetDateTime t = OffsetDateTime.now();

        PersonRecognitionEvent result = service.recordRecognitionEvent(42L, PersonRecognitionEvent.DeviceType.FACE_TERMINAL,
            5L, null, PersonNote.PersonType.STUDENT, 118L, null, t, "hik-42-1");

        assertNotNull(result);
        assertEquals("hik-42-1", result.getSyncKey());
        ArgumentCaptor<MapSqlParameterSource> params = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).update(eq(PersonLocationService.UPSERT_SQL), params.capture());
        MapSqlParameterSource p = params.getValue();
        assertEquals("STUDENT", p.getValue("personType"));
        assertEquals("FACE_TERMINAL", p.getValue("deviceType"));
        assertEquals(t, p.getValue("seenAt"));
        assertNull(p.getValue("roomId"));
        // null bo'lsa ham aniq SQL turi berilgan bo'lishi shart (bytea xatosining oldini oladi)
        assertEquals(java.sql.Types.BIGINT, p.getSqlType("roomId"));
        assertEquals(java.sql.Types.INTEGER, p.getSqlType("confidence"));
    }

    @Test
    void forgetPersonDeletesEventsAndLastSeen() {
        service.forgetPerson(PersonNote.PersonType.TEACHER, 7L);
        verify(eventRepo).deleteByPerson(PersonNote.PersonType.TEACHER, 7L);
        verify(lastSeenRepo).deleteByPerson(PersonNote.PersonType.TEACHER, 7L);
    }
}
