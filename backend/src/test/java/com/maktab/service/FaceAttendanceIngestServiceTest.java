package com.maktab.service;

import com.maktab.model.Attendance;
import com.maktab.model.FaceTerminal;
import com.maktab.model.Student;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UnmatchedFaceEventRepository;
import com.maktab.service.BotConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FaceAttendanceIngestServiceTest {

    private FaceAttendanceIngestService service;
    private AttendanceRepository attendanceRepo;
    private StudentRepository studentRepo;
    private NotificationService notificationService;
    private UnmatchedFaceEventRepository unmatchedRepo;
    private BotConfigService botConfigService;
    private PersonLocationService personLocationService;

    private FaceTerminal terminal;
    private Student student;

    @BeforeEach
    void setUp() {
        attendanceRepo = mock(AttendanceRepository.class);
        studentRepo = mock(StudentRepository.class);
        notificationService = mock(NotificationService.class);
        unmatchedRepo = mock(UnmatchedFaceEventRepository.class);
        botConfigService = mock(BotConfigService.class);
        when(botConfigService.attendanceDedupSeconds(any())).thenReturn(60L);
        service = new FaceAttendanceIngestService();
        ReflectionTestUtils.setField(service, "attendanceRepo", attendanceRepo);
        ReflectionTestUtils.setField(service, "studentRepo", studentRepo);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
        ReflectionTestUtils.setField(service, "unmatchedRepo", unmatchedRepo);
        ReflectionTestUtils.setField(service, "botConfigService", botConfigService);
        ReflectionTestUtils.setField(service, "publicUrl", "https://example.uz");
        personLocationService = mock(PersonLocationService.class);
        ReflectionTestUtils.setField(service, "personLocationService", personLocationService);

        terminal = new FaceTerminal();
        terminal.setId(3L);
        terminal.setSchoolId(1L);
        terminal.setRouterId(4L);
        terminal.setSerialNumber("SN1");
        terminal.setDirection(FaceTerminal.Direction.ENTRANCE);

        student = new Student();
        student.setId(10L);

        when(attendanceRepo.save(any(Attendance.class))).thenAnswer(inv -> {
            Attendance a = inv.getArgument(0);
            a.setId(99L);
            return a;
        });
        when(notificationService.notifyGuardians(any(), any(), anyString(), any()))
            .thenReturn(CompletableFuture.completedFuture(true));
    }

    @Test
    void recordsEntranceWithSyncKeyAndNotifiesForFreshEvent() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));

        var r = service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1374L, null);

        assertEquals(FaceAttendanceIngestService.Result.RECORDED, r);
        ArgumentCaptor<Attendance> saved = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepo, atLeastOnce()).save(saved.capture());
        Attendance a = saved.getAllValues().get(0);
        assertEquals(Attendance.AttendanceType.IN, a.getType());
        assertEquals("hik-3-1374", a.getSyncKey());
        assertEquals(4L, a.getRouterId());
        verify(notificationService).notifyGuardians(eq(student), any(), eq("IN"), isNull());
    }

    @Test
    void sightingIsRecordedEvenWhenAttendanceIsDeduplicated() {
        terminal.setRoomId(305L);
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.IN), any(), any()))
            .thenReturn(true);
        OffsetDateTime t = OffsetDateTime.now();

        assertEquals(FaceAttendanceIngestService.Result.DUPLICATE,
            service.recordFaceEvent(terminal, "ABC1D2", t, 1400L, null));

        verify(personLocationService).recordRecognitionEvent(3L, com.maktab.model.PersonRecognitionEvent.DeviceType.FACE_TERMINAL,
            1L, 305L, com.maktab.model.PersonNote.PersonType.STUDENT, 10L, null, t, "hik-3-1400");
    }

    @Test
    void eventAlreadyInLedgerIsNotRecordedAgainEvenIfAttendanceWasDeleted() {
        // Davomat qo'lda o'chirilgan, lekin voqea oldin qayta ishlangan (daftarda bor) — qayta tiklanmasligi kerak.
        when(personLocationService.isProcessed("hik-3-1526")).thenReturn(true);

        assertEquals(FaceAttendanceIngestService.Result.DUPLICATE,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1526L, null));

        verify(attendanceRepo, never()).save(any());
        verify(studentRepo, never()).findBySchoolIdAndDeviceEmployeeNo(any(), any());
    }

    @Test
    void failedAttendanceSaveIsNotMarkedProcessedSoItIsRetried() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        when(attendanceRepo.save(any(Attendance.class))).thenThrow(new RuntimeException("db down"));

        assertThrows(RuntimeException.class,
            () -> service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1530L, null));

        verify(personLocationService, never()).recordRecognitionEvent(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void unknownFaceEventIsStoredOnlyOnceAcrossPollCycles() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "GHOST")).thenReturn(List.of());
        when(unmatchedRepo.existsBySyncKey("hik-3-50")).thenReturn(false, true);

        assertEquals(FaceAttendanceIngestService.Result.UNKNOWN_STUDENT,
            service.recordFaceEvent(terminal, "GHOST", OffsetDateTime.now(), 50L, null));
        assertEquals(FaceAttendanceIngestService.Result.DUPLICATE,
            service.recordFaceEvent(terminal, "GHOST", OffsetDateTime.now(), 50L, null));

        ArgumentCaptor<com.maktab.model.UnmatchedFaceEvent> saved = ArgumentCaptor.forClass(com.maktab.model.UnmatchedFaceEvent.class);
        verify(unmatchedRepo, times(1)).save(saved.capture());
        assertEquals("hik-3-50", saved.getValue().getSyncKey());
    }

    @Test
    void pictureIsDownloadedOnlyWhenAttendanceIsActuallyRecorded() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        java.util.concurrent.atomic.AtomicInteger downloads = new java.util.concurrent.atomic.AtomicInteger();

        // Dublikat (3 soatlik oyna ichida) — rasm yuklanmasligi kerak
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.IN), any(), any()))
            .thenReturn(true);
        service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 60L, () -> { downloads.incrementAndGet(); return null; });
        assertEquals(0, downloads.get());

        // Yangi davomat — rasm bir marta yuklanadi
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.IN), any(), any()))
            .thenReturn(false);
        service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 61L, () -> { downloads.incrementAndGet(); return null; });
        assertEquals(1, downloads.get());
    }

    @Test
    void twoTerminalsSeeingSameStudentAtOnceRecordOnlyOneAttendance() throws Exception {
        FaceTerminal second = new FaceTerminal();
        second.setId(4L);
        second.setSchoolId(1L);
        second.setRouterId(4L);
        second.setSerialNumber("SN2");
        second.setDirection(FaceTerminal.Direction.ENTRANCE);
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));

        java.util.concurrent.atomic.AtomicBoolean stored = new java.util.concurrent.atomic.AtomicBoolean();
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.IN), any(), any()))
            .thenAnswer(inv -> stored.get());
        when(attendanceRepo.save(any(Attendance.class))).thenAnswer(inv -> {
            Thread.sleep(150); // "tekshir" va "yoz" orasidagi oynani kengaytiramiz — qulfsiz ikkalasi ham yozardi
            stored.set(true);
            Attendance a = inv.getArgument(0);
            a.setId(99L);
            return a;
        });

        OffsetDateTime t = OffsetDateTime.now();
        java.util.concurrent.CountDownLatch go = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var r1 = pool.submit(() -> { go.await(); return service.recordFaceEvent(terminal, "ABC1D2", t, 70L, null); });
        var r2 = pool.submit(() -> { go.await(); return service.recordFaceEvent(second, "ABC1D2", t, 71L, null); });
        go.countDown();
        List<FaceAttendanceIngestService.Result> results = List.of(r1.get(), r2.get());
        pool.shutdown();

        assertEquals(1, results.stream().filter(r -> r == FaceAttendanceIngestService.Result.RECORDED).count(), results.toString());
        assertEquals(1, results.stream().filter(r -> r == FaceAttendanceIngestService.Result.DUPLICATE).count(), results.toString());
    }

    @Test
    void locationFailureNeverBreaksAttendance() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        when(personLocationService.recordRecognitionEvent(any(), any(), any(), any(), any(), any(), any(), any(), any()))
            .thenThrow(new RuntimeException("db down"));

        assertEquals(FaceAttendanceIngestService.Result.RECORDED,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1401L, null));
        verify(attendanceRepo, atLeastOnce()).save(any());
    }

    @Test
    void exitTerminalRecordsOut() {
        terminal.setDirection(FaceTerminal.Direction.EXIT);
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 5L, null);
        ArgumentCaptor<Attendance> saved = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepo, atLeastOnce()).save(saved.capture());
        assertEquals(Attendance.AttendanceType.OUT, saved.getAllValues().get(0).getType());
    }

    @Test
    void sameDeviceEventIsNeverRecordedTwice() {
        when(attendanceRepo.existsBySyncKey("hik-3-1374")).thenReturn(true);
        assertEquals(FaceAttendanceIngestService.Result.DUPLICATE,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1374L, null));
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void studentIsLookedUpOnlyInsideTerminalSchool() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of());
        assertEquals(FaceAttendanceIngestService.Result.UNKNOWN_STUDENT,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1L, null));
        verify(studentRepo).findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2");
        verify(studentRepo, never()).findByFaceId(anyString());
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void ambiguousMatchIsNotRecorded() {
        Student other = new Student();
        other.setId(11L);
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student, other));
        assertEquals(FaceAttendanceIngestService.Result.AMBIGUOUS_STUDENT,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 1L, null));
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void repeatedPassWithinWindowIsDuplicate() {
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.IN), any(), any()))
            .thenReturn(true);
        assertEquals(FaceAttendanceIngestService.Result.DUPLICATE,
            service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 2L, null));
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void dedupWindowIsTakenForTheTerminalsOwnSchool() {
        // Oyna har maktab uchun alohida (direktor profilida) — terminal maktabi bo'yicha so'raladi.
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 9L, null);
        verify(botConfigService, atLeastOnce()).attendanceDedupSeconds(1L);
    }

    @Test
    void oppositeTypeWithinFlipWindowIsRejectedAsSuspicious() {
        // O'quvchi chiqish terminalidan chiqib, orqasiga qaragan payt kirish kamerasi ham
        // uni tutib qolgan holat: OUT'dan 10s keyin IN kelsa, ikkinchisi yozilmasligi kerak.
        terminal.setDirection(FaceTerminal.Direction.ENTRANCE);
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        when(attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(eq(10L), eq(Attendance.AttendanceType.OUT), any(), any()))
            .thenReturn(true);
        var r = service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 7L, null);
        assertEquals(FaceAttendanceIngestService.Result.SUSPICIOUS_FLIP, r);
        verify(attendanceRepo, never()).save(any());
    }

    @Test
    void oldEventIsRecordedButGuardiansAreNotNotified() {
        // Qurilma/VPN uzoq uzilib qolgandan keyin kelgan voqea — ota-onaga kechikkan xabar ketmasligi kerak
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        var r = service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now().minusHours(3), 3L, null);
        assertEquals(FaceAttendanceIngestService.Result.RECORDED, r);
        verify(attendanceRepo, atLeastOnce()).save(any());
        verify(notificationService, never()).notifyGuardians(any(), any(), anyString(), any());
    }
}
