package com.maktab.controller;

import com.maktab.model.School;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class StudentImportTest {

    private StudentController controller;
    private StudentRepository studentRepo;
    private final List<Student> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        controller = new StudentController();
        studentRepo = mock(StudentRepository.class);
        SchoolRepository schoolRepo = mock(SchoolRepository.class);
        SchoolClassRepository classRepo = mock(SchoolClassRepository.class);
        CurrentUserService cus = mock(CurrentUserService.class);

        School school = new School();
        school.setId(1L);
        School otherSchool = new School();
        otherSchool.setId(2L);

        SchoolClass c1a = new SchoolClass();
        c1a.setId(11L); c1a.setName("1-A"); c1a.setSchool(school);
        SchoolClass c2b = new SchoolClass();
        c2b.setId(12L); c2b.setName("2-B"); c2b.setSchool(school);
        SchoolClass foreign = new SchoolClass();
        foreign.setId(99L); foreign.setName("9-Z"); foreign.setSchool(otherSchool);

        Student existing = new Student();
        existing.setFullName("Bor Oquvchi");
        existing.setBirthDate(LocalDate.of(2011, 1, 1));
        existing.setSchool(school);

        when(cus.requireUser(any())).thenReturn(new User());
        when(schoolRepo.findById(1L)).thenReturn(Optional.of(school));
        when(classRepo.findBySchoolId(1L)).thenReturn(List.of(c1a, c2b));
        when(classRepo.findById(11L)).thenReturn(Optional.of(c1a));
        when(classRepo.findById(99L)).thenReturn(Optional.of(foreign));
        when(studentRepo.findBySchoolId(1L)).thenReturn(List.of(existing));
        when(studentRepo.save(any(Student.class))).thenAnswer(inv -> { saved.add(inv.getArgument(0)); return inv.getArgument(0); });

        ResourceBundleMessageSource ms = new ResourceBundleMessageSource();
        ms.setBasenames("messages");
        ms.setDefaultEncoding("UTF-8");
        ms.setFallbackToSystemLocale(false);
        I18nService i18n = new I18nService();
        ReflectionTestUtils.setField(i18n, "messageSource", ms);
        LocaleContextHolder.setLocale(new Locale("uz"));

        ReflectionTestUtils.setField(controller, "studentRepository", studentRepo);
        ReflectionTestUtils.setField(controller, "schoolRepository", schoolRepo);
        ReflectionTestUtils.setField(controller, "schoolClassRepository", classRepo);
        ReflectionTestUtils.setField(controller, "currentUserService", cus);
        ReflectionTestUtils.setField(controller, "i18n", i18n);
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
    }

    private MockMultipartFile xlsx(Object[][] rows) throws Exception {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("O'quvchilar");
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd.mm.yyyy"));
            for (int r = 0; r < rows.length; r++) {
                Row row = sh.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    Object v = rows[r][c];
                    if (v == null) continue;
                    if (v instanceof LocalDate d) {
                        row.createCell(c).setCellValue(d);
                        row.getCell(c).setCellStyle(dateStyle);
                    } else {
                        row.createCell(c).setCellValue(v.toString());
                    }
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return new MockMultipartFile("file", "s.xlsx", "application/octet-stream", out.toByteArray());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(ResponseEntity<?> res) {
        return (Map<String, Object>) res.getBody();
    }

    private String messageForRow(List<Map<String, Object>> list, int row) {
        return list.stream().filter(m -> m.get("row").equals(row)).map(m -> (String) m.get("message")).findFirst().orElse(null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void importsValidRowsAndReportsProblemsPerRow() throws Exception {
        MockMultipartFile file = xlsx(new Object[][]{
            {"F.I.Sh", "Sana", "Sinf"},                          // 1: sarlavha
            {"Aliyev  Vali", "14.05.2012", "1-A"},               // 2: dd.MM.yyyy
            {"Karimova Madina", "2013-02-03", "1а"},             // 3: ISO + kirillcha, chiziqchasiz sinf
            {"Sanali Katak", LocalDate.of(2010, 9, 1), "2 - b"}, // 4: haqiqiy Excel sana katagi
            {"", "01.01.2012", "1-A"},                           // 5: ism yo'q
            {"Nomalum Sinf", "", "7-Q"},                         // 6: sinf topilmaydi
            {"bor oquvchi", "01.01.2011", ""},                   // 7: bazada allaqachon bor
            {"aliyev vali", "14.05.2012", "1-A"},                // 8: fayl ichidagi takror
            {"Xato Sana", "31.02.2012", ""},                     // 9: noto'g'ri sana -> ogohlantirish, sanasiz qo'shiladi
            {null, null, null},                                  // 10: bo'sh qator — hisobga olinmaydi
            {"Standart Sinf", "", ""},                           // 11: sinf bo'sh -> classId parametri
        });

        ResponseEntity<?> res = controller.importExcel("Bearer x", file, 1L, 11L);
        assertEquals(200, res.getStatusCode().value());
        Map<String, Object> b = body(res);
        List<Map<String, Object>> errors = (List<Map<String, Object>>) b.get("errors");
        List<Map<String, Object>> warnings = (List<Map<String, Object>>) b.get("warnings");

        assertEquals(9, b.get("total"));
        assertEquals(5, b.get("created"));
        assertEquals(4, b.get("failed"));

        assertEquals("Aliyev Vali", saved.get(0).getFullName());
        assertEquals(LocalDate.of(2012, 5, 14), saved.get(0).getBirthDate());
        assertEquals(11L, saved.get(0).getClassId());
        assertEquals(LocalDate.of(2013, 2, 3), saved.get(1).getBirthDate());
        assertEquals(11L, saved.get(1).getClassId());
        assertEquals(LocalDate.of(2010, 9, 1), saved.get(2).getBirthDate());
        assertEquals(12L, saved.get(2).getClassId());
        assertEquals("Xato Sana", saved.get(3).getFullName());
        assertNull(saved.get(3).getBirthDate());
        assertEquals("Standart Sinf", saved.get(4).getFullName());
        assertEquals(11L, saved.get(4).getClassId());
        assertTrue(saved.stream().allMatch(s -> s.getFaceId().startsWith("SCH1-")));

        assertNotNull(messageForRow(errors, 5));
        assertEquals("Sinf topilmadi: \"7-Q\"", messageForRow(errors, 6));
        assertTrue(messageForRow(errors, 7).startsWith("Bu o'quvchi allaqachon mavjud"), messageForRow(errors, 7));
        assertNotNull(messageForRow(errors, 8));
        String w = messageForRow(warnings, 9);
        assertTrue(w.contains("\"31.02.2012\"") && w.contains("Tug'ilgan") && !w.contains("{0}"), w);
    }

    @Test
    void rejectsDefaultClassFromAnotherSchool() throws Exception {
        MockMultipartFile file = xlsx(new Object[][]{{"F.I.Sh"}, {"Test"}});
        ResponseEntity<?> res = controller.importExcel("Bearer x", file, 1L, 99L);
        assertEquals(400, res.getStatusCode().value());
        verify(studentRepo, never()).save(any());
    }

    @Test
    void rejectsNonExcelFile() {
        MockMultipartFile file = new MockMultipartFile("file", "a.xlsx", "text/plain", "salom".getBytes());
        ResponseEntity<?> res = controller.importExcel("Bearer x", file, 1L, null);
        assertEquals(400, res.getStatusCode().value());
        verify(studentRepo, never()).save(any());
    }

    @Test
    void messageWithApostropheSubstitutesParameter() {
        I18nService i18n = (I18nService) ReflectionTestUtils.getField(controller, "i18n");
        assertEquals("Faylda juda ko'p qator bor (maksimal 2000)", i18n.msg("error.student.import.too_many_rows", "2000"));
        assertEquals("Yuz ma'lumoti 2/3 terminalga muvaffaqiyatli yuklandi", i18n.msg("success.student.face_pushed", 2, 3));
        assertEquals("Qatorni saqlab bo'lmadi", i18n.msg("error.student.import.row_failed"));
    }

    private static byte[] png(int w, int h) throws Exception {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < w; x++) for (int y = 0; y < h; y++) img.setRGB(x, y, (x * 7 + y * 13) & 0xFFFFFF);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private static void placePicture(Workbook wb, Sheet sh, byte[] data, int row, int col) {
        int idx = wb.addPicture(data, Workbook.PICTURE_TYPE_PNG);
        org.apache.poi.ss.usermodel.Drawing<?> drawing = sh.createDrawingPatriarch();
        org.apache.poi.ss.usermodel.ClientAnchor anchor = wb.getCreationHelper().createClientAnchor();
        anchor.setRow1(row); anchor.setCol1(col); anchor.setRow2(row + 1); anchor.setCol2(col + 1);
        drawing.createPicture(anchor, idx);
    }

    @Test
    @SuppressWarnings("unchecked")
    void importsPhotosPlacedOverCells(@org.junit.jupiter.api.io.TempDir java.nio.file.Path uploads) throws Exception {
        ReflectionTestUtils.setField(controller, "importUploadDir", uploads);
        byte[] bytes;
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("O'quvchilar");
            String[] names = {"F.I.Sh", "Rasmli Bola", "Kichik Rasm", "Rasmsiz Bola", null};
            for (int r = 0; r < names.length; r++) {
                Row row = sh.createRow(r);
                if (names[r] != null) row.createCell(0).setCellValue(names[r]);
            }
            placePicture(wb, sh, png(640, 800), 1, 3);   // 2-qator: yaroqli rasm
            placePicture(wb, sh, png(50, 50), 2, 3);     // 3-qator: juda kichik
            placePicture(wb, sh, png(300, 300), 4, 3);   // 5-qator: ism yo'q, faqat rasm
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            bytes = out.toByteArray();
        }
        MockMultipartFile file = new MockMultipartFile("file", "r.xlsx", "application/octet-stream", bytes);

        Map<String, Object> b = body(controller.importExcel("Bearer x", file, 1L, null));
        List<Map<String, Object>> errors = (List<Map<String, Object>>) b.get("errors");
        List<Map<String, Object>> warnings = (List<Map<String, Object>>) b.get("warnings");

        assertEquals(4, b.get("total"));
        assertEquals(3, b.get("created"));
        assertEquals(1, b.get("withPhoto"));
        assertNull(b.get("imageNotice"));
        assertNotNull(messageForRow(errors, 5));

        Student withPhoto = saved.get(0);
        assertTrue(withPhoto.getPhotoUrl().startsWith("/api/files/") && withPhoto.getPhotoUrl().endsWith(".jpg"));
        byte[] stored = java.nio.file.Files.readAllBytes(uploads.resolve(withPhoto.getPhotoUrl().substring("/api/files/".length())));
        assertEquals((byte) 0xFF, stored[0]);
        assertEquals((byte) 0xD8, stored[1]);
        assertTrue(stored.length <= 200 * 1024, "terminal chegarasi: " + stored.length);

        assertNull(saved.get(1).getPhotoUrl());
        assertEquals("Rasm juda kichik (50x50 px, kamida 120 px kerak), o'quvchi rasmsiz qo'shildi", messageForRow(warnings, 3));
        assertNull(saved.get(2).getPhotoUrl());
        try (var files = java.nio.file.Files.list(uploads)) { assertEquals(1, files.count()); }
    }

    @Test
    void warnsAboutPhotosPlacedInsideCells() throws Exception {
        byte[] bytes;
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("O'quvchilar");
            sh.createRow(0).createCell(0).setCellValue("F.I.Sh");
            sh.createRow(1).createCell(0).setCellValue("Ichki Rasm");
            wb.getPackage().createPart(
                org.apache.poi.openxml4j.opc.PackagingURIHelper.createPartName("/xl/cellimages.xml"), "application/xml");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            bytes = out.toByteArray();
        }
        Map<String, Object> b = body(controller.importExcel("Bearer x",
            new MockMultipartFile("file", "c.xlsx", "application/octet-stream", bytes), 1L, null));
        assertEquals(1, b.get("created"));
        assertTrue(((String) b.get("imageNotice")).contains("Katak ustiga joylash"));
    }

    @Test
    void templateHasOnlyHeaderInDataSheet() throws Exception {
        ResponseEntity<?> res = controller.importTemplate("Bearer x");
        assertEquals(200, res.getStatusCode().value());
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream((byte[]) res.getBody()))) {
            assertEquals(0, wb.getSheetAt(0).getLastRowNum());
            assertEquals("Namuna", wb.getSheetName(1));
        }
    }
}
