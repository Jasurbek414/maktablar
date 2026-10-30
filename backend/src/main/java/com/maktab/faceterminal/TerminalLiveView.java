package com.maktab.faceterminal;

import com.maktab.model.FaceTerminal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongSupplier;

/**
 * Face ID terminal kamerasini jonli kuzatish (2026-10-04) — terminal ISAPI'dan ketma-ket kadr olinadi
 * (DS-K1T673DX'da /ISAPI/Streaming/channels/101/picture sinalgan; HikvisionIsapiClient#snapshot).
 *
 * Terminalni va maktab VPN kanalini himoya qilish uchun:
 *  - har bir terminalga bir vaqtda faqat BITTA so'rov ketadi; kadr {@link #MIN_FRAME_INTERVAL_MS}
 *    ichida barcha tomoshabinlarga keshdan beriladi — tomoshabinlar soni terminal yukini oshirmaydi;
 *  - terminal javob bermasa, xato {@link #ERROR_BACKOFF_MS} davomida keshlanadi — o'chiq terminalga
 *    har kadrda 16 soniyalik so'rov yuborilmaydi (VPN va servlet oqimlari band bo'lmaydi).
 */
@Component
public class TerminalLiveView {

    private static final Logger log = LoggerFactory.getLogger(TerminalLiveView.class);

    /** ~2 kadr/s — maktab interneti (OpenVPN/SSTP, TCP) uchun xavfsiz chegara. */
    static final long MIN_FRAME_INTERVAL_MS = 500;
    static final long ERROR_BACKOFF_MS = 5_000;
    /** DigestAuthHttpClient'ning qattiq muhlati (16s) + zaxira — undan uzoq kutilmaydi. */
    static final long LOCK_WAIT_MS = 18_000;
    private static final long AUDIT_INTERVAL_MS = 10 * 60_000;

    public interface FrameSource {
        byte[] fetch(FaceTerminal t);
    }

    private static final class Slot {
        final ReentrantLock lock = new ReentrantLock();
        volatile byte[] frame;
        volatile long frameAt;
        volatile TerminalException error;
        volatile long errorAt;
    }

    public record Frame(byte[] jpeg, long takenAtMillis) {}

    private final Map<Long, Slot> slots = new ConcurrentHashMap<>();
    private final Map<String, Long> lastAudit = new ConcurrentHashMap<>();
    private final FrameSource source;
    private final LongSupplier clock;

    @Autowired
    public TerminalLiveView(TerminalEndpointResolver resolver) {
        this(t -> resolver.hikvision(t).snapshot("101"), System::currentTimeMillis);
    }

    TerminalLiveView(FrameSource source, LongSupplier clock) {
        this.source = source;
        this.clock = clock;
    }

    public Frame frame(FaceTerminal t) {
        Slot s = slots.computeIfAbsent(t.getId(), id -> new Slot());
        Frame cached = fresh(s);
        if (cached != null) return cached;
        boolean locked;
        try {
            locked = s.lock.tryLock(LOCK_WAIT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TerminalException("Kadr olish to'xtatildi");
        }
        if (!locked) throw new TerminalException("Terminal band — kadr olinmadi, birozdan keyin qayta urinib ko'ring");
        try {
            // Navbat kutgan paytda boshqa tomoshabin yangi kadr olgan bo'lishi mumkin
            cached = fresh(s);
            if (cached != null) return cached;
            try {
                byte[] jpeg = source.fetch(t);
                long now = clock.getAsLong();
                s.frame = jpeg;
                s.frameAt = now;
                s.error = null;
                return new Frame(jpeg, now);
            } catch (TerminalException e) {
                s.error = e;
                s.errorAt = clock.getAsLong();
                throw e;
            }
        } finally {
            s.lock.unlock();
        }
    }

    private Frame fresh(Slot s) {
        long now = clock.getAsLong();
        TerminalException err = s.error;
        if (err != null && now - s.errorAt < ERROR_BACKOFF_MS) throw err;
        byte[] f = s.frame;
        if (f != null && s.error == null && now - s.frameAt < MIN_FRAME_INTERVAL_MS) return new Frame(f, s.frameAt);
        return null;
    }

    /** Kim qaysi terminalni kuzatganini log'ga yozadi — har kadrda emas, 10 daqiqada bir marta. */
    public void audit(FaceTerminal t, Long userId, String username) {
        String key = userId + ":" + t.getId();
        long now = clock.getAsLong();
        Long prev = lastAudit.get(key);
        if (prev != null && now - prev < AUDIT_INTERVAL_MS) return;
        lastAudit.put(key, now);
        log.info("AUDIT jonli kuzatuv: terminal={} user={} ({})", t.getId(), userId, username);
    }
}
