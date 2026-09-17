package com.maktab.controller;

import com.maktab.model.*;
import com.maktab.repository.*;
import com.maktab.security.CurrentUserService;
import com.maktab.service.FaceEnrollmentService;
import com.maktab.service.I18nService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Frontend A (/spd) uchun /api/v1/students, /api/v1/teachers, /api/v1/parents,
 * /api/v1/parent-links kontrakti. Mavjud /api/students (StudentController) va
 * /api/users (UserController) o'zgarishsiz qoladi — bu yerda xuddi shu
 * Student/User/Guardian entitylari qayta ishlatiladi.
 *
 * MUHIM SODDALASHTIRISHLAR:
 * 1. TEACHER — bu backendda alohida Teacher entity YO'Q (Django'da bor edi).
 *    O'qituvchilar shunchaki role=TEACHER bo'lgan User qatorlari.
 * 2. PARENT-LINK — Student<->Guardian ManyToMany bog'lanishida "status" (pending/active)
 *    tushunchasi YO'Q, faqat to'g'ridan-to'g'ri bog'lanish jadvali bor. Shu sabab har doim
 *    "active" qaytariladi (pastroqda usul ichida ham izohlangan).
 */
@RestController
@RequestMapping("/api/v1")
public class V1StudentController {

    @Autowired private StudentRepository studentRepo;
    @Autowired private SchoolRepository schoolRepo;
    @Autowired private SchoolClassRepository classRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private GuardianRepository guardianRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private MessageRepository messageRepo;
    @Autowired private PersonNoteRepository personNoteRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private I18nService i18n;
    @Autowired private FaceEnrollmentService faceEnrollmentService;

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    public V1StudentController() {
        try { Files.createDirectories(uploadDir); } catch (IOException e) { throw new RuntimeException(e); }
    }

    // ══════════════════════════ STUDENTS ══════════════════════════

