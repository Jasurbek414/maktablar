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

    private FaceTerminal terminal;
    private Student student;

    @BeforeEach
    void setUp() {
        attendanceRepo = mock(AttendanceRepository.class);
        studentRepo = mock(StudentRepository.class);
        notificationService = mock(NotificationService.class);
        unmatchedRepo = mock(UnmatchedFaceEventRepository.class);
        botConfigService = mock(BotConfigService.class);
        when(botConfigService.attendanceDedupSeconds()).thenReturn(60L);
        service = new FaceAttendanceIngestService();
        ReflectionTestUtils.setField(service, "attendanceRepo", attendanceRepo);
        ReflectionTestUtils.setField(service, "studentRepo", studentRepo);
        ReflectionTestUtils.setField(service, "notificationService", notificationService);
        ReflectionTestUtils.setField(service, "unmatchedRepo", unmatchedRepo);
        ReflectionTestUtils.setField(service, "botConfigService", botConfigService);
        ReflectionTestUtils.setField(service, "publicUrl", "https://example.uz");

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
    void dedupWindowComesFromBotConfigService() {
        // Superadmin panelidan sozlanadigan oyna (masalan 3 soat) haqiqatan ham
        // dublikat tekshiruviga ishlatilishini tasdiqlaydi.
        when(studentRepo.findBySchoolIdAndDeviceEmployeeNo(1L, "ABC1D2")).thenReturn(List.of(student));
        service.recordFaceEvent(terminal, "ABC1D2", OffsetDateTime.now(), 9L, null);
        verify(botConfigService, atLeastOnce()).attendanceDedupSeconds();
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
