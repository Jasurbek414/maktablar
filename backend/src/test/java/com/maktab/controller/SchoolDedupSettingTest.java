package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.BotConfigService;
import com.maktab.service.I18nService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SchoolDedupSettingTest {

    private SchoolController controller;
    private SchoolRepository schoolRepo;
    private CurrentUserService cus;
    private School school;

    @BeforeEach
    void setUp() {
        controller = new SchoolController();
        schoolRepo = mock(SchoolRepository.class);
        cus = mock(CurrentUserService.class);
        BotConfigService botConfig = mock(BotConfigService.class);
        I18nService i18n = new I18nService();
        StaticMessageSource ms = new StaticMessageSource();
        ms.setUseCodeAsDefaultMessage(true);
        ReflectionTestUtils.setField(i18n, "messageSource", ms);

        school = new School();
        school.setId(2L);
        school.setAttendanceDedupMinutes(45);
        when(schoolRepo.findById(2L)).thenReturn(Optional.of(school));
        when(cus.requireUser(any())).thenReturn(new User());

        ReflectionTestUtils.setField(controller, "schoolRepository", schoolRepo);
        ReflectionTestUtils.setField(controller, "currentUserService", cus);
        ReflectionTestUtils.setField(controller, "botConfigService", botConfig);
        ReflectionTestUtils.setField(controller, "i18n", i18n);
    }

    private ResponseEntity<?> patch(Object value) {
        Map<String, Object> body = new HashMap<>();
        body.put("attendanceDedupMinutes", value);
        return controller.updateProfile(2L, "Bearer x", body);
    }

    @Test
    void directorSetsOwnValue() {
        assertEquals(200, patch("30").getStatusCode().value());
        assertEquals(30, school.getAttendanceDedupMinutes());
        verify(schoolRepo).save(school);
    }

    @Test
    void emptyValueFallsBackToGlobal() {
        assertEquals(200, patch("").getStatusCode().value());
        assertNull(school.getAttendanceDedupMinutes());
    }

    @Test
    void outOfRangeOrGarbageIsRejectedAndNothingSaved() {
        for (Object bad : new Object[]{"0", "1441", "-5", "abc", "12.5"}) {
            assertEquals(400, patch(bad).getStatusCode().value(), "qiymat: " + bad);
        }
        assertEquals(45, school.getAttendanceDedupMinutes());
        verify(schoolRepo, never()).save(any());
    }

    @Test
    void otherFieldsUpdateDoesNotTouchDedupSetting() {
        Map<String, Object> body = new HashMap<>();
        body.put("phone", "+998901234567");
        assertEquals(200, controller.updateProfile(2L, "Bearer x", body).getStatusCode().value());
        assertEquals(45, school.getAttendanceDedupMinutes());
    }

    @Test
    void directorOfAnotherSchoolIsDenied() {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(cus).assertCanEditSchoolProfile(any(), eq(2L));
        assertThrows(ResponseStatusException.class, () -> patch("30"));
        assertEquals(45, school.getAttendanceDedupMinutes());
        verify(schoolRepo, never()).save(any());
    }
}