    // MUHIM: school/schoolId/class_ref/classId endi client'dan ishonch bilan qabul qilinmaydi —
    // haqiqiy ko'lam Authorization headerdagi foydalanuvchidan olinadi (CurrentUserService).
    @GetMapping("/students/")
    public List<Map<String, Object>> getStudents(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) Long class_ref,
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) String search) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        Long cid = class_ref != null ? class_ref : classId;

        List<Student> list;
        if (cid != null) {
            SchoolClass sc = classRepo.findById(cid).orElse(null);
            Long classSchoolId = sc != null && sc.getSchool() != null ? sc.getSchool().getId() : null;
            if (!currentUserService.canAccessSchool(user, classSchoolId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, i18n.msg("error.class.access_denied"));
            }
            list = studentRepo.findByClassId(cid);
        } else {
            List<Long> scope = currentUserService.resolveSchoolScope(user, sid);
            if (scope == null) list = studentRepo.findAll();
            else if (scope.isEmpty()) list = Collections.emptyList();
            else if (scope.size() == 1) list = studentRepo.findBySchoolId(scope.get(0));
            else list = studentRepo.findBySchoolIdIn(scope);
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(s -> s.getFullName() != null && s.getFullName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toStudentMap).collect(Collectors.toList());
    }

    @GetMapping("/students/{id}/")
    public ResponseEntity<?> getStudent(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student s = studentRepo.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, s.getSchool() != null ? s.getSchool().getId() : null);
        return ResponseEntity.ok(toStudentMap(s));
    }

    @PostMapping("/students/")
    public ResponseEntity<?> createStudent(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        if (schoolVal == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.required"))));
        Long schoolId = Long.valueOf(schoolVal.toString());
        currentUserService.assertCanWriteSchoolData(user, schoolId);
        School school = schoolRepo.findById(schoolId).orElse(null);
        if (school == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.not_found"))));

        Student s = new Student();
        s.setFullName(resolveFullName(body));
        s.setFaceId("SCH" + school.getId() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setSchool(school);
        applyOptionalStudentFields(s, body);
        String classErr = applyClassId(s, body, false);
        if (classErr != null) return ResponseEntity.badRequest().body(Map.of("error", classErr));
        studentRepo.save(s);
        return ResponseEntity.ok(toStudentMap(s));
    }

    @PatchMapping("/students/{id}/")
    public ResponseEntity<?> updateStudent(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Map<String, Object> body) {
        User user = currentUserService.requireUser(authHeader);
        Student s = studentRepo.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(user, s.getSchool() != null ? s.getSchool().getId() : null);

        if (body.containsKey("fullName") || body.containsKey("first_name") || body.containsKey("last_name")) {
            String fn = resolveFullName(body);
            if (fn != null && !fn.isBlank()) s.setFullName(fn);
        }
        applyOptionalStudentFields(s, body);
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        boolean schoolChanged = false;
        if (schoolVal != null) {
            Long newSchoolId = Long.valueOf(schoolVal.toString());
            Long oldSchoolId = s.getSchool() != null ? s.getSchool().getId() : null;
            if (!newSchoolId.equals(oldSchoolId)) {
                currentUserService.assertCanWriteSchoolData(user, newSchoolId);
                School newSchool = schoolRepo.findById(newSchoolId).orElse(null);
                if (newSchool != null) {
                    s.setSchool(newSchool);
                    schoolChanged = true;
                }
            }
        }
        // classId endi schoolId o'zgarishidan KEYIN qo'llanadi — applyClassId javdocidagi
        // sabab: yakuniy maktabga tegishliligini tekshirish va maktab o'zgarganda avtomatik
        // tozalash uchun s.getSchool() shu nuqtada allaqachon yakuniy bo'lishi kerak.
        String classErr = applyClassId(s, body, schoolChanged);
        if (classErr != null) return ResponseEntity.badRequest().body(Map.of("error", classErr));
        studentRepo.save(s);
        return ResponseEntity.ok(toStudentMap(s));
    }

    @DeleteMapping("/students/{id}/")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student s = studentRepo.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(user, s.getSchool() != null ? s.getSchool().getId() : null);
        // MUHIM (2026-09-18 audit, StudentController#delete bilan bir xil sabab): bog'liq
        // yozuvlar (attendance/student_guardians FK) avval tozalanadi, aks holda 500 xato.
        attendanceRepo.deleteAll(attendanceRepo.findByStudentId(id));
        messageRepo.deleteAll(messageRepo.findByStudentIdOrderByCreatedAtAsc(id));
        personNoteRepo.deleteAll(
            personNoteRepo.findByPersonTypeAndPersonIdOrderByCreatedAtDesc(PersonNote.PersonType.STUDENT, id));
        s.setGuardians(new ArrayList<>());
        studentRepo.saveAndFlush(s);
        studentRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    @GetMapping("/students/{id}/attendance/")
    public ResponseEntity<?> getStudentAttendance(@PathVariable Long id,
                                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student owner = studentRepo.findById(id).orElse(null);
        if (owner == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanAccessSchool(user, owner.getSchool() != null ? owner.getSchool().getId() : null);
        // Attendance bu yerda IN/OUT hodisalar ro'yxati (Django'dagi kabi kunlik status
        // yozuvi emas) — xom hodisalar xronologik tartibda qaytariladi.
        List<Attendance> events = attendanceRepo.findByStudentId(id);
        return ResponseEntity.ok(events.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("timestamp", a.getTimestamp() != null ? a.getTimestamp().toString() : null);
            m.put("type", a.getType() != null ? a.getType().name() : null);
            m.put("temperature", a.getTemperature());
            return m;
        }).collect(Collectors.toList()));
    }

    @PostMapping("/students/{id}/upload-photo/")
    public ResponseEntity<?> uploadPhoto(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader,
                                          @RequestParam(value = "photo", required = false) MultipartFile photo,
                                          @RequestParam(value = "file", required = false) MultipartFile file) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepo.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(user, student.getSchool() != null ? student.getSchool().getId() : null);
        MultipartFile upload = photo != null ? photo : file;
        if (upload == null || upload.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.file.not_found")));
        }
        try {
            String ext = "";
            String orig = upload.getOriginalFilename();
            if (orig != null && orig.contains(".")) ext = orig.substring(orig.lastIndexOf("."));
            String filename = UUID.randomUUID().toString().substring(0, 12) + ext;
            Path target = uploadDir.resolve(filename);
            Files.copy(upload.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            String url = "/api/files/" + filename;
            student.setPhotoUrl(url);
            studentRepo.save(student);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("photo_url", url);
            result.put("photoUrl", url);
            result.put("url", url);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("detail", e.getMessage()));
        }
    }

    /**
     * Studentning (avval upload-photo bilan yuklangan) rasmini uning maktabidagi barcha
     * Face ID terminallariga yuklaydi — brendga mos FaceTerminalDriver orqali (hozircha
     * Hikvision; yangi brend qo'shilsa faqat yangi drayver yoziladi, bu yerga tegilmaydi).
     * Eski "mini-PC bridge + DeviceCommand navbati" tizimi olib tashlangan edi (izoh
     * saqlanib qolgan edi) — endi to'g'ridan-to'g'ri, sinxron push qilinadi.
     */
    @PostMapping("/students/{id}/push-face/")
    public ResponseEntity<?> pushFace(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUserService.requireUser(authHeader);
        Student student = studentRepo.findById(id).orElse(null);
        if (student == null) return ResponseEntity.notFound().build();
        currentUserService.assertCanWriteSchoolData(user, student.getSchool() != null ? student.getSchool().getId() : null);

        if (student.getPhotoUrl() == null || student.getPhotoUrl().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.student.photo_required")));
        }
        if (student.getFaceId() == null || student.getFaceId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.student.face_id_missing")));
        }

        byte[] imageBytes;
        try {
            String filename = student.getPhotoUrl().substring(student.getPhotoUrl().lastIndexOf('/') + 1);
            Path photoPath = uploadDir.resolve(filename).normalize();
            if (!photoPath.startsWith(uploadDir) || !Files.exists(photoPath)) {
                return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.student.photo_required")));
            }
            imageBytes = Files.readAllBytes(photoPath);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("detail", e.getMessage()));
        }

        FaceEnrollmentService.PushOutcome outcome = faceEnrollmentService.pushToSchoolTerminals(student, imageBytes, "image/jpeg");

        if (outcome.totalCount == 0) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.student.no_terminals")));
        }
        if (outcome.allSuccess()) {
            return ResponseEntity.ok(Map.of(
                "message", i18n.msg("success.student.face_pushed", outcome.successCount, outcome.totalCount)
            ));
        }
        if (outcome.anySuccess()) {
            return ResponseEntity.status(207).body(Map.of(
                "message", i18n.msg("success.student.face_pushed_partial", outcome.successCount, outcome.totalCount),
                "errors", outcome.errors
            ));
        }
        return ResponseEntity.status(502).body(Map.of(
            "detail", i18n.msg("error.student.face_push_failed"),
            "errors", outcome.errors
        ));
    }

    private String resolveFullName(Map<String, Object> body) {
        if (body.get("fullName") != null) return body.get("fullName").toString();
        if (body.get("full_name") != null) return body.get("full_name").toString();
        String last = body.get("last_name") != null ? body.get("last_name").toString() : "";
        String first = body.get("first_name") != null ? body.get("first_name").toString() : "";
        String middle = body.get("middle_name") != null ? body.get("middle_name").toString() : "";
        String combined = (last + " " + first + " " + middle).trim().replaceAll("\\s+", " ");
        return combined.isBlank() ? null : combined;
    }

    private void applyOptionalStudentFields(Student s, Map<String, Object> body) {
        Object photo = body.get("photoUrl") != null ? body.get("photoUrl") : body.get("photo_url");
        if (photo != null) s.setPhotoUrl(photo.toString());
        Object birth = body.get("birthDate") != null ? body.get("birthDate") : body.get("birth_date");
        if (birth != null) s.setBirthDate(LocalDate.parse(birth.toString()));
    }

    /**
     * classId'ni tekshirib qo'llaydi — s.getSchool() ALLAQACHON YAKUNIY (schoolId
     * o'zgarishi bo'lsa, shundan KEYIN chaqirilishi shart) bo'lishi kerak.
     *
     * MUHIM (2026-09-18 audit, 2026-09-17 jonli tasdiqlangan): avval (1) classId
     * s.getSchool()ga tegishliligi umuman tekshirilmasdi — boshqa maktabning sinfi
     * kiritilsa, o'quvchi u yerda "yashirin" qolardi; (2) maktab o'zgarganda, agar
     * client alohida classId yubormasa, ESKI maktabga tegishli eski classId saqlanib
     * qolardi — natijada o'quvchi yangi maktab ro'yxatida hech qaysi sinf ichida
     * ko'rinmasdi ("jami N ta, ro'yxatda kamroq" holati).
     * @return xato bo'lsa error xabari (i18n kaliti EMAS, tayyor matn), aks holda null
     */
    private String applyClassId(Student s, Map<String, Object> body, boolean schoolChanged) {
        Object classVal = body.get("classId") != null ? body.get("classId") : body.get("class_ref");
        boolean provided = body.containsKey("classId") || body.containsKey("class_ref");
        if (provided) {
            Long newClassId = classVal != null ? Long.valueOf(classVal.toString()) : null;
            if (newClassId != null) {
                SchoolClass sc = classRepo.findById(newClassId).orElse(null);
                Long targetSchoolId = s.getSchool() != null ? s.getSchool().getId() : null;
                if (sc == null || sc.getSchool() == null || !sc.getSchool().getId().equals(targetSchoolId)) {
                    return i18n.msg("error.class.wrong_school");
                }
            }
            s.setClassId(newClassId);
        } else if (schoolChanged) {
            s.setClassId(null);
        }
        return null;
    }

    private Map<String, Object> toStudentMap(Student s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("fullName", s.getFullName());
        m.put("full_name", s.getFullName());
        m.put("faceId", s.getFaceId());
        m.put("student_id", s.getFaceId());
        m.put("birthDate", s.getBirthDate() != null ? s.getBirthDate().toString() : null);
        m.put("birth_date", s.getBirthDate() != null ? s.getBirthDate().toString() : null);
        m.put("photoUrl", s.getPhotoUrl());
        m.put("photo_url", s.getPhotoUrl());
        m.put("has_photo", s.getPhotoUrl() != null && !s.getPhotoUrl().isBlank());
        Long schoolId = s.getSchool() != null ? s.getSchool().getId() : null;
        m.put("schoolId", schoolId);
        m.put("school", schoolId);
        m.put("schoolName", s.getSchool() != null ? s.getSchool().getName() : null);
        m.put("classId", s.getClassId());
        m.put("class_ref", s.getClassId());
        if (s.getClassId() != null) {
            classRepo.findById(s.getClassId()).ifPresent(c -> {
                m.put("className", c.getName());
                m.put("class_name", c.getName());
            });
        }
        return m;
    }

    // ══════════════════════════ TEACHERS (User, role=TEACHER) ══════════════════════════

    @GetMapping("/teachers/")
    public List<Map<String, Object>> getTeachers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long school,
            @RequestParam(required = false) Long schoolId,
            @RequestParam(required = false) String search) {
        User user = currentUserService.requireUser(authHeader);
        Long sid = school != null ? school : schoolId;
        List<Long> scope = currentUserService.resolveSchoolScope(user, sid);

        List<User> list;
        if (scope == null) list = userRepo.findByRole(User.Role.TEACHER);
        else if (scope.isEmpty()) list = Collections.emptyList();
        else if (scope.size() == 1) list = userRepo.findByRoleAndSchoolId(User.Role.TEACHER, scope.get(0));
        else list = userRepo.findByRoleAndSchoolIdIn(User.Role.TEACHER, scope);

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(u -> u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toTeacherMap).collect(Collectors.toList());
    }

    @PostMapping("/teachers/")
    public ResponseEntity<?> createTeacher(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object usernameVal = body.get("username") != null ? body.get("username") : body.get("phone");
        if (usernameVal == null) return ResponseEntity.badRequest().body(Map.of("username", List.of(i18n.msg("error.login_phone_required"))));
        String username = usernameVal.toString();
        if (userRepo.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("username", List.of(i18n.msg("error.login.already_exists"))));
        }
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        if (schoolVal == null) return ResponseEntity.badRequest().body(Map.of("school", List.of(i18n.msg("error.school.required"))));
        currentUserService.assertCanManageTeacher(caller, Long.valueOf(schoolVal.toString()));

        String initialPassword = body.get("password") != null ? body.get("password").toString()
            : UUID.randomUUID().toString().substring(0, 10); // parol berilmasa vaqtinchalik parol generatsiya qilinadi

        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(initialPassword));
        String fullName = resolveFullName(body);
        u.setFullName(fullName != null ? fullName : username);
        u.setRole(User.Role.TEACHER);
        u.setSchoolId(Long.valueOf(schoolVal.toString()));
        userRepo.save(u);
        return ResponseEntity.ok(toTeacherMap(u));
    }

    @PatchMapping("/teachers/{id}/")
    public ResponseEntity<?> updateTeacher(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        User u = userRepo.findById(id).orElse(null);
        if (u == null || u.getRole() != User.Role.TEACHER) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageTeacher(caller, u.getSchoolId());

        if (body.containsKey("fullName") || body.containsKey("first_name") || body.containsKey("last_name")) {
            String fn = resolveFullName(body);
            if (fn != null && !fn.isBlank()) u.setFullName(fn);
        }
        Object schoolVal = body.get("schoolId") != null ? body.get("schoolId") : body.get("school");
        if (schoolVal != null) {
            Long newSchoolId = Long.valueOf(schoolVal.toString());
            currentUserService.assertCanManageTeacher(caller, newSchoolId);
            u.setSchoolId(newSchoolId);
        }
        // MUHIM: parolni bo'sh bo'lmagan "password" maydoni bilan jimgina reset qiladi (audit
        // tomonidan aniqlangan mavjud xatti-harakat) — endi faqat yuqoridagi scope tekshiruvidan
        // o'tgan (o'z maktabi/ko'lami) chaqiruvchi shu amalni bajara oladi.
        if (body.get("password") != null && !body.get("password").toString().isBlank()) {
            u.setPassword(passwordEncoder.encode(body.get("password").toString()));
        }
        userRepo.save(u);
        return ResponseEntity.ok(toTeacherMap(u));
    }

    @DeleteMapping("/teachers/{id}/")
    public ResponseEntity<?> deleteTeacher(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User caller = currentUserService.requireUser(authHeader);
        User u = userRepo.findById(id).orElse(null);
        if (u == null || u.getRole() != User.Role.TEACHER) return ResponseEntity.notFound().build();
        currentUserService.assertCanManageTeacher(caller, u.getSchoolId());
        userRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.deleted")));
    }

    private Map<String, Object> toTeacherMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("fullName", u.getFullName());
        m.put("full_name", u.getFullName());
        m.put("username", u.getUsername());
        m.put("phone", u.getUsername());
        m.put("schoolId", u.getSchoolId());
        m.put("school", u.getSchoolId());
        if (u.getSchoolId() != null) {
            schoolRepo.findById(u.getSchoolId()).ifPresent(s -> m.put("school_name", s.getName()));
        }
        m.put("role", u.getRole().name());
        m.put("is_active", true);
        m.put("subject", null);    // schema'da yo'q
        m.put("employee_id", null); // schema'da yo'q
        return m;
    }

    // ══════════════════════════ PARENTS (Guardian) ══════════════════════════

    // MUHIM: Guardian bu sxemada schoolId'ga ega EMAS (to'g'ridan-to'g'ri Student<->Guardian
    // ManyToMany, "qaysi maktabga tegishli" degan ustun yo'q) — REGION_DIRECTOR/DISTRICT_DIRECTOR/
    // DIRECTOR/MUDIR/TEACHER uchun aniq ko'lam hisoblash student-guardian join'ini har bir chaqiruvda
    // to'liq skanerlashni talab qiladi. Vaqt cheklovi va bu ma'lumotning nozikligini (telefon/
    // telegramUserId) hisobga olib, soddaroq qoida tanlandi: FAQAT SUPERADMIN/ADMIN ko'ra oladi.
    @GetMapping("/parents/")
    public List<Map<String, Object>> getParents(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                                  @RequestParam(required = false) String search) {
        User caller = currentUserService.requireUser(authHeader);
        if (!currentUserService.isUnrestrictedAdmin(caller)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, i18n.msg("error.permission.superadmin_admin_only"));
        }
        List<Guardian> list = guardianRepo.findAll();
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream()
                .filter(g -> (g.getName() != null && g.getName().toLowerCase().contains(q))
                        || (g.getPhone() != null && g.getPhone().contains(q)))
                .collect(Collectors.toList());
        }
        return list.stream().map(this::toParentMap).collect(Collectors.toList());
    }

    /**
     * Admin-facing: operator ota-onaning parolini qo'lda o'rnatishi/qayta o'rnatishi
     * mumkin (masalan telegram bot orqali birinchi ro'yxatdan o'tishni kutmasdan, yoki
     * parolni unutgan ota-ona uchun). GuardianController#register bilan bir xil BCrypt
     * kodlash — Telegram bot shu parol bilan ham darhol kira oladi.
     */
    @PatchMapping("/parents/{id}/set-password/")
    public ResponseEntity<?> setParentPassword(@PathVariable Long id,
                                                @RequestHeader(value = "Authorization", required = false) String authHeader,
                                                @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        if (!currentUserService.isUnrestrictedAdmin(caller)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, i18n.msg("error.permission.superadmin_admin_only"));
        }
        Guardian guardian = guardianRepo.findById(id).orElse(null);
        if (guardian == null) return ResponseEntity.notFound().build();
        Object passwordVal = body.get("password");
        if (passwordVal == null || passwordVal.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("password", List.of(i18n.msg("error.validation.required"))));
        }
        guardian.setPassword(passwordEncoder.encode(passwordVal.toString()));
        guardianRepo.save(guardian);
        return ResponseEntity.ok(Map.of("message", i18n.msg("success.password_set")));
    }

    private Map<String, Object> toParentMap(Guardian g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.getId());
        m.put("name", g.getName());
        m.put("phone", g.getPhone());
        m.put("telegramUserId", g.getTelegramUserId());
        return m;
    }

    // ══════════════════════════ PARENT-LINKS (Student <-> Guardian) ══════════════════════════

    /**
     * Bu sxemada Student<->Guardian to'g'ridan-to'g'ri ManyToMany ("student_guardians"
     * jadvali), pending/active degan holat tushunchasi yo'q. Shu sabab har bir bog'lanish
     * yaratilgan zahoti "active" hisoblanadi — Django'dagi tasdiqlash oqimi bu yerda soddalashtirilgan.
     */
    @PostMapping("/parent-links/")
    public ResponseEntity<?> createParentLink(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                               @RequestBody Map<String, Object> body) {
        User caller = currentUserService.requireUser(authHeader);
        Object studentVal = body.get("studentId") != null ? body.get("studentId") : body.get("student");
        Object phoneVal = body.get("parentPhone") != null ? body.get("parentPhone") : body.get("phone");
        if (studentVal == null || phoneVal == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", i18n.msg("error.parent_link.fields_required")));
        }
        Student student = studentRepo.findById(Long.valueOf(studentVal.toString())).orElse(null);
        if (student == null) return ResponseEntity.badRequest().body(Map.of("studentId", List.of(i18n.msg("error.student.not_found"))));
        currentUserService.assertCanWriteSchoolData(caller, student.getSchool() != null ? student.getSchool().getId() : null);

        String phone = phoneVal.toString();
        Guardian guardian = guardianRepo.findByPhone(phone);
        if (guardian == null) {
            guardian = new Guardian();
            guardian.setPhone(phone);
            guardian.setName(""); // ism berilmagan bo'lsa bo'sh — keyinroq to'ldiriladi
            guardian = guardianRepo.save(guardian);
        }

        List<Guardian> guardians = student.getGuardians();
        if (guardians == null) guardians = new ArrayList<>();
        final Guardian linkedGuardian = guardian;
        boolean alreadyLinked = guardians.stream().anyMatch(g -> g.getId().equals(linkedGuardian.getId()));
        if (!alreadyLinked) {
            guardians.add(linkedGuardian);
            student.setGuardians(guardians);
            studentRepo.save(student);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", guardian.getId());
        result.put("studentId", student.getId());
        result.put("parentPhone", phone);
        result.put("relationship", body.get("relationship"));
        result.put("status", "active"); // schema'da pending holati yo'q — doim active
        return ResponseEntity.ok(result);
    }

    @GetMapping("/parent-links/")
    public ResponseEntity<?> getParentLinks(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @RequestParam(required = false) Long studentId) {
        User caller = currentUserService.requireUser(authHeader);
        List<Map<String, Object>> result = new ArrayList<>();
        if (studentId != null) {
            Student student = studentRepo.findById(studentId).orElse(null);
            if (student == null) return ResponseEntity.notFound().build();
            currentUserService.assertCanAccessSchool(caller, student.getSchool() != null ? student.getSchool().getId() : null);
            List<Guardian> guardians = student.getGuardians() != null ? student.getGuardians() : Collections.emptyList();
            for (Guardian g : guardians) result.add(toLinkMap(student.getId(), g));
        } else {
            // studentId berilmagan bo'lsa — faqat chaqiruvchi ko'lamidagi o'quvchilar bo'yicha
            // (SUPERADMIN/ADMIN uchun cheklovsiz, aks holda allowedSchoolIds bilan cheklanadi).
            List<Long> scope = currentUserService.allowedSchoolIds(caller);
            List<Student> students = scope == null ? studentRepo.findAll()
                : (scope.isEmpty() ? Collections.emptyList() : studentRepo.findBySchoolIdIn(scope));
            for (Student s : students) {
                List<Guardian> guardians = s.getGuardians() != null ? s.getGuardians() : Collections.emptyList();
                for (Guardian g : guardians) result.add(toLinkMap(s.getId(), g));
            }
        }
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toLinkMap(Long studentId, Guardian g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.getId());
        m.put("studentId", studentId);
        m.put("parentPhone", g.getPhone());
        m.put("relationship", null); // schema'da saqlanmaydi
        m.put("status", "active");
        return m;
    }
}
