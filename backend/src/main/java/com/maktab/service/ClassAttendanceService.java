package com.maktab.service;

import com.maktab.model.Attendance;
import com.maktab.model.SchoolClass;
import com.maktab.model.Student;
import com.maktab.model.User;
import com.maktab.repository.AttendanceRepository;
import com.maktab.repository.StudentRepository;
import com.maktab.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Bitta sinfning bir kunlik davomati (2026-09-21) — jadval, Excel va "kelmaganlarga xabar"
 * uchun yagona manba: SchoolClassController ham, BroadcastController ham shu yerdan foydalanadi,
 * shunda panelda ko'rinadigan ro'yxat bilan xabar ketadigan ro'yxat bir xil bo'ladi.
 *
 * Kun chegarasi Asia/Tashkent bo'yicha; o'quvchi kun ichida bir necha marta o'tishi mumkin,
 * shuning uchun BIRINCHI kirish va OXIRGI chiqish olinadi.
 */
@Service
public class ClassAttendanceService {

    public static final ZoneId TASHKENT = ZoneId.of("Asia/Tashkent");
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired private StudentRepository studentRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private UserRepository userRepo;

    /** Shu kunda kirish qayd etilgan o'quvchilar id'lari. */
    public Set<Long> presentStudentIds(SchoolClass sc, LocalDate day) {
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        Set<Long> classIds = studentRepo.findByClassId(sc.getId()).stream()
            .map(Student::getId).collect(Collectors.toSet());
        if (schoolId == null || classIds.isEmpty()) return Set.of();
        return eventsOfDay(schoolId, day).stream()
            .filter(a -> a.getType() == Attendance.AttendanceType.IN)
            .map(a -> a.getStudent() != null ? a.getStudent().getId() : null)
            .filter(id -> id != null && classIds.contains(id))
            .collect(Collectors.toSet());
    }

    /** Shu kunda kelmagan o'quvchilar (ism bo'yicha tartiblangan). */
    public List<Student> absentStudents(SchoolClass sc, LocalDate day) {
        Set<Long> present = presentStudentIds(sc, day);
        return studentRepo.findByClassId(sc.getId()).stream()
            .filter(s -> !present.contains(s.getId()))
            .sorted(Comparator.comparing(s -> s.getFullName() == null ? "" : s.getFullName()))
            .collect(Collectors.toList());
    }

    /** Jadval qatorlari: holat, kirish/chiqish vaqti, harorat va vasiylar hisobi. */
    public List<Map<String, Object>> rows(SchoolClass sc, LocalDate day) {
        Long schoolId = sc.getSchool() != null ? sc.getSchool().getId() : null;
        List<Student> students = studentRepo.findByClassId(sc.getId());
        Set<Long> classIds = students.stream().map(Student::getId).collect(Collectors.toSet());

        Map<Long, OffsetDateTime> firstIn = new HashMap<>();
        Map<Long, OffsetDateTime> lastOut = new HashMap<>();
        Map<Long, Double> temperature = new HashMap<>();
        if (schoolId != null && !classIds.isEmpty()) {
            for (Attendance a : eventsOfDay(schoolId, day)) {
                Long sid = a.getStudent() != null ? a.getStudent().getId() : null;
                if (sid == null || !classIds.contains(sid)) continue;
                if (a.getType() == Attendance.AttendanceType.IN) {
                    firstIn.merge(sid, a.getTimestamp(), (old, cur) -> cur.isBefore(old) ? cur : old);
                } else {
                    lastOut.merge(sid, a.getTimestamp(), (old, cur) -> cur.isAfter(old) ? cur : old);
                }
                if (a.getTemperature() != null) temperature.put(sid, a.getTemperature());
            }
        }

        return students.stream()
            .sorted(Comparator.comparing(s -> s.getFullName() == null ? "" : s.getFullName()))
            .map(s -> {
                OffsetDateTime in = firstIn.get(s.getId());
                OffsetDateTime out = lastOut.get(s.getId());
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("studentId", s.getId());
                m.put("fullName", s.getFullName());
                m.put("photoUrl", s.getPhotoUrl());
                m.put("present", in != null);
                m.put("inTime", in != null ? in.atZoneSameInstant(TASHKENT).format(HM) : null);
                m.put("outTime", out != null ? out.atZoneSameInstant(TASHKENT).format(HM) : null);
                m.put("temperature", temperature.get(s.getId()));
                m.put("guardians", s.getGuardians() == null ? 0 : s.getGuardians().size());
                m.put("guardiansReachable", reachableGuardians(s).size());
                return m;
            })
            .collect(Collectors.toList());
    }

