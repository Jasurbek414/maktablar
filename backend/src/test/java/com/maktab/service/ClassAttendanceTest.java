package com.maktab.service;

import com.maktab.controller.BroadcastController;
import com.maktab.model.*;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Sinf davomati (2026-09-21): jadval, Excel va kelmaganlar ota-onasiga xabar.
 * Panelda ko'rinadigan ro'yxat bilan xabar ketadigan ro'yxat bir xil bo'lishi shart.
 */
class ClassAttendanceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 9, 21);

    private ClassAttendanceService service;
    private StudentRepository studentRepo;
    private AttendanceRepository attendanceRepo;
    private SchoolClass sc;
    private Student present, absentWithTg, absentNoTg;

    private Student student(long id, String name, Guardian... guardians) {
        Student s = new Student();
        s.setId(id);
        s.setFullName(name);
        s.setGuardians(new ArrayList<>(List.of(guardians)));
        return s;
    }

    private Guardian guardian(String telegramId, boolean enabled) {
        Guardian g = new Guardian();
        g.setName("Ota-ona");
        g.setTelegramUserId(telegramId);
        g.setNotificationsEnabled(enabled);
        return g;
    }

    private Attendance event(Student s, String time, Attendance.AttendanceType type) {
        Attendance a = new Attendance();
        a.setStudent(s);
        a.setType(type);
        a.setTimestamp(OffsetDateTime.parse(DAY + "T" + time + "+05:00"));
        return a;
    }

    @BeforeEach
    void setUp() {
        studentRepo = mock(StudentRepository.class);
        attendanceRepo = mock(AttendanceRepository.class);
        UserRepository userRepo = mock(UserRepository.class);

        service = new ClassAttendanceService();
        ReflectionTestUtils.setField(service, "studentRepo", studentRepo);
        ReflectionTestUtils.setField(service, "attendanceRepo", attendanceRepo);
        ReflectionTestUtils.setField(service, "userRepo", userRepo);

        School school = new School();
        school.setId(2L);
        school.setName("1-maktab");
        sc = new SchoolClass();
        sc.setId(5L);
        sc.setName("1-A");
        sc.setSchool(school);

        present = student(1L, "Aliyev Ali", guardian("111", true));
        absentWithTg = student(2L, "Valiyev Vali", guardian("222", true), guardian("333", false));
        absentNoTg = student(3L, "Salimov Salim", guardian(null, true));
        when(studentRepo.findByClassId(5L)).thenReturn(List.of(absentNoTg, present, absentWithTg));

        // Ali kun davomida ikki marta kirib-chiqqan: birinchi kirish va oxirgi chiqish olinishi kerak
        when(attendanceRepo.findBySchoolAndDateRange(eq(2L), any(), any())).thenReturn(List.of(
            event(present, "12:40", Attendance.AttendanceType.IN),
            event(present, "08:12", Attendance.AttendanceType.IN),
            event(present, "11:05", Attendance.AttendanceType.OUT),
            event(present, "14:05", Attendance.AttendanceType.OUT)
        ));
    }

    @Test
    void rowsUseFirstEntryAndLastExit() {
        List<Map<String, Object>> rows = service.rows(sc, DAY);

        assertEquals(List.of("Aliyev Ali", "Salimov Salim", "Valiyev Vali"),
            rows.stream().map(r -> r.get("fullName")).toList(), "ism bo'yicha tartiblangan");

        Map<String, Object> ali = rows.get(0);
        assertEquals(true, ali.get("present"));
        assertEquals("08:12", ali.get("inTime"), "birinchi kirish");
        assertEquals("14:05", ali.get("outTime"), "oxirgi chiqish");

        Map<String, Object> vali = rows.get(2);
        assertEquals(false, vali.get("present"));
        assertNull(vali.get("inTime"));
        assertEquals(2L, ((Number) vali.get("guardians")).longValue());
        assertEquals(1L, ((Number) vali.get("guardiansReachable")).longValue(),
            "bildirishnomasi o'chirilgan vasiy hisobga olinmaydi");
        assertEquals(0L, ((Number) rows.get(1).get("guardiansReachable")).longValue(),
            "Telegram'i yo'q vasiy hisobga olinmaydi");
    }

    @Test
    void absentListExcludesStudentsWithEntry() {
        assertEquals(List.of("Salimov Salim", "Valiyev Vali"),
            service.absentStudents(sc, DAY).stream().map(Student::getFullName).toList());
        assertEquals(Set.of(1L), service.presentStudentIds(sc, DAY));
    }

    @Test
    void excelContainsHeaderAndEveryStudent() throws Exception {
        byte[] bytes = service.excel(sc, DAY, service.rows(sc, DAY));
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            assertEquals("1-A", sheet.getRow(1).getCell(1).getStringCellValue());
            assertEquals(DAY.toString(), sheet.getRow(3).getCell(1).getStringCellValue());

            int headerRow = -1;
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row != null && row.getCell(0) != null
                        && "№".equals(row.getCell(0).getStringCellValue())) { headerRow = r; break; }
            }
            assertTrue(headerRow > 0, "sarlavha qatori bo'lishi kerak");
            assertEquals("F.I.Sh", sheet.getRow(headerRow).getCell(1).getStringCellValue());
            assertEquals("Kirdi", sheet.getRow(headerRow).getCell(3).getStringCellValue());

            assertEquals(3, sheet.getLastRowNum() - headerRow, "har bir o'quvchi uchun bitta qator");
            assertEquals("Keldi", sheet.getRow(headerRow + 1).getCell(2).getStringCellValue());
            assertEquals("08:12", sheet.getRow(headerRow + 1).getCell(3).getStringCellValue());
            assertEquals("Kelmadi", sheet.getRow(headerRow + 2).getCell(2).getStringCellValue());
        }
    }

    @Test
    void fileNameIsAsciiSafe() {
        assertEquals("1-A", ClassAttendanceService.asciiSafe("1-A"));
        assertEquals("1-A_", ClassAttendanceService.asciiSafe("1-A "));
        assertEquals("sinf", ClassAttendanceService.asciiSafe(null));
        assertFalse(ClassAttendanceService.asciiSafe("5-А (махсус)").matches(".*[^A-Za-z0-9._-].*"));
    }

    // ─── Kelmaganlarga xabar ────────────────────────────────────────────────────

    private BroadcastController controller;
    private NotificationService notifications;
    private BotConfigService botConfig;
    private User director;

    private void setUpController() {
        controller = new BroadcastController();
        notifications = mock(NotificationService.class);
        botConfig = mock(BotConfigService.class);
        SchoolClassRepository classRepo = mock(SchoolClassRepository.class);
        BroadcastLogRepository logRepo = mock(BroadcastLogRepository.class);
        CurrentUserService cus = mock(CurrentUserService.class);
        I18nService i18n = mock(I18nService.class);

        when(botConfig.isBroadcastEnabled()).thenReturn(true);
        when(classRepo.findById(5L)).thenReturn(Optional.of(sc));
        when(notifications.broadcastToGuardians(anyList(), anyString()))
            .thenAnswer(inv -> ((List<?>) inv.getArgument(0)).size());
        when(i18n.msg(anyString())).thenReturn("xato");

        ReflectionTestUtils.setField(controller, "classRepo", classRepo);
        ReflectionTestUtils.setField(controller, "classAttendance", service);
        ReflectionTestUtils.setField(controller, "notificationService", notifications);
        ReflectionTestUtils.setField(controller, "botConfigService", botConfig);
        ReflectionTestUtils.setField(controller, "broadcastLogRepo", logRepo);
        ReflectionTestUtils.setField(controller, "currentUserService", cus);
        ReflectionTestUtils.setField(controller, "i18n", i18n);

        director = new User();
        director.setId(9L);
        director.setFullName("Direktor");
        director.setRole(User.Role.DIRECTOR);
        when(cus.requireUser(any())).thenReturn(director);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(ResponseEntity<?> r) {
        return (Map<String, Object>) r.getBody();
    }

    @Test
    void notifiesOnlyAbsentStudentsGuardiansWithPersonalText() {
        setUpController();
        ResponseEntity<?> res = controller.notifyAbsent(null, Map.of(
            "classId", 5, "date", DAY.toString(),
            "text", "Farzandingiz {student} ({class}) {date} kuni kelmadi"));

        Map<String, Object> b = body(res);
        assertEquals(2, b.get("absent"));
        assertEquals(1, b.get("students"), "faqat Telegram'i bor vasiysi bor o'quvchi");
        assertEquals(1, b.get("guardians"), "o'chirilgan bildirishnomali vasiyga yuborilmaydi");
        assertEquals(1, b.get("skippedNoTelegram"));

        verify(notifications, times(1)).broadcastToGuardians(anyList(), anyString());
        verify(notifications).broadcastToGuardians(
            argThat(list -> list.size() == 1 && "222".equals(list.get(0).getTelegramUserId())),
            eq("Farzandingiz Valiyev Vali (1-A) 2026-09-21 kuni kelmadi"));
        // kelgan o'quvchining ota-onasiga hech narsa ketmasligi kerak
        verify(notifications, never()).broadcastToGuardians(
            argThat(list -> list.stream().anyMatch(g -> "111".equals(g.getTelegramUserId()))), anyString());
    }

    @Test
    void refusesWhenBroadcastDisabledOrTextEmpty() {
        setUpController();
        when(botConfig.isBroadcastEnabled()).thenReturn(false);
        assertEquals(403, controller.notifyAbsent(null,
            Map.of("classId", 5, "text", "salom")).getStatusCode().value());

        when(botConfig.isBroadcastEnabled()).thenReturn(true);
        assertEquals(400, controller.notifyAbsent(null,
            Map.of("classId", 5, "text", "   ")).getStatusCode().value());
        assertEquals(400, controller.notifyAbsent(null,
            Map.of("classId", 5, "text", "salom", "date", "21.09.2026")).getStatusCode().value());
        verifyNoInteractions(notifications);
    }

    @Test
    void teacherCannotSend() {
        setUpController();
        director.setRole(User.Role.TEACHER);
        assertThrows(ResponseStatusException.class, () -> controller.notifyAbsent(null,
            Map.of("classId", 5, "text", "salom")));
        verifyNoInteractions(notifications);
    }
}
