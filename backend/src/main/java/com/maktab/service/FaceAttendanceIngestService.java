package com.maktab.service;

import com.maktab.model.Attendance;
import com.maktab.model.FaceTerminal;
import com.maktab.model.PersonNote;
import com.maktab.model.PersonRecognitionEvent;
import com.maktab.model.Student;
import com.maktab.model.UnmatchedFaceEvent;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UnmatchedFaceEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Face ID terminalidan kelgan "yuz tanildi" voqeasini davomat yozuviga aylantiradi — barcha
 * manbalar (FaceTerminalMonitor so'rovi, qo'lda qayta tiklash) uchun yagona joy.
 *
 * Qoidalar:
 *  - o'quvchi FAQAT terminal maktabi ichidan qidiriladi (boshqa maktabdagi o'quvchi yozilib qolmasin);
 *  - bitta qurilma voqeasi (terminal + serialNo) faqat bir marta yoziladi (syncKey);
 *  - bir o'quvchining bir xil turdagi o'tishi 60 soniya ichida takrorlansa — dublikat;
 *  - voqea eski bo'lsa (qurilma/VPN uzoq uzilib qolgan) davomat yoziladi, lekin ota-onaga
 *    kechikkan "farzandingiz keldi" xabari yuborilmaydi.
 */
@Service
public class FaceAttendanceIngestService {

    private static final Logger log = LoggerFactory.getLogger(FaceAttendanceIngestService.class);

    /**
     * MUHIM (2026-09-16): bir xil turdagi (IN/OUT) qayta o'tishni "dublikat" hisoblash oynasi
     * endi BotConfigService#attendanceDedupSeconds orqali superadmin panelidan sozlanadi
     * (standart 3 soat), IN va OUT ikkalasiga bir xil qo'llaniladi — AttendanceController
     * #isDuplicateEvent bilan bir xil qoida.
     *
     * MUHIM (2026-09-16 qo'shildi): kirish va chiqish terminallari odatda bir xil eshik yonida
     * yonma-yon turadi — o'quvchi chiqayotganda orqasiga qarasa, kirish kamerasi ham uni "tanib"
     * qolishi mumkin, natijada haqiqatda chiqib ketgan o'quvchi tizimda "ichkarida" bo'lib qoladi.
     * Haqiqiy qaytib kirish odatda bundan ancha uzoqroq vaqt oladi (eshikdan chiqib, narsa unutib
     * qolganini eslab qaytish va h.k.) — shuning uchun QISQA oyna (20s) ichida QARAMA-QARSHI turdagi
     * voqea kelsa, ikkinchisi shubhali deb hisoblanadi va yozilmaydi (foydalanuvchi bilan kelishilgan).
     */
    static final long OPPOSITE_TYPE_FLIP_WINDOW_SECONDS = 20;
    static final Duration NOTIFY_MAX_AGE = Duration.ofMinutes(30);

    public enum Result { RECORDED, DUPLICATE, SUSPICIOUS_FLIP, UNKNOWN_STUDENT, AMBIGUOUS_STUDENT }

    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private StudentRepository studentRepo;
    @Autowired private NotificationService notificationService;
    @Autowired private UnmatchedFaceEventRepository unmatchedRepo;
    @Autowired private BotConfigService botConfigService;
    @Autowired private PersonLocationService personLocationService;

    @Value("${BACKEND_PUBLIC_URL:https://maktab.ecos.uz}")
    private String publicUrl;

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    /**
     * Bir o'quvchining voqealari navbat bilan ishlanadi: monitor terminallarni parallel so'raydi, eshikdagi
     * ikki yonma-yon terminal bitta o'quvchini bir lahzada tanisa, "tekshir-keyin-yoz" dedup'i ikkala
     * oqimda ham "yozuv yo'q" deb ko'rib, ikkita davomat va ikkita bot xabari yaratardi.
     */
    private final Map<Long, Object> studentLocks = new ConcurrentHashMap<>();

