package com.maktab.controller;

import com.maktab.model.*;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PersonLocationControllerTest {

    private PersonLocationController controller;
    private PersonLastSeenRepository lastSeenRepo;
    private StudentRepository studentRepo;
    private UserRepository userRepo;
    private RoomRepository roomRepo;
    private CameraRepository cameraRepo;
    private FaceTerminalRepository terminalRepo;
    private CurrentUserService cus;

    @BeforeEach
    void setUp() {
        controller = new PersonLocationController();
        lastSeenRepo = mock(PersonLastSeenRepository.class);
        studentRepo = mock(StudentRepository.class);
        userRepo = mock(UserRepository.class);
        roomRepo = mock(RoomRepository.class);
        cameraRepo = mock(CameraRepository.class);
        terminalRepo = mock(FaceTerminalRepository.class);
        cus = mock(CurrentUserService.class);

        ResourceBundleMessageSource ms = new ResourceBundleMessageSource();
        ms.setBasenames("messages");
        ms.setDefaultEncoding("UTF-8");
        ms.setFallbackToSystemLocale(false);
        I18nService i18n = new I18nService();
        ReflectionTestUtils.setField(i18n, "messageSource", ms);
        LocaleContextHolder.setLocale(new Locale("uz"));

        ReflectionTestUtils.setField(controller, "lastSeenRepo", lastSeenRepo);
        ReflectionTestUtils.setField(controller, "studentRepo", studentRepo);
        ReflectionTestUtils.setField(controller, "userRepo", userRepo);
        ReflectionTestUtils.setField(controller, "roomRepo", roomRepo);
        ReflectionTestUtils.setField(controller, "cameraRepo", cameraRepo);
        ReflectionTestUtils.setField(controller, "terminalRepo", terminalRepo);
        ReflectionTestUtils.setField(controller, "currentUserService", cus);
        ReflectionTestUtils.setField(controller, "i18n", i18n);

        when(cus.requireUser(any())).thenReturn(new User());
    }

    @Test
    void rejectsInvalidPersonType() {
        ResponseEntity<?> res = controller.getLocation("robot", 1L, "Bearer x");
        assertEquals(400, res.getStatusCode().value());
    }

    @Test
    void returns404WhenStudentMissing() {
        when(studentRepo.findById(9L)).thenReturn(Optional.empty());
        ResponseEntity<?> res = controller.getLocation("student", 9L, "Bearer x");
        assertEquals(404, res.getStatusCode().value());
        verify(cus, never()).assertCanWriteSchoolData(any(), any());
    }

    @Test
    void deniesTeacherRoleCaller() {
        School school = new School();
        school.setId(5L);
        Student s = new Student();
        s.setSchool(school);
        when(studentRepo.findById(1L)).thenReturn(Optional.of(s));
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
            .when(cus).assertCanWriteSchoolData(any(), eq(5L));

        assertThrows(ResponseStatusException.class, () -> controller.getLocation("student", 1L, "Bearer x"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void returnsSeenFalseWhenNoLocationRecorded() {
        School school = new School();
        school.setId(5L);
        Student s = new Student();
        s.setSchool(school);
        when(studentRepo.findById(1L)).thenReturn(Optional.of(s));
        when(lastSeenRepo.findByPersonTypeAndPersonId(PersonNote.PersonType.STUDENT, 1L)).thenReturn(Optional.empty());

        ResponseEntity<?> res = controller.getLocation("student", 1L, "Bearer x");
        Map<String, Object> body = (Map<String, Object>) res.getBody();
        assertEquals(200, res.getStatusCode().value());
        assertEquals(false, body.get("seen"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void returnsFullLocationForTeacherWithCameraSighting() {
        User teacher = new User();
        teacher.setSchoolId(5L);
        when(userRepo.findById(2L)).thenReturn(Optional.of(teacher));

        PersonLastSeen row = new PersonLastSeen();
        row.setPersonType(PersonNote.PersonType.TEACHER);
        row.setPersonId(2L);
        row.setSchoolId(5L);
        row.setRoomId(305L);
        row.setDeviceId(42L);
        row.setDeviceType(PersonRecognitionEvent.DeviceType.CAMERA);
        row.setConfidence(91);
        row.setSeenAt(OffsetDateTime.now());
        when(lastSeenRepo.findByPersonTypeAndPersonId(PersonNote.PersonType.TEACHER, 2L)).thenReturn(Optional.of(row));

        Room room = new Room();
        room.setNumber("305");
        room.setName("Fizika kabinet");
        when(roomRepo.findById(305L)).thenReturn(Optional.of(room));

        Camera camera = new Camera();
        camera.setName("3-qavat koridor");
        when(cameraRepo.findById(42L)).thenReturn(Optional.of(camera));

        ResponseEntity<?> res = controller.getLocation("teacher", 2L, "Bearer x");
        Map<String, Object> body = (Map<String, Object>) res.getBody();
        assertEquals(true, body.get("seen"));
        assertEquals("305", body.get("roomNumber"));
        assertEquals("Fizika kabinet", body.get("roomName"));
        assertEquals("3-qavat koridor", body.get("deviceName"));
        assertEquals("CAMERA", body.get("deviceType"));
        assertEquals(91, body.get("confidence"));
        verify(cus).assertCanWriteSchoolData(any(), eq(5L));
    }
}
