package com.maktab.service;

import com.maktab.model.BotConfig;
import com.maktab.model.School;
import com.maktab.repository.BotConfigRepository;
import com.maktab.repository.SchoolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BotConfigServiceTest {

    private BotConfigService service;
    private BotConfigRepository botConfigRepo;
    private SchoolRepository schoolRepo;

    @BeforeEach
    void setUp() {
        service = new BotConfigService();
        botConfigRepo = mock(BotConfigRepository.class);
        schoolRepo = mock(SchoolRepository.class);
        ReflectionTestUtils.setField(service, "botConfigRepo", botConfigRepo);
        ReflectionTestUtils.setField(service, "schoolRepo", schoolRepo);

        BotConfig global = new BotConfig();
        global.setAttendanceDedupMinutes(120);
        when(botConfigRepo.findAll()).thenReturn(List.of(global));
    }

    private static School school(Integer dedupMinutes) {
        School s = new School();
        s.setAttendanceDedupMinutes(dedupMinutes);
        return s;
    }

    @Test
    void schoolsOwnValueOverridesGlobal() {
        when(schoolRepo.findById(1L)).thenReturn(Optional.of(school(30)));
        assertEquals(30, service.effectiveDedupMinutes(1L));
        assertEquals(30 * 60L, service.attendanceDedupSeconds(1L));
    }

    @Test
    void schoolWithoutOwnValueUsesGlobal() {
        when(schoolRepo.findById(2L)).thenReturn(Optional.of(school(null)));
        assertEquals(120, service.effectiveDedupMinutes(2L));
    }

    @Test
    void otherSchoolsAreNotAffectedByOneSchoolsSetting() {
        when(schoolRepo.findById(1L)).thenReturn(Optional.of(school(30)));
        when(schoolRepo.findById(2L)).thenReturn(Optional.of(school(null)));
        assertEquals(30, service.effectiveDedupMinutes(1L));
        assertEquals(120, service.effectiveDedupMinutes(2L));
    }

    @Test
    void defaultsTo180WhenNothingConfigured() {
        when(botConfigRepo.findAll()).thenReturn(List.of());
        assertEquals(180, service.effectiveDedupMinutes(null));
    }
}
