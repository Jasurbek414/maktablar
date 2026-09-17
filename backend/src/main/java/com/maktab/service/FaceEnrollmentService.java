package com.maktab.service;

import com.maktab.faceterminal.FaceTerminalDriver;
import com.maktab.model.FaceTerminal;
import com.maktab.model.Student;
import com.maktab.repository.FaceTerminalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * O'quvchining yuz rasmini uning maktabidagi BARCHA Face ID terminallariga (kirish +
 * chiqish) yuklaydi — har biri o'z brendiga mos FaceTerminalDriver orqali (ro'yxat uchun
 * com.maktab.faceterminal paketiga qarang). Bitta terminal muvaffaqiyatsiz bo'lsa ham
 * qolganlariga urinish davom etadi (bitta noto'g'ri sozlangan qurilma butun push'ni
 * to'xtatmasligi kerak).
 */
@Service
public class FaceEnrollmentService {

    private static final Logger log = LoggerFactory.getLogger(FaceEnrollmentService.class);

    @Autowired private FaceTerminalRepository terminalRepo;
    @Autowired private List<FaceTerminalDriver> drivers;

    public static class PushOutcome {
        public final int successCount;
        public final int totalCount;
        public final List<String> errors;

        PushOutcome(int successCount, int totalCount, List<String> errors) {
            this.successCount = successCount;
            this.totalCount = totalCount;
            this.errors = errors;
        }

        public boolean anySuccess() { return successCount > 0; }
        public boolean allSuccess() { return totalCount > 0 && successCount == totalCount; }
    }

    public PushOutcome pushToSchoolTerminals(Student student, byte[] imageBytes, String imageContentType) {
        List<FaceTerminal> terminals = student.getSchool() != null
            ? terminalRepo.findBySchoolId(student.getSchool().getId())
            : List.of();

        List<String> errors = new ArrayList<>();
        int success = 0;

        for (FaceTerminal terminal : terminals) {
            FaceTerminalDriver driver = drivers.stream()
                .filter(d -> d.supports(terminal.getBrand()))
                .findFirst()
                .orElse(null);

            if (driver == null) {
                errors.add(terminal.getName() + ": brend qo'llab-quvvatlanmaydi (\"" + terminal.getBrand() + "\")");
                continue;
            }
            try {
                driver.pushFace(terminal, student.getFaceId(), student.getFullName(), imageBytes, imageContentType);
                success++;
            } catch (Exception e) {
                log.error("Face push xatosi (terminal={}, student={}): {}", terminal.getId(), student.getId(), e.getMessage());
                errors.add(terminal.getName() + ": " + e.getMessage());
            }
        }

        return new PushOutcome(success, terminals.size(), errors);
    }
}