    /**
     * @param serialNo qurilmadagi voqea tartib raqami (null bo'lsa syncKey dedup ishlatilmaydi)
     * @param picture  snapshot JPEG'ni oluvchi (ixtiyoriy) — FAQAT davomat haqiqatan yozilganda chaqiriladi:
     *                 monitor har siklda oxirgi voqealarni qayta o'qiydi, rasm oldindan yuklansa har 5 soniyada
     *                 dublikat voqealar rasmi VPN orqali qayta-qayta tortilardi.
     */
    public Result recordFaceEvent(FaceTerminal terminal, String employeeNo, OffsetDateTime time,
                                  Long serialNo, Supplier<byte[]> picture) {
        String syncKey = serialNo != null ? "hik-" + terminal.getId() + "-" + serialNo : null;
        // MUHIM (2026-09-18, jonli tasdiqlangan): monitor har siklda oxirgi ~10 voqeani qayta o'qiydi.
        // Avval "bu voqea qayta ishlanganmi" faqat davomat yozuvi orqali bilinardi — dedup/flip sabab
        // davomatga yozilmagan voqealar hech qayerda belgilanmasdi. Natijada davomat o'chirilsa, oynadagi
        // oldin dublikat deb o'tkazilgan voqealar "yangi" bo'lib qayta yozilardi. Endi har bir qayta
        // ishlangan (o'quvchisi topilgan) voqea person_recognition_events daftarida syncKey bilan turadi.
        if (syncKey != null && (attendanceRepo.existsBySyncKey(syncKey) || personLocationService.isProcessed(syncKey)
                || unmatchedRepo.existsBySyncKey(syncKey))) {
            return Result.DUPLICATE;
        }

        List<Student> matches = terminal.getSchoolId() != null
            ? studentRepo.findBySchoolIdAndDeviceEmployeeNo(terminal.getSchoolId(), employeeNo)
            : List.of();
        if (matches.isEmpty()) {
            log.warn("Face voqea: terminal {} maktabida employeeNo={} o'quvchi topilmadi", terminal.getId(), employeeNo);
            saveUnmatched(terminal, employeeNo, time, UnmatchedFaceEvent.Reason.UNKNOWN_STUDENT, syncKey);
            return Result.UNKNOWN_STUDENT;
        }
        if (matches.size() > 1) {
            log.error("Face voqea: terminal {} maktabida employeeNo={} bir nechta o'quvchiga mos keldi — yozilmadi", terminal.getId(), employeeNo);
            saveUnmatched(terminal, employeeNo, time, UnmatchedFaceEvent.Reason.AMBIGUOUS_STUDENT, syncKey);
            return Result.AMBIGUOUS_STUDENT;
        }
        Student student = matches.get(0);

        OffsetDateTime timestamp = time != null ? time : OffsetDateTime.now();
        // Daftar yozuvi davomat qarori MUVAFFAQIYATLI tugagandan KEYIN: davomatni saqlash xatoga uchrasa
        // (istisno), voqea "qayta ishlangan" deb belgilanmaydi va keyingi siklda qayta urinib ko'riladi.
        synchronized (studentLocks.computeIfAbsent(student.getId(), id -> new Object())) {
            Result result = recordAttendance(terminal, student, timestamp, syncKey, picture);
            recordSighting(terminal, student, timestamp, syncKey);
            return result;
        }
    }

