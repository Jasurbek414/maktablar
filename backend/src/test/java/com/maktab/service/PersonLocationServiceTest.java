package com.maktab.service;

import com.maktab.model.PersonLastSeen;
import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.repository.PersonLastSeenRepository;
import com.maktab.repository.PersonRecognitionEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PersonLocationServiceTest {

    private PersonLocationService service;
    private PersonRecognitionEventRepository eventRepo;
    private PersonLastSeenRepository lastSeenRepo;

    @BeforeEach
    void setUp() {
        service = new PersonLocationService();
        eventRepo = mock(PersonRecognitionEventRepository.class);
        lastSeenRepo = mock(PersonLastSeenRepository.class);
        ReflectionTestUtils.setField(service, "eventRepo", eventRepo);
        ReflectionTestUtils.setField(service, "lastSeenRepo", lastSeenRepo);
        when(eventRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(lastSeenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void duplicateSyncKeyIsIgnored() {
        when(eventRepo.existsBySyncKey("cam-1-100")).thenReturn(true);

        PersonRecognitionEvent result = service.recordRecognitionEvent(1L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 305L, PersonNote.PersonType.STUDENT, 118L, 92, OffsetDateTime.now(), "cam-1-100");

        assertNull(result);
        verify(eventRepo, never()).save(any());
        verify(lastSeenRepo, never()).save(any());
    }

    @Test
    void firstSightingCreatesLastSeenRow() {
        when(lastSeenRepo.findByPersonTypeAndPersonId(PersonNote.PersonType.STUDENT, 118L)).thenReturn(Optional.empty());
        OffsetDateTime t = OffsetDateTime.now();

        PersonRecognitionEvent result = service.recordRecognitionEvent(42L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 305L, PersonNote.PersonType.STUDENT, 118L, 92, t, "cam-42-1");

        assertNotNull(result);
        ArgumentCaptor<PersonLastSeen> captor = ArgumentCaptor.forClass(PersonLastSeen.class);
        verify(lastSeenRepo).save(captor.capture());
        PersonLastSeen row = captor.getValue();
        assertEquals(305L, row.getRoomId());
        assertEquals(42L, row.getDeviceId());
        assertEquals(t, row.getSeenAt());
    }

    @Test
    void newerEventUpdatesLastSeen() {
        OffsetDateTime old = OffsetDateTime.now().minusMinutes(10);
        OffsetDateTime fresh = OffsetDateTime.now();
        PersonLastSeen existing = new PersonLastSeen();
        existing.setPersonType(PersonNote.PersonType.STUDENT);
        existing.setPersonId(118L);
        existing.setRoomId(101L);
        existing.setSeenAt(old);
        when(lastSeenRepo.findByPersonTypeAndPersonId(PersonNote.PersonType.STUDENT, 118L)).thenReturn(Optional.of(existing));

        service.recordRecognitionEvent(42L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 305L, PersonNote.PersonType.STUDENT, 118L, 88, fresh, "cam-42-2");

        ArgumentCaptor<PersonLastSeen> captor = ArgumentCaptor.forClass(PersonLastSeen.class);
        verify(lastSeenRepo).save(captor.capture());
        assertEquals(305L, captor.getValue().getRoomId());
        assertEquals(fresh, captor.getValue().getSeenAt());
    }

    @Test
    void outOfOrderOlderEventDoesNotRewindLastSeen() {
        OffsetDateTime latestKnown = OffsetDateTime.now();
        OffsetDateTime lateArrivingOlderEvent = latestKnown.minusMinutes(5);
        PersonLastSeen existing = new PersonLastSeen();
        existing.setPersonType(PersonNote.PersonType.STUDENT);
        existing.setPersonId(118L);
        existing.setRoomId(305L);
        existing.setSeenAt(latestKnown);
        when(lastSeenRepo.findByPersonTypeAndPersonId(PersonNote.PersonType.STUDENT, 118L)).thenReturn(Optional.of(existing));

        // Kamera tarmog'i sekinlashib, eskiroq hodisa keyinroq yetib kelishi mumkin — bu holat
        // "hozirgi joylashuv"ni orqaga surmasligi kerak (event jurnaliga baribir yoziladi).
        PersonRecognitionEvent result = service.recordRecognitionEvent(7L, PersonRecognitionEvent.DeviceType.CAMERA,
            5L, 101L, PersonNote.PersonType.STUDENT, 118L, 80, lateArrivingOlderEvent, "cam-7-3");

        assertNotNull(result);
        verify(eventRepo).save(any());
        verify(lastSeenRepo, never()).save(any());
    }
}
