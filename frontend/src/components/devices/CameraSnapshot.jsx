import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';

/**
 * Boshqariladigan kameraning joriy kadri (GET /api/cameras/{id}/snapshot, VPN orqali).
 * Rasm token bilan olinadi (img src header yubora olmaydi); eski object URL'lar bo'shatiladi.
 */
export default function CameraSnapshot({ cameraId, t }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [takenAt, setTakenAt] = useState(null);
  const current = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const blob = await api.getBlob(`/api/cameras/${cameraId}/snapshot`);
      const next = URL.createObjectURL(blob);
      if (current.current) URL.revokeObjectURL(current.current);
      current.current = next;
      setUrl(next);
      setTakenAt(new Date());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [cameraId]);

  useEffect(() => {
    load();
    return () => { if (current.current) URL.revokeObjectURL(current.current); };
  }, [load]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-emerald-500/[0.08]" style={{ aspectRatio: '16 / 9' }}>
      {url && <img src={url} alt="" className="w-full h-full object-contain" />}
      {!url && !loading && error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center"><p className="text-[12px] text-red-300">{error}</p></div>
      )}
      {loading && !url && (
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      )}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <span className="text-[10px] text-slate-300">{takenAt ? t('cameras.device.snapshotAt', { time: takenAt.toLocaleTimeString() }) : ''}{url && error ? ` · ${error}` : ''}</span>
        <button onClick={load} disabled={loading} className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 disabled:opacity-50">{loading ? '…' : t('cameras.device.refreshSnapshot')}</button>
      </div>
    </div>
  );
}
