package com.maktab.faceterminal;

import com.maktab.model.FaceTerminal;
import com.maktab.model.Student;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * O'quvchilar yuzini terminalga ommaviy yuklash — fon ishi sifatida, jarayoni kuzatiladi.
 *
 * Faqat foydalanuvchi so'raganda ishga tushadi (avtomatik emas). Bitta o'quvchidagi xato
 * (rasm yo'q, yuz aniqlanmadi) qolganlarini to'xtatmaydi; qurilma ketma-ket javob bermasa
 * (tarmoq uzilgan) ish to'xtatiladi — 45 ta bir xil "javob bermadi" xatosi o'rniga bitta aniq xabar.
 */
@Service
public class FaceSyncService {

    private static final Logger log = LoggerFactory.getLogger(FaceSyncService.class);
    static final int ABORT_AFTER_CONSECUTIVE_CONNECTION_ERRORS = 3;
    static final int MAX_KEPT_JOBS = 50;
    static final int MAX_ERRORS_PER_JOB = 500;

    @Autowired private HikvisionFaceTerminalDriver driver;

    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "face-sync");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, Job> jobs = Collections.synchronizedMap(new LinkedHashMap<>());
    private final Map<Long, String> runningByTerminal = new ConcurrentHashMap<>();
    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    public static class Job {
        public final String id = UUID.randomUUID().toString();
        public final Long terminalId;
        public final int total;
        public final OffsetDateTime startedAt = OffsetDateTime.now();
        public volatile int done;
        public volatile int success;
        public volatile boolean finished;
        public volatile String abortReason;
        public volatile OffsetDateTime finishedAt;
        public final List<Map<String, Object>> errors = Collections.synchronizedList(new ArrayList<>());

        Job(Long terminalId, int total) {
            this.terminalId = terminalId;
            this.total = total;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("jobId", id);
            m.put("terminalId", terminalId);
            m.put("total", total);
            m.put("done", done);
            m.put("success", success);
            m.put("failed", done - success);
            m.put("finished", finished);
            m.put("abortReason", abortReason);
            m.put("startedAt", startedAt.toString());
            m.put("finishedAt", finishedAt != null ? finishedAt.toString() : null);
            synchronized (errors) {
                m.put("errors", new ArrayList<>(errors));
            }
            return m;
        }
    }

    /** @return yangi ish, yoki shu terminalda ish allaqachon ketayotgan bo'lsa Optional.empty() */
    public synchronized Optional<Job> start(FaceTerminal terminal, List<Student> students) {
        String running = runningByTerminal.get(terminal.getId());
        if (running != null) return Optional.empty();

        Job job = new Job(terminal.getId(), students.size());
        runningByTerminal.put(terminal.getId(), job.id);
        jobs.put(job.id, job);
        trimJobs();
        executor.submit(() -> run(job, terminal, students));
        return Optional.of(job);
    }

    public Optional<Job> get(String jobId) {
        return Optional.ofNullable(jobs.get(jobId));
    }

    private void run(Job job, FaceTerminal terminal, List<Student> students) {
        int consecutiveConnectionErrors = 0;
        try {
            for (Student s : students) {
                try {
                    pushOne(terminal, s);
                    job.success++;
                    consecutiveConnectionErrors = 0;
                } catch (TerminalException e) {
                    addError(job, s, e.getMessage());
                    if (e.getMessage() != null && e.getMessage().startsWith("Terminal javob bermadi")) {
                        if (++consecutiveConnectionErrors >= ABORT_AFTER_CONSECUTIVE_CONNECTION_ERRORS) {
                            job.abortReason = e.getMessage();
                            job.done++;
                            break;
                        }
                    } else {
                        consecutiveConnectionErrors = 0;
                    }
                } catch (Exception e) {
                    addError(job, s, "Kutilmagan xato: " + e.getClass().getSimpleName());
                    log.error("Face sync: o'quvchi {} terminal {}: {}", s.getId(), terminal.getId(), e.toString());
                }
                job.done++;
            }
        } finally {
            job.finished = true;
            job.finishedAt = OffsetDateTime.now();
            runningByTerminal.remove(terminal.getId(), job.id);
            log.info("Face sync tugadi: terminal {} — {}/{} muvaffaqiyatli{}", terminal.getId(), job.success, job.total,
                job.abortReason != null ? " (to'xtatildi: " + job.abortReason + ")" : "");
        }
    }

    /** Bitta o'quvchini terminalga yuklaydi (sinxron). Xato bo'lsa TerminalException. */
    public void pushOne(FaceTerminal terminal, Student s) {
        if (s.getFaceId() == null || s.getFaceId().isBlank()) {
            throw new TerminalException("O'quvchida Face ID yo'q");
        }
        driver.pushFace(terminal, s.getFaceId(), s.getFullName(), loadPhoto(s), "image/jpeg");
    }

    byte[] loadPhoto(Student s) {
        String url = s.getPhotoUrl();
        if (url == null || url.isBlank()) {
            throw new TerminalException("O'quvchi rasmi yuklanmagan");
        }
        String filename = url.substring(url.lastIndexOf('/') + 1);
        Path photo = uploadDir.resolve(filename).normalize();
        if (!photo.startsWith(uploadDir) || !Files.isRegularFile(photo)) {
            throw new TerminalException("O'quvchi rasmi fayli topilmadi");
        }
        try {
            return Files.readAllBytes(photo);
        } catch (Exception e) {
            throw new TerminalException("O'quvchi rasmini o'qib bo'lmadi");
        }
    }

    private void addError(Job job, Student s, String message) {
        if (job.errors.size() >= MAX_ERRORS_PER_JOB) return;
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("studentId", s.getId());
        err.put("fullName", s.getFullName());
        err.put("error", message);
        job.errors.add(err);
    }

    private void trimJobs() {
        synchronized (jobs) {
            Iterator<Map.Entry<String, Job>> it = jobs.entrySet().iterator();
            while (jobs.size() > MAX_KEPT_JOBS && it.hasNext()) {
                if (it.next().getValue().finished) it.remove();
            }
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
