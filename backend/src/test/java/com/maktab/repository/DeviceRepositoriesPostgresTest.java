package com.maktab.repository;

import com.maktab.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Qurilma repository'larini HAQIQIY PostgreSQL'da tekshiradi — faqat TEST_DB_URL berilganda
 * (bo'sh, tashlab yuboriladigan baza; sxema create-drop bilan yaratiladi).
 *
 * Nega kerak: 2026-09-15 da JPQL'dagi ichki enum literali kompilyatsiyadan va 19 ta unit testdan
 * o'tib, faqat production ishga tushishida Hibernate validatsiyasida yiqildi (sayt ~4 daqiqa
 * ishlamadi). Bu test repository'larni Spring Data orqali yaratadi — barcha @Query'lar deploy'dan
 * OLDIN validatsiya qilinadi, native (Postgres-ga xos) so'rovlar esa haqiqatan bajariladi.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:postgresql:.+")
class DeviceRepositoriesPostgresTest {

    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> System.getenv("TEST_DB_URL"));
        r.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_DB_USER", "postgres"));
        r.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_DB_PASSWORD", "postgres"));
        r.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired private TestEntityManager em;
    @Autowired private StudentRepository studentRepo;
    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private CameraRepository cameraRepo;

    private School school(String name) {
        Province p = new Province();
        p.setName("Viloyat " + name);
        em.persist(p);
        District d = new District();
        d.setName("Tuman " + name);
        d.setProvince(p);
        em.persist(d);
        School s = new School();
        s.setName(name);
        s.setDistrict(d);
        return em.persist(s);
    }

    private Student student(School s, String faceId) {
        Student st = new Student();
        st.setFullName("O'quvchi " + faceId);
        st.setFaceId(faceId);
        st.setSchool(s);
        return em.persist(st);
    }

    @Test
    void deviceEmployeeNoLookupIsHyphenInsensitiveAndSchoolScoped() {
        School a = school("A");
        School b = school("B");
        Student inA = student(a, "ABC1-D2E3F456");
        student(b, "XYZ9-D2E3F456");
        em.flush();

        List<Student> found = studentRepo.findBySchoolIdAndDeviceEmployeeNo(a.getId(), "ABC1D2E3F456");
        assertEquals(1, found.size());
        assertEquals(inA.getId(), found.get(0).getId());

        assertTrue(studentRepo.findBySchoolIdAndDeviceEmployeeNo(b.getId(), "ABC1D2E3F456").isEmpty(),
            "boshqa maktab o'quvchisi topilmasligi kerak");
    }

    @Test
    void terminalTargetedUpdatesWork() {
        School s = school("T");
        FaceTerminal t = new FaceTerminal();
        t.setName("Kirish");
        t.setSchoolId(s.getId());
        t.setDirection(FaceTerminal.Direction.ENTRANCE);
        t.setStatus(FaceTerminal.TerminalStatus.OFFLINE);
        t.setBrand("Hikvision");
        em.persist(t);
        em.flush();

        LocalDateTime now = LocalDateTime.now().withNano(0);
        assertEquals(1, terminalRepo.markOnline(t.getId(), FaceTerminal.TerminalStatus.ONLINE, now, "DS-K1T673DX", "V4.41.1", 5, 3));
        assertEquals(1, terminalRepo.updateLastEventSerial(t.getId(), 1373L));
        assertEquals(1, terminalRepo.markError(t.getId(), FaceTerminal.TerminalStatus.OFFLINE, "javob bermadi"));
        assertEquals(1, terminalRepo.touchOnline(t.getId(), FaceTerminal.TerminalStatus.ONLINE, now));
        assertEquals(1, terminalRepo.updateLastEventAt(t.getId(), now));
        em.clear();

        FaceTerminal r = terminalRepo.findById(t.getId()).orElseThrow();
        assertEquals(FaceTerminal.TerminalStatus.ONLINE, r.getStatus());
        assertEquals(1373L, r.getLastEventSerial());
        assertEquals(5, r.getUserCount());
        assertEquals(3, r.getRegisteredFaces());
        assertNull(r.getLastError(), "touchOnline xatoni tozalashi kerak");

        // Admin tahriri (to'liq save) lastEventSerial'ni eski qiymat bilan qaytarib yozmasligi kerak
        r.setLastEventSerial(1L);
        r.setName("Kirish (tahrir)");
        terminalRepo.saveAndFlush(r);
        em.clear();
        assertEquals(1373L, terminalRepo.findById(t.getId()).orElseThrow().getLastEventSerial());
    }

    @Test
    void cameraTargetedUpdatesWork() {
        School s = school("C");
        Camera c = new Camera();
        c.setName("Yo'lak");
        c.setSchool(s);
        c.setStatus(Camera.CameraStatus.OFFLINE);
        em.persist(c);
        em.flush();

        assertEquals(1, cameraRepo.markOnline(c.getId(), Camera.CameraStatus.ONLINE, LocalDateTime.now(), "DS-2CD", "SN1", "V5"));
        assertEquals(1, cameraRepo.markError(c.getId(), Camera.CameraStatus.OFFLINE, "xato"));
        em.clear();
        Camera r = cameraRepo.findById(c.getId()).orElseThrow();
        assertEquals(Camera.CameraStatus.OFFLINE, r.getStatus());
        assertEquals("DS-2CD", r.getModel());
        assertEquals("xato", r.getLastError());
    }
}
