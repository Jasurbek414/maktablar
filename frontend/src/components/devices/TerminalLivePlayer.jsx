import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

// Backend kadrni 0,5 s keshlaydi (TerminalLiveView) — tezroq so'rash foyda bermaydi
const FRAME_INTERVAL_MS = 500;
const RETRY_MS = 5000;
// Unutilgan oyna maktab internetini kun bo'yi band qilmasligi uchun
const IDLE_LIMIT_MS = 5 * 60 * 1000;

/**
 * Face ID terminal kamerasining jonli ko'rinishi (GET /api/terminals/{id}/live-frame, VPN orqali).
 * Kadrlar ketma-ket olinadi: bitta so'rov tugamaguncha keyingisi yuborilmaydi; brauzer oynasi
 * yashirilganda to'xtaydi; 5 daqiqadan keyin foydalanuvchi "Davom etish"ni bosishi kerak.
 */
export default function TerminalLivePlayer({ terminalId, onStop, t }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const [takenAt, setTakenAt] = useState(null);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const box = useRef(null);
  const current = useRef(null);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (paused || hidden) return undefined;
    let active = true;
    let timer = null;
    const startedAt = Date.now();

    const tick = async () => {
      if (!active) return;
      if (Date.now() - startedAt > IDLE_LIMIT_MS) { setPaused(true); return; }
      const requestedAt = Date.now();
      let wait = FRAME_INTERVAL_MS;
      try {
        const blob = await api.getBlob(`/api/terminals/${terminalId}/live-frame`);
        if (!active) return;
        const next = URL.createObjectURL(blob);
        if (current.current) URL.revokeObjectURL(current.current);
        current.current = next;
        setUrl(next);
        setTakenAt(new Date());
        setError('');
      } catch (e) {
        if (!active) return;
        setError(e.message);
        wait = RETRY_MS;
      }
      timer = setTimeout(tick, Math.max(0, wait - (Date.now() - requestedAt)));
    };
    tick();
    return () => { active = false; clearTimeout(timer); };
  }, [terminalId, paused, hidden]);

  useEffect(() => () => { if (current.current) URL.revokeObjectURL(current.current); }, []);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen?.();
  };

  return (
    <div ref={box} className="relative w-full rounded-xl overflow-hidden bg-black border border-emerald-500/[0.08]" style={{ aspectRatio: '16 / 9' }}>
      {url && <img src={url} alt="" className="w-full h-full object-contain" />}
      {!url && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {!error && <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          <p className={`text-[12px] ${error ? 'text-red-300' : 'text-slate-400'}`}>{error || (t ? t('dashboard.liveView.connecting') : "Ulanilmoqda...")}</p>
        </div>
      )}
      {url && !error && !paused && (
        <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600/90 text-[10px] font-bold text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{t ? t('dashboard.liveView.live') : 'JONLI'}
        </span>
      )}
      {paused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/70">
          <p className="text-[12px] text-slate-300">{t ? t('dashboard.liveView.pausedIdle') : "Harakatsizlik tufayli to'xtatildi"}</p>
          <button onClick={() => setPaused(false)} className="text-[12px] px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">{t ? t('dashboard.liveView.resume') : 'Davom etish'}</button>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <span className="text-[10px] text-slate-300 truncate">
          {takenAt ? (t ? t('dashboard.liveView.frameAt', { time: takenAt.toLocaleTimeString() }) : takenAt.toLocaleTimeString()) : ''}
          {url && error ? ` · ${error}` : ''}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={fullscreen} className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20">{t ? t('dashboard.liveView.fullscreen') : "To'liq ekran"}</button>
          {onStop && <button onClick={onStop} className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20">{t ? t('dashboard.liveView.stop') : "To'xtatish"}</button>}
        </div>
      </div>
    </div>
  );
}
