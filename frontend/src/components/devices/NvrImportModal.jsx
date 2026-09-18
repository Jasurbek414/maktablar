import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const input = 'w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40';

/**
 * NVR (registrator)ga ulangan kameralarni bir yo'la platformaga qo'shish:
 * 1) NVR manzili va login -> "Kameralarni ko'rish" (POST /api/cameras/nvr/channels, hech narsa saqlanmaydi)
 * 2) kerakli kameralarni belgilash -> "Qo'shish" (POST /api/cameras/nvr/import)
 */
export default function NvrImportModal({ open, onClose, schoolId, initial = {}, t, onImported }) {
  const [form, setForm] = useState({ ipAddress: '', port: '', useHttps: false, deviceUsername: '', devicePassword: '' });
  const [nvr, setNvr] = useState(null);
  const [picked, setPicked] = useState({});
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      ipAddress: initial.ipAddress || '', port: initial.port ?? '', useHttps: !!initial.useHttps,
      deviceUsername: initial.deviceUsername || '', devicePassword: initial.devicePassword || '',
    });
    setNvr(null); setPicked({}); setRoomId(''); setError(''); setDone(null);
    if (schoolId) api.get(`/api/rooms?schoolId=${schoolId}`).then(setRooms).catch(() => setRooms([]));
  }, [open]);

  if (!open) return null;

  const body = () => ({ schoolId, ...form });

  const loadChannels = async () => {
    setBusy(true); setError(''); setNvr(null);
    try {
      const res = await api.post('/api/cameras/nvr/channels', body());
      setNvr(res);
      // Standart: onlayn va hali qo'shilmagan kameralar belgilanadi
      const init = {};
      res.channels.forEach(c => { if (!c.registered && c.online !== false) init[c.id] = true; });
      setPicked(init);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const importSelected = async () => {
    const channels = nvr.channels.filter(c => picked[c.id]).map(c => ({ id: c.id, name: c.name || '' }));
    if (!channels.length) { setError(t('cameras.nvr.noneSelected')); return; }
    setBusy(true); setError('');
    try {
      const res = await api.post('/api/cameras/nvr/import', { ...body(), channels, roomId: roomId || null });
      setDone(res);
      onImported?.();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const selectable = nvr ? nvr.channels.filter(c => !c.registered) : [];
  const allPicked = selectable.length > 0 && selectable.every(c => picked[c.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-1">{t('cameras.nvr.title')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t('cameras.nvr.desc')}</p>

        {done ? (
          <>
            <p className="text-sm text-emerald-400 mb-4">{t('cameras.nvr.done', { created: done.created, skipped: done.skipped })}</p>
            <button onClick={onClose} className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">{t('common.close')}</button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
              <input className={`${input} sm:col-span-2`} value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} placeholder={t('cameras.nvr.ipPlaceholder')} />
              <input className={input} value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder={t('cameras.nvr.portPlaceholder')} inputMode="numeric" />
              <input className={input} value={form.deviceUsername} onChange={e => setForm({ ...form, deviceUsername: e.target.value })} placeholder={t('cameras.device.username')} autoComplete="off" />
              <input className={`${input} sm:col-span-2`} type="password" value={form.devicePassword} onChange={e => setForm({ ...form, devicePassword: e.target.value })} placeholder={t('cameras.device.password')} autoComplete="new-password" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400 mb-4 cursor-pointer select-none">
              <input type="checkbox" checked={form.useHttps} onChange={e => setForm({ ...form, useHttps: e.target.checked })} />
              {t('cameras.nvr.useHttps')}
            </label>

            {!nvr && (
              <button onClick={loadChannels} disabled={busy || !form.ipAddress || !form.deviceUsername || !form.devicePassword}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium">
                {busy ? t('cameras.nvr.loading') : t('cameras.nvr.loadBtn')}
              </button>
            )}

            {nvr && (
              <>
                <p className="text-xs text-slate-400 mb-2">{t('cameras.nvr.found', { model: nvr.model || 'NVR', count: nvr.channels.length })}</p>
                {nvr.channels.length === 0 ? (
                  <p className="text-sm text-amber-300 mb-3">{t('cameras.nvr.empty')}</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 text-xs text-slate-400 mb-2 cursor-pointer select-none">
                      <input type="checkbox" checked={allPicked} disabled={!selectable.length}
                        onChange={e => setPicked(Object.fromEntries(selectable.map(c => [c.id, e.target.checked])))} />
                      {t('cameras.nvr.selectAll')}
                    </label>
                    <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto pr-1">
                      {nvr.channels.map(c => (
                        <label key={c.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg border ${c.registered ? 'border-white/[0.03] opacity-60' : 'border-white/[0.06] cursor-pointer'} bg-white/[0.02]`}>
                          <input type="checkbox" disabled={c.registered} checked={!!picked[c.id]} onChange={e => setPicked({ ...picked, [c.id]: e.target.checked })} />
                          <span className="text-[11px] font-mono text-slate-500 w-12 shrink-0">{t('cameras.nvr.channel', { n: c.id })}</span>
                          <span className="text-sm text-white truncate flex-1">{c.name || '—'}</span>
                          {c.registered
                            ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">{t('cameras.nvr.registered')}</span>
                            : c.online === false
                              ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">{t('cameras.nvr.offline')}</span>
                              : c.online ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300">{t('cameras.nvr.online')}</span> : null}
                        </label>
                      ))}
                    </div>
                    <select value={roomId} onChange={e => setRoomId(e.target.value)} className={`${input} mb-3`}>
                      <option value="">{t('cameras.nvr.noRoom')}</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.number} — {r.name}</option>)}
                    </select>
                    <button onClick={importSelected} disabled={busy || !Object.values(picked).some(Boolean)}
                      className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium">
                      {busy ? t('cameras.nvr.importing') : t('cameras.nvr.importBtn', { count: Object.values(picked).filter(Boolean).length })}
                    </button>
                  </>
                )}
              </>
            )}

            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
            <button onClick={onClose} disabled={busy} className="w-full mt-3 h-9 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] disabled:opacity-50">{t('common.cancel')}</button>
          </>
        )}
      </div>
    </div>
  );
}