    /** Telegram'i ulangan va bildirishnomani o'chirmagan vasiylar — xabar aynan shularga ketadi. */
    public List<com.maktab.model.Guardian> reachableGuardians(Student s) {
        if (s.getGuardians() == null) return List.of();
        return s.getGuardians().stream()
            .filter(g -> g.getTelegramUserId() != null && !g.getTelegramUserId().isBlank()
                && Boolean.TRUE.equals(g.getNotificationsEnabled()))
            .collect(Collectors.toList());
    }

    private List<Attendance> eventsOfDay(Long schoolId, LocalDate day) {
        OffsetDateTime from = day.atStartOfDay(TASHKENT).toOffsetDateTime();
        OffsetDateTime to = day.plusDays(1).atStartOfDay(TASHKENT).toOffsetDateTime();
        return attendanceRepo.findBySchoolAndDateRange(schoolId, from, to);
    }

    // ─── Excel ───────────────────────────────────────────────────────────────────

    public byte[] excel(SchoolClass sc, LocalDate day, List<Map<String, Object>> rows) throws IOException {
        long present = rows.stream().filter(r -> Boolean.TRUE.equals(r.get("present"))).count();
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Davomat");
            CellStyle bold = wb.createCellStyle();
            Font boldFont = wb.createFont();
            boldFont.setBold(true);
            bold.setFont(boldFont);

            int r = 0;
            String teacher = sc.getTeacherId() != null
                ? userRepo.findById(sc.getTeacherId()).map(User::getFullName).orElse("-") : "-";
            r = kv(sheet, r, bold, "Maktab:", sc.getSchool() != null ? sc.getSchool().getName() : "");
            r = kv(sheet, r, bold, "Sinf:", sc.getName() != null ? sc.getName() : "");
            r = kv(sheet, r, bold, "Sinf rahbari:", teacher);
            r = kv(sheet, r, bold, "Sana:", day.toString());

            Row sum = sheet.createRow(r++);
            sum.createCell(0).setCellValue("Jami:");
            sum.createCell(1).setCellValue(rows.size());
            sum.createCell(2).setCellValue("Keldi:");
            sum.createCell(3).setCellValue(present);
            sum.createCell(4).setCellValue("Kelmadi:");
            sum.createCell(5).setCellValue(rows.size() - present);
            r++; // bo'sh qator

            String[] headers = {"№", "F.I.Sh", "Holat", "Kirdi", "Chiqdi", "Harorat"};
            Row head = sheet.createRow(r++);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = head.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(bold);
            }
            int n = 1;
            for (Map<String, Object> row : rows) {
                Row line = sheet.createRow(r++);
                line.createCell(0).setCellValue(n++);
                line.createCell(1).setCellValue(String.valueOf(row.get("fullName")));
                line.createCell(2).setCellValue(Boolean.TRUE.equals(row.get("present")) ? "Keldi" : "Kelmadi");
                line.createCell(3).setCellValue(row.get("inTime") != null ? row.get("inTime").toString() : "-");
                line.createCell(4).setCellValue(row.get("outTime") != null ? row.get("outTime").toString() : "-");
                line.createCell(5).setCellValue(row.get("temperature") != null ? row.get("temperature").toString() : "-");
            }
            sheet.setColumnWidth(0, 1800);
            sheet.setColumnWidth(1, 10000);
            for (int c = 2; c < headers.length; c++) sheet.setColumnWidth(c, 3600);
            sheet.createFreezePane(0, head.getRowNum() + 1);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private int kv(Sheet sheet, int rowIdx, CellStyle bold, String key, String value) {
        Row row = sheet.createRow(rowIdx);
        Cell k = row.createCell(0);
        k.setCellValue(key);
        k.setCellStyle(bold);
        row.createCell(1).setCellValue(value);
        return rowIdx + 1;
    }

    /** Fayl nomi HTTP sarlavhasida ketadi — ASCII bo'lmagan belgilar ba'zi brauzerlarda buziladi. */
    public static String asciiSafe(String s) {
        if (s == null || s.isBlank()) return "sinf";
        String cleaned = s.replaceAll("[^A-Za-z0-9._-]", "_").replaceAll("_+", "_");
        return cleaned.isBlank() || cleaned.equals("_") ? "sinf" : cleaned;
    }
}