    private Result recordAttendance(FaceTerminal terminal, Student student, OffsetDateTime timestamp,
                                    String syncKey, Supplier<byte[]> picture) {
        Attendance.AttendanceType type = terminal.getDirection() == FaceTerminal.Direction.EXIT
            ? Attendance.AttendanceType.OUT : Attendance.AttendanceType.IN;

        long dedupWindow = botConfigService.attendanceDedupSeconds(terminal.getSchoolId());
        if (attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(student.getId(), type,
                timestamp.minusSeconds(dedupWindow), timestamp.plusSeconds(dedupWindow))) {
            return Result.DUPLICATE;
        }

        Attendance.AttendanceType opposite = type == Attendance.AttendanceType.IN
            ? Attendance.AttendanceType.OUT : Attendance.AttendanceType.IN;
        if (attendanceRepo.existsByStudentIdAndTypeAndTimestampBetween(student.getId(), opposite,
                timestamp.minusSeconds(OPPOSITE_TYPE_FLIP_WINDOW_SECONDS), timestamp.plusSeconds(OPPOSITE_TYPE_FLIP_WINDOW_SECONDS))) {
            log.info("Face voqea: o'quvchi {} uchun {} rad etildi — {} soniya ichida qarama-qarshi ({}) voqea bor, ikkala terminal bir lahzada tutib qolgan bo'lishi mumkin",
                student.getId(), type, OPPOSITE_TYPE_FLIP_WINDOW_SECONDS, opposite);
            return Result.SUSPICIOUS_FLIP;
        }

        String photoPath = savePicture(picture != null ? picture.get() : null);

        Attendance a = new Attendance();
        a.setStudent(student);
        a.setTimestamp(timestamp);
        a.setType(type);
        a.setDeviceSerial(terminal.getSerialNumber());
        a.setPhotoPath(photoPath);
        a.setRouterId(terminal.getRouterId());
        a.setSyncKey(syncKey);
        a.setSyncedAt(OffsetDateTime.now());
        a.setNotificationSent(false);
        attendanceRepo.save(a);

        if (Duration.between(timestamp, OffsetDateTime.now()).abs().compareTo(NOTIFY_MAX_AGE) <= 0) {
            Long attendanceId = a.getId();
            String snapshotUrl = photoPath != null ? publicUrl + photoPath : null;
            notificationService.notifyGuardians(student, timestamp, type.name(), snapshotUrl)
                .thenAccept(sent -> attendanceRepo.findById(attendanceId).ifPresent(row -> {
                    row.setNotificationSent(sent);
                    attendanceRepo.save(row);
                }));
        } else {
            log.info("Face voqea: eski voqea (terminal {}, {}) — davomat yozildi, ota-onaga xabar yuborilmadi", terminal.getId(), timestamp);
        }
        return Result.RECORDED;
    }

    /**
     * Terminal ham yuz tanish qurilmasi — "oxirgi ko'ringan joy" uchun signal (Kamera-Reja).
     * Davomat dedup'idan OLDIN chaqiriladi: takroriy o'tish davomat uchun dublikat, lekin haqiqiy
     * ko'rinish. Bu ikkinchi darajali funksiya — xatosi davomat yozuviga hech qachon ta'sir qilmaydi.
     */
    private void recordSighting(FaceTerminal terminal, Student student, OffsetDateTime timestamp, String syncKey) {
        try {
            personLocationService.recordRecognitionEvent(terminal.getId(), PersonRecognitionEvent.DeviceType.FACE_TERMINAL,
                terminal.getSchoolId(), terminal.getRoomId(), PersonNote.PersonType.STUDENT, student.getId(),
                null, timestamp, syncKey);
        } catch (Exception e) {
            log.warn("Joylashuv yozilmadi (terminal {}, o'quvchi {}): {}", terminal.getId(), student.getId(), e.toString());
        }
    }

    private void saveUnmatched(FaceTerminal terminal, String employeeNo, OffsetDateTime time, UnmatchedFaceEvent.Reason reason,
                               String syncKey) {
        UnmatchedFaceEvent u = new UnmatchedFaceEvent();
        u.setTerminalId(terminal.getId());
        u.setSchoolId(terminal.getSchoolId());
        u.setEmployeeNo(employeeNo);
        u.setTimestamp(time != null ? time : OffsetDateTime.now());
        u.setReason(reason);
        u.setSyncKey(syncKey);
        unmatchedRepo.save(u);
    }

    private String savePicture(byte[] picture) {
        if (picture == null || picture.length == 0) return null;
        try {
            Files.createDirectories(uploadDir);
            String filename = UUID.randomUUID().toString().replace("-", "").substring(0, 16) + ".jpg";
            Files.write(uploadDir.resolve(filename), picture);
            return "/api/files/" + filename;
        } catch (Exception e) {
            log.warn("Face voqea snapshot saqlanmadi: {}", e.getMessage());
            return null;
        }
    }
}
