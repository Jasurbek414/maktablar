package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminAttendanceControllerTest {

    private AdminAttendanceController controller;
    private AttendanceRepository attendanceRepo;
    private User caller;
    @TempDir Path uploads;

    @BeforeEach
    void setUp() {
        controller = new AdminAttendanceController();
        attendanceRepo = mock(AttendanceRepository.class);
        SchoolRepository schoolRepo = mock(SchoolRepository.class);
        CurrentUserService cus = mock(CurrentUserService.class);
        I18nService i18n = new I18nService();
        StaticMessageSource ms = new StaticMessageSource();
        ms.setUseCodeAsDefaultMessage(true);
        ReflectionTestUtils.setField(i18n, "messageSource", ms);

        School school = new School();
        school.setId(2L);
        school.setName("1-maktab");
        when(schoolRepo.findById(2L)).thenReturn(Optional.of(school));

        caller = new User();
        caller.setId(1L);
        caller.setUsername("admin");
        caller.setRole(User.Role.SUPERADMIN);
        when(cus.requireUser(any())).thenReturn(caller);
        when(attendanceRepo.deleteByIdIn(anyList())).thenAnswer(inv -> ((List<?>) inv.getArgument(0)).size());

        ReflectionTestUtils.setField(controller, "attendanceRepo", attendanceRepo);
        ReflectionTestUtils.setField(controller, "schoolRepo", schoolRepo);
        ReflectionTestUtils.setField(controller, "currentUserService", cus);
        ReflectionTestUtils.setField(controller, "i18n", i18n);
        ReflectionTestUtils.setField(controller, "uploadDir", uploads);
    }

    private Map<String, Object> body(Object expected, boolean all, String from, String to) {
        Map<String, Object> b = new HashMap<>();
        b.put("schoolId", 2);
        b.put("expectedCount", expected);
        b.put("all", all);
        b.put("from", from);
        b.put("to", to);
        return b;
    }

    @Test
    void rangeUsesTashkentDaysInclusive() {
        AdminAttendanceController.Range r = AdminAttendanceController.range(false, "2026-09-14", "2026-09-20");
        assertEquals(OffsetDateTime.parse("2026-09-14T00:00:00+05:00").toInstant(), r.from().toInstant());
        assertEquals(OffsetDateTime.parse("2026-09-21T00:00:00+05:00").toInstant(), r.to().toInstant());
        assertNull(AdminAttendanceController.range(false, "2026-09-20", "2026-09-14"));
        assertNull(AdminAttendanceController.range(false, "2026-13-01", "2026-13-02"));
        assertNull(AdminAttendanceController.range(false, null, "2026-09-14"));
        assertNotNull(AdminAttendanceController.range(true, null, null));
    }

    @Test
    void nonSuperadminIsRejected() {
        caller.setRole(User.Role.DIRECTOR);
        assertThrows(ResponseStatusException.class, () -> controller.purge("Bearer x", body(0, true, null, null)));
        assertThrows(ResponseStatusException.class, () -> controller.preview("Bearer x", 2L, true, null, null));
        verify(attendanceRepo, never()).deleteByIdIn(anyList());
    }

    @Test
    void countChangedSinceCountingDeletesNothing() {
        when(attendanceRepo.findIdAndPhotoBySchoolAndRange(eq(2L), any(), any()))
            .thenReturn(List.of(new Object[]{1L, null}, new Object[]{2L, null}, new Object[]{3L, null}));
        ResponseEntity<?> res = controller.purge("Bearer x", body(2, false, "2026-09-18", "2026-09-18"));
        assertEquals(409, res.getStatusCode().value());
        verify(attendanceRepo, never()).deleteByIdIn(anyList());
    }

    @Test
    void missingPreviewCountIsRejected() {
        ResponseEntity<?> res = controller.purge("Bearer x", body(null, true, null, null));
        assertEquals(400, res.getStatusCode().value());
        verify(attendanceRepo, never()).deleteByIdIn(anyList());
    }

    @Test
    @SuppressWarnings("unchecked")
    void deletesExactlyPreviewedRowsInChunksAndTheirPhotosOnly() throws Exception {
        List<Object[]> rows = new ArrayList<>();
        for (long i = 1; i <= 2500; i++) rows.add(new Object[]{i, null});
        Files.writeString(uploads.resolve("a1.jpg"), "x");
        Files.writeString(uploads.resolve("keep.jpg"), "student photo");
        Path outside = uploads.getParent().resolve("secret-" + UUID.randomUUID() + ".txt");
        Files.writeString(outside, "do not delete");
        rows.set(0, new Object[]{1L, "/api/files/a1.jpg"});
        rows.set(1, new Object[]{2L, "/api/files/../" + outside.getFileName()});
        when(attendanceRepo.findIdAndPhotoBySchoolAndRange(eq(2L), any(), any())).thenReturn(rows);

        ResponseEntity<?> res = controller.purge("Bearer x", body(2500, true, null, null));
        Map<String, Object> b = (Map<String, Object>) res.getBody();

        assertEquals(200, res.getStatusCode().value());
        assertEquals(2500, b.get("deleted"));
        assertEquals(1, b.get("photosDeleted"));
        verify(attendanceRepo, times(3)).deleteByIdIn(anyList()); // 1000 + 1000 + 500
        assertFalse(Files.exists(uploads.resolve("a1.jpg")));
        assertTrue(Files.exists(uploads.resolve("keep.jpg")));
        assertTrue(Files.exists(outside), "uploads'dan tashqaridagi fayl o'chmasligi kerak");
        Files.deleteIfExists(outside);
    }
}
