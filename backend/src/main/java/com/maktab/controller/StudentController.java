package com.maktab.controller;

import com.maktab.model.MikrotikRouter;
import com.maktab.model.Guardian;
import com.maktab.model.Message;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.School;
import com.maktab.model.User;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.MikrotikRouterRepository;
import com.maktab.repository.GuardianRepository;
import com.maktab.repository.MessageRepository;
import com.maktab.repository.PersonNoteRepository;
import com.maktab.repository.SchoolClassRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.SchoolRepository;
import com.maktab.security.CurrentUserService;
import com.maktab.service.I18nService;
import com.maktab.service.NotificationService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private MikrotikRouterRepository routerRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @Autowired
    private GuardianRepository guardianRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private PersonNoteRepository personNoteRepository;

    @Autowired
    private I18nService i18n;

    @Autowired
    private NotificationService notificationService;

    /**
     * MUHIM: schoolId/classId endi client'dan ishonch bilan qabul qilinmaydi — SUPERADMIN/
     * ADMIN'dan boshqa har bir rol uchun haqiqiy ko'lam Authorization headerdagi
     * foydalanuvchidan CurrentUserService#resolveSchoolScope orqali olinadi. classId bo'yicha
     * so'ralganda o'sha sinfning maktabi ko'lamga kirishi tekshiriladi.
     */
    @GetMapping
    public List<Map<String, Object>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                              @RequestParam(required = false) Long schoolId,
                                              @RequestParam(required = false) Long classId) {
        User user = currentUserService.requireUser(authHeader);
        List<Student> students;
        if (classId != null) {
            students = studentRepository.findByClassId(classId);
            if (!currentUserService.isUnrestrictedAdmin(user)) {
                students = students.stream()
                    .filter(s -> s.getSchool() != null && currentUserService.canAccessSchool(user, s.getSchool().getId()))
                    .collect(Collectors.toList());
            }
        } else {
            List<Long> scope = currentUserService.resolveSchoolScope(user, schoolId);
            if (scope == null) students = studentRepository.findAll();
            else if (scope.isEmpty()) students = Collections.emptyList();
            else if (scope.size() == 1) students = studentRepository.findBySchoolId(scope.get(0));
            else students = studentRepository.findBySchoolIdIn(scope);
        }
        Map<Long, String> classNames = classNamesFor(students);
        return students.stream().map(s -> toMap(s, classNames.get(s.getClassId()))).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        String className = student.getClassId() != null
                ? schoolClassRepository.findById(student.getClassId()).map(SchoolClass::getName).orElse(null)
                : null;
        return ResponseEntity.ok(toMap(student, className));
    }

    /** classId'lar bo'yicha sinf nomlarini bitta so'rovda oladi (N+1 oldini olish uchun). */
    private Map<Long, String> classNamesFor(List<Student> students) {
        List<Long> classIds = students.stream().map(Student::getClassId).filter(Objects::nonNull).distinct().collect(Collectors.toList());
        if (classIds.isEmpty()) return Collections.emptyMap();
        return schoolClassRepository.findAllById(classIds).stream()
                .collect(Collectors.toMap(SchoolClass::getId, SchoolClass::getName));
    }

    private Map<String, Object> toMap(Student s, String className) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("fullName", s.getFullName());
        m.put("faceId", s.getFaceId());
        m.put("birthDate", s.getBirthDate() != null ? s.getBirthDate().toString() : null);
        m.put("photoUrl", s.getPhotoUrl());
        m.put("schoolId", s.getSchool().getId());
        m.put("schoolName", s.getSchool().getName());
        m.put("classId", s.getClassId());
        m.put("className", className);
        return m;
    }

    // ══════════════════════════ Vasiylar (Guardian) ══════════════════════════
    // Direktor-yo'naltirilgan (frontend/) ilova uchun soddalashtirilgan, o'quvchi profilida
    // ko'rsatish uchun. V1StudentController#parent-links bilan bir xil Student<->Guardian
    // ManyToMany jadvalidan foydalanadi, lekin frontend-admin (/spd) kontraktiga bog'liq emas.

    @GetMapping("/{id}/guardians")
    public ResponseEntity<?> getGuardians(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        List<Guardian> guardians = student.getGuardians() != null ? student.getGuardians() : Collections.emptyList();
        return ResponseEntity.ok(guardians.stream().map(this::toGuardianMap).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/guardians")
    public ResponseEntity<?> addGuardian(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canWriteSchoolData(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        Object phoneVal = body.get("phone");
        if (phoneVal == null || phoneVal.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.parent_link.fields_required")));
        }
        String phone = phoneVal.toString().trim();
        String name = body.get("name") != null ? body.get("name").toString().trim() : "";

        Guardian guardian = guardianRepository.findByPhone(phone);
        if (guardian == null) {
            guardian = new Guardian();
            guardian.setPhone(phone);
            guardian.setName(name);
            guardian = guardianRepository.save(guardian);
        } else if (!name.isBlank() && (guardian.getName() == null || guardian.getName().isBlank())) {
            guardian.setName(name);
            guardianRepository.save(guardian);
        }

        List<Guardian> guardians = student.getGuardians();
        if (guardians == null) guardians = new ArrayList<>();
        final Guardian linkedGuardian = guardian;
        boolean alreadyLinked = guardians.stream().anyMatch(g -> g.getId().equals(linkedGuardian.getId()));
        if (!alreadyLinked) {
            guardians.add(linkedGuardian);
            student.setGuardians(guardians);
            studentRepository.save(student);
        }
        return ResponseEntity.ok(toGuardianMap(guardian));
    }

    @DeleteMapping("/{id}/guardians/{guardianId}")
    public ResponseEntity<?> removeGuardian(@PathVariable Long id, @PathVariable Long guardianId,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canWriteSchoolData(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        List<Guardian> guardians = student.getGuardians();
        if (guardians != null) {
            guardians.removeIf(g -> g.getId().equals(guardianId));
            student.setGuardians(guardians);
            studentRepository.save(student);
        }
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    private Map<String, Object> toGuardianMap(Guardian g) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", g.getId());
        m.put("name", g.getName());
        m.put("phone", g.getPhone());
        m.put("telegramLinked", g.getTelegramUserId() != null && !g.getTelegramUserId().isBlank());
        return m;
    }

    // ══════════════════════════ Xabarlar (ota-ona <-> xodim, o'quvchi konteksti) ══════════════════════════
    // GuardianAppController'dagi bir xil "messages" jadvalidan foydalanadi — ota-ona
    // mobil ilova orqali, xodim shu (veb) endpoint orqali bir xil suhbatni ko'radi/javob beradi.

    @GetMapping("/{id}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        List<Message> messages = messageRepository.findByStudentIdOrderByCreatedAtAsc(id);
        return ResponseEntity.ok(messages.stream().map(this::toMessageMap).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        Long schoolId = student.getSchool() != null ? student.getSchool().getId() : null;
        if (!currentUserService.canAccessSchool(user, schoolId)) {
            return ResponseEntity.status(403).body(Map.of("error", i18n.msg("error.student.access_denied")));
        }
        String text = body.get("text") != null ? body.get("text").toString().trim() : "";
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.note.text_required")));
        }
        Message m = new Message();
        m.setStudentId(id);
        m.setSenderType(Message.SenderType.STAFF);
        m.setSenderUserId(user.getId());
        m.setSenderName(user.getFullName());
        m.setText(text);
        messageRepository.save(m);
        notificationService.notifyGuardianReply(m, student);
        return ResponseEntity.ok(toMessageMap(m));
    }

    private Map<String, Object> toMessageMap(Message m) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", m.getId());
        map.put("senderType", m.getSenderType() != null ? m.getSenderType().name() : null);
        map.put("senderName", m.getSenderName());
        map.put("text", m.getText());
        map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        return map;
    }

    // MUHIM: avval bu endpoint to'liq ochiq (autentifikatsiyasiz) edi — faceId taxmin
    // qilinsa/oshkor bo'lsa istalgan kishi o'quvchi ismini olardi. Endi maktab Mikrotik
    // router'i kabi X-Api-Key majburiy (RouterController/AttendanceController bilan bir xil uslub).
    @GetMapping("/face/{faceId}")
    public ResponseEntity<?> getByFaceId(@RequestHeader(value = "X-Api-Key", required = false) String apiKey,
                                          @PathVariable String faceId) {
        MikrotikRouter callerRouter = apiKey != null ? routerRepository.findByApiKey(apiKey).orElse(null) : null;
        if (callerRouter == null) {
            return ResponseEntity.status(401).body(Map.of("error", i18n.msg("error.router.unknown_api_key")));
        }
        return studentRepository.findByFaceId(faceId)
            .map(s -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", s.getId());
                m.put("fullName", s.getFullName());
                m.put("faceId", s.getFaceId());
                return ResponseEntity.ok(m);
            }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Long schoolId = Long.valueOf(body.get("schoolId").toString());
        currentUserService.assertCanWriteSchoolData(user, schoolId);
        School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));

        Student s = new Student();
        s.setFullName((String) body.get("fullName"));
        // Auto-generate faceId: SCH{schoolId}-{UUID short}
        s.setFaceId("SCH" + schoolId + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setPhotoUrl((String) body.get("photoUrl"));
        if (body.containsKey("birthDate") && body.get("birthDate") != null) {
            s.setBirthDate(LocalDate.parse(body.get("birthDate").toString()));
        }
        s.setSchool(school);
        if (body.containsKey("classId") && body.get("classId") != null) {
            s.setClassId(Long.valueOf(body.get("classId").toString()));
        }
        Student saved = studentRepository.save(s);

        Map<String, Object> result = new HashMap<>();
        result.put("id", saved.getId());
        result.put("fullName", saved.getFullName());
        result.put("faceId", saved.getFaceId());
        return ResponseEntity.ok(result);
    }

    // ══════════════════════════ Excel orqali ko'plab o'quvchi qo'shish ══════════════════════════
    // Direktor/admin bitta faylda ko'plab o'quvchini bir yo'la kiritishi uchun. Bitta o'quvchi
    // qo'shish (yuqoridagi create()) bilan bir xil qoidalar qo'llaniladi: faceId avtomatik
    // generatsiya qilinadi, classId berilgan bo'lsa target maktabga tegishliligi tekshiriladi.

    private static final int MAX_IMPORT_ROWS = 2000;

    @GetMapping("/import-template")
    public ResponseEntity<?> importTemplate(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        currentUserService.requireUser(authHeader);
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("O'quvchilar");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("F.I.Sh (majburiy)");
            header.createCell(1).setCellValue("Tug'ilgan sana (DD.MM.YYYY, ixtiyoriy)");
            header.createCell(2).setCellValue("Sinf nomi (ixtiyoriy, masalan 1-A)");
            for (int c = 0; c < 3; c++) sheet.setColumnWidth(c, 9000);

            // Namuna ATAYLAB alohida varaqda: ma'lumot varag'ida qolsa, o'chirilmagan namuna
            // qatori haqiqiy o'quvchi sifatida import qilinib ketardi (import faqat 1-varaqni o'qiydi).
            Sheet help = wb.createSheet("Namuna");
            String[][] lines = {
                {"F.I.Sh", "Tug'ilgan sana", "Sinf nomi"},
                {"Aliyev Vali Aliyevich", "14.05.2012", "1-A"},
                {"Karimova Madina", "", "1-A"},
                {"", "", ""},
                {"Faqat birinchi varaq (O'quvchilar) import qilinadi, 1-qator sarlavha hisoblanadi.", "", ""},
                {"Sinf nomi maktabda mavjud sinf nomiga mos bo'lishi kerak; bo'sh qolsa joriy sinfga biriktiriladi.", "", ""},
                {"Ism va tug'ilgan sanasi bir xil o'quvchi qayta qo'shilmaydi.", "", ""},
            };
            for (int r = 0; r < lines.length; r++) {
                Row row = help.createRow(r);
                for (int c = 0; c < 3; c++) row.createCell(c).setCellValue(lines[r][c]);
            }
            for (int c = 0; c < 3; c++) help.setColumnWidth(c, 9000);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=oquvchilar_shablon.xlsx")
                .body(out.toByteArray());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/import")
    public ResponseEntity<?> importExcel(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestParam("file") MultipartFile file,
                                          @RequestParam Long schoolId,
                                          @RequestParam(required = false) Long classId) {
        User user = currentUserService.requireUser(authHeader);
        currentUserService.assertCanWriteSchoolData(user, schoolId);
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.student.import.empty_file")));
        }
        School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.school.not_found")));

        // Ixtiyoriy "standart sinf" — faylda Sinf ustuni bo'sh qoldirilgan qatorlar shu classId'ga
        // biriktiriladi (masalan direktor bitta sinfning ichidan import qilsa). update()dagi bilan
        // bir xil qoida: berilgan classId shu maktabga tegishli bo'lishi shart.
        if (classId != null) {
            SchoolClass sc = schoolClassRepository.findById(classId).orElse(null);
            if (sc == null || sc.getSchool() == null || !sc.getSchool().getId().equals(schoolId)) {
                return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.class.wrong_school")));
            }
        }

        Map<String, Long> classByName = new HashMap<>();
        for (SchoolClass c : schoolClassRepository.findBySchoolId(schoolId)) {
            if (c.getName() != null) classByName.putIfAbsent(normalizeClassName(c.getName()), c.getId());
        }

        // Takroriy qo'shilishdan himoya: xato chiqqach fayl qayta yuklansa, avval qo'shilganlar
        // ikkinchi marta yaratilmasin. Kalit = maktab ichida ism + tug'ilgan sana (fayl ichidagi
        // takrorlar ham shu to'plam orqali ushlanadi).
        Set<String> existingKeys = new HashSet<>();
        for (Student existing : studentRepository.findBySchoolId(schoolId)) {
            existingKeys.add(duplicateKey(existing.getFullName(), existing.getBirthDate()));
        }

        List<Map<String, Object>> errors = new ArrayList<>();
        List<Map<String, Object>> warnings = new ArrayList<>();
        int created = 0;
        int totalRows = 0;

        // Faqat faylni OCHISH xatosi "fayl buzilgan" deb qaytariladi. Qator darajasidagi xatolar
        // alohida ushlanadi — aks holda bir qismi saqlangan importga "fayl buzilgan" deyilib,
        // foydalanuvchi qayta yuklashga undalardi.
        Workbook wb;
        try {
            wb = WorkbookFactory.create(file.getInputStream());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.student.import.invalid_file")));
        }
        try (wb) {
            Sheet sheet = wb.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();
            if (lastRow > MAX_IMPORT_ROWS) {
                return ResponseEntity.badRequest().body(Map.of("error",
                    i18n.msg("error.student.import.too_many_rows", String.valueOf(MAX_IMPORT_ROWS))));
            }
            for (int r = 1; r <= lastRow; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowBlank(row)) continue;
                totalRows++;
                int excelRowNum = r + 1; // Excel'dagi qator raqami (1-indeksli, sarlavha = 1)

                try {
                    String fullName = cellToString(row.getCell(0)).trim().replaceAll("\\s+", " ");
                    if (fullName.isEmpty()) {
                        errors.add(Map.of("row", excelRowNum, "message", i18n.msg("error.student.import.name_required")));
                        continue;
                    }

                    LocalDate birthDate = null;
                    Cell birthCell = row.getCell(1);
                    if (birthCell != null && birthCell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(birthCell)) {
                        birthDate = birthCell.getLocalDateTimeCellValue().toLocalDate();
                    } else {
                        String birthDateRaw = cellToString(birthCell).trim();
                        if (!birthDateRaw.isEmpty()) {
                            birthDate = parseBirthDate(birthDateRaw);
                            if (birthDate == null) {
                                warnings.add(Map.of("row", excelRowNum, "message",
                                    i18n.msg("error.student.import.bad_birth_date", birthDateRaw)));
                            }
                        }
                    }

                    Long resolvedClassId = classId;
                    String className = cellToString(row.getCell(2)).trim();
                    if (!className.isEmpty()) {
                        Long found = classByName.get(normalizeClassName(className));
                        if (found == null) {
                            errors.add(Map.of("row", excelRowNum, "message",
                                i18n.msg("error.student.import.class_not_found", className)));
                            continue;
                        }
                        resolvedClassId = found;
                    }

                    String key = duplicateKey(fullName, birthDate);
                    if (existingKeys.contains(key)) {
                        errors.add(Map.of("row", excelRowNum, "message",
                            i18n.msg("error.student.import.duplicate", fullName)));
                        continue;
                    }

                    Student s = new Student();
                    s.setFullName(fullName);
                    s.setFaceId("SCH" + schoolId + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    s.setBirthDate(birthDate);
                    s.setSchool(school);
                    s.setClassId(resolvedClassId);
                    studentRepository.save(s);
                    existingKeys.add(key);
                    created++;
                } catch (Exception rowError) {
                    errors.add(Map.of("row", excelRowNum, "message", i18n.msg("error.student.import.row_failed")));
                }
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.student.import.invalid_file")));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", totalRows);
        result.put("created", created);
        result.put("failed", errors.size());
        result.put("errors", errors);
        result.put("warnings", warnings);
        return ResponseEntity.ok(result);
    }

    private boolean isRowBlank(Row row) {
        for (int c = 0; c < 3; c++) {
            if (!cellToString(row.getCell(c)).trim().isEmpty()) return false;
        }
        return true;
    }

    private String cellToString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        switch (type) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) return cell.getLocalDateTimeCellValue().toLocalDate().toString();
                double d = cell.getNumericCellValue();
                return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            default: return "";
        }
    }

    private static final java.time.format.DateTimeFormatter[] BIRTH_DATE_FORMATS = {
        java.time.format.DateTimeFormatter.ISO_LOCAL_DATE,             // 2012-05-14
        // STRICT: aks holda "31.02.2012" jimgina 29.02.2012 ga aylantirilardi.
        java.time.format.DateTimeFormatter.ofPattern("d.M.uuuu").withResolverStyle(java.time.format.ResolverStyle.STRICT),
        java.time.format.DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(java.time.format.ResolverStyle.STRICT),
        java.time.format.DateTimeFormatter.ofPattern("d-M-uuuu").withResolverStyle(java.time.format.ResolverStyle.STRICT),
    };

    private LocalDate parseBirthDate(String raw) {
        for (java.time.format.DateTimeFormatter f : BIRTH_DATE_FORMATS) {
            try { return LocalDate.parse(raw, f); } catch (Exception ignored) { }
        }
        return null;
    }

    // "1-A", "1A", "1 - a" va kirillcha "1-А" bir xil sinf deb topilishi uchun.
    private static String normalizeClassName(String name) {
        String s = name.replaceAll("[\\s\\-_]", "").toUpperCase();
        StringBuilder sb = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case 'А': sb.append('A'); break;
                case 'В': sb.append('B'); break;
                case 'С': sb.append('C'); break;
                case 'Е': sb.append('E'); break;
                case 'Н': sb.append('H'); break;
                case 'К': sb.append('K'); break;
                case 'М': sb.append('M'); break;
                case 'О': sb.append('O'); break;
                case 'Р': sb.append('P'); break;
                case 'Т': sb.append('T'); break;
                case 'Х': sb.append('X'); break;
                default: sb.append(ch);
            }
        }
        return sb.toString();
    }

    private static String duplicateKey(String fullName, LocalDate birthDate) {
        String name = fullName == null ? "" : fullName.trim().replaceAll("\\s+", " ").toLowerCase();
        return name + "|" + (birthDate != null ? birthDate.toString() : "");
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Student s = studentRepository.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        Long currentSchoolId = s.getSchool() != null ? s.getSchool().getId() : null;
        currentUserService.assertCanWriteSchoolData(user, currentSchoolId);

        if (body.containsKey("fullName")) s.setFullName((String) body.get("fullName"));
        if (body.containsKey("photoUrl")) s.setPhotoUrl((String) body.get("photoUrl"));
        if (body.containsKey("birthDate") && body.get("birthDate") != null) {
            s.setBirthDate(LocalDate.parse(body.get("birthDate").toString()));
        }
        boolean schoolChanged = false;
        if (body.containsKey("schoolId")) {
            Long newSchoolId = Long.valueOf(body.get("schoolId").toString());
            if (!newSchoolId.equals(currentSchoolId)) {
                currentUserService.assertCanWriteSchoolData(user, newSchoolId);
                School school = schoolRepository.findById(newSchoolId).orElse(null);
                if (school != null) {
                    s.setSchool(school);
                    schoolChanged = true;
                }
            }
        }
        if (body.containsKey("classId")) {
            Long newClassId = body.get("classId") != null ? Long.valueOf(body.get("classId").toString()) : null;
            // MUHIM (2026-09-18 audit): classId'ning s.getSchool()ga tegishliligi tekshirilmasdi —
            // boshqa maktabning sinfi kiritilsa, o'quvchi u yerda "yashirin" bo'lib qolardi
            // (2026-09-17 shu turdagi holat qo'lda tuzatilgan edi). Endi tekshiriladi.
            if (newClassId != null) {
                SchoolClass sc = schoolClassRepository.findById(newClassId).orElse(null);
                Long targetSchoolId = s.getSchool() != null ? s.getSchool().getId() : null;
                if (sc == null || sc.getSchool() == null || !sc.getSchool().getId().equals(targetSchoolId)) {
                    return ResponseEntity.badRequest().body(Map.of("error", i18n.msg("error.class.wrong_school")));
                }
            }
            s.setClassId(newClassId);
        } else if (schoolChanged) {
            // MUHIM (2026-09-18 audit, jonli tasdiqlangan 2026-09-17): maktab o'zgartirilganda
            // client alohida classId yubormasa, eski sinf (ESKI maktabga tegishli) qolib
            // ketardi — natijada o'quvchi yangi maktab ro'yxatida "sinfsiz" bo'lgani sabab
            // hech qaysi sinf ichida ko'rinmasdi. Endi maktab o'zgarganda sinf avtomatik
            // tozalanadi — admin yangi sinfni alohida belgilashi kerak.
            s.setClassId(null);
        }
        studentRepository.save(s);
        return ResponseEntity.ok(Map.of("id", s.getId(), "fullName", s.getFullName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student s = studentRepository.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        Long schoolId = s.getSchool() != null ? s.getSchool().getId() : null;
        currentUserService.assertCanWriteSchoolData(user, schoolId);
        // MUHIM (2026-09-18 audit): avval bu yerda to'g'ridan-to'g'ri deleteById chaqirilardi —
        // agar o'quvchida davomat yozuvi (attendance.student_id FK) yoki vasiy bog'lanishi
        // (student_guardians FK) bo'lsa, Postgres FK cheklovi buzilib 500 xato qaytarardi
        // (2026-09-17 jonli tasdiqlandi). Endi bog'liq yozuvlar avval tozalanadi.
        attendanceRepository.deleteAll(attendanceRepository.findByStudentId(id));
        messageRepository.deleteAll(messageRepository.findByStudentIdOrderByCreatedAtAsc(id));
        personNoteRepository.deleteAll(
            personNoteRepository.findByPersonTypeAndPersonIdOrderByCreatedAtDesc(com.maktab.model.PersonNote.PersonType.STUDENT, id));
        s.setGuardians(new ArrayList<>());
        studentRepository.saveAndFlush(s);
        studentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }
}
