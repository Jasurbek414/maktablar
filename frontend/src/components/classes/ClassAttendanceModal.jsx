import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';

// Backend BroadcastController#assertCanUseBotPanel bilan bir xil — tugmani ko'rsatish uchun
// (asl tekshiruv baribir backendda).
const NOTIFY_ROLES = ['SUPERADMIN', 'ADMIN', 'DIRECTOR', 'MUDIR'];

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, mahalliy vaqt

/**
 * Sinf kartochkasi bosilganda ochiladigan oyna: sinf ma'lumotlari, kunlik davomat jadvali,
 * Excel yuklab olish va kelmagan o'quvchilar ota-onasiga Telegram xabari.
 */
export default function ClassAttendanceModal({ cls, user, t, onClose }) {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(''); setResult(null); setComposeOpen(false);
      try {
        const res = await api.get(`/api/classes/${cls.id}/attendance?date=${date}`);
        if (alive) setData(res);
      } catch (e) {
        if (alive) { setData(null); setError(e?.message || t('classes.detail.loadError')); }
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [cls.id, date]);

  const rows = data?.students || [];
  const canNotify = NOTIFY_ROLES.includes(user?.role);
  const absentReachable = useMemo(
    () => rows.filter(s => !s.present && s.guardiansReachable > 0).length, [rows]);
  const absentCount = rows.filter(s => !s.present).length;

  const download = async () => {
    setDownloading(true); setError('');
    try {
      const blob = await api.getBlob(`/api/classes/${cls.id}/attendance/export?date=${date}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davomat_${(cls.name || 'sinf').replace(/[^A-Za-z0-9._-]/g, '_')}_${date}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e?.message || t('classes.detail.loadError')); }
    setDownloading(false);
  };

  const openCompose = () => {
    setText(t('classes.notify.template'));
    setResult(null);
    setComposeOpen(true);
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true); setError('');
    try {
      const res = await api.post('/api/bot/notify-absent', { classId: cls.id, date, text });
      setResult(res);
      setComposeOpen(false);
    } catch (e) { setError(e?.message || t('classes.notify.error')); }
    setSending(false);
  };

  const Stat = ({ label, value, color }) => (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2 text-center min-w-[74px]">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl my-4 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Sarlavha */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-emerald-500/[0.06]">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">{cls.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {cls.schoolName}
              {cls.teacherName ? ` · ${cls.teacherName}` : ` · ${t('classes.card.noTeacher')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white/[0.03] border border-emerald-500/[0.2] text-emerald-400 text-sm outline-none focus:border-emerald-400 [color-scheme:dark]"
            />
            <button onClick={onClose} className="w-9 h-9 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="p-5">
            {/* Jamlanma */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Stat label={t('classes.detail.total')} value={data?.total ?? 0} color="text-white" />
              <Stat label={t('classes.detail.present')} value={data?.present ?? 0} color="text-emerald-400" />
              <Stat label={t('classes.detail.absent')} value={data?.absent ?? 0} color="text-rose-400" />
              <Stat label="%" value={`${data?.pct ?? 0}%`} color={(data?.pct ?? 0) >= 80 ? 'text-emerald-400' : (data?.pct ?? 0) >= 50 ? 'text-amber-400' : 'text-rose-400'} />
            </div>

            {/* Jadval */}
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-600">{t('classes.detail.noStudents')}</p>
            ) : (
              <div className="rounded-xl border border-emerald-500/[0.06] overflow-hidden">
                <div className="overflow-x-auto max-h-[46vh] overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead className="sticky top-0 bg-[#0d1a14] z-10">
                      <tr className="text-[9px] uppercase tracking-widest text-slate-500">
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06] w-10">№</th>
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06]">{t('classes.detail.table.student')}</th>
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06] text-center">{t('classes.detail.table.status')}</th>
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06] text-center">{t('classes.detail.table.in')}</th>
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06] text-center">{t('classes.detail.table.out')}</th>
                        <th className="px-3 py-2 border-b border-emerald-500/[0.06] text-center">{t('classes.detail.table.guardian')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s, i) => (
                        <tr key={s.studentId} className={`border-b border-white/[0.03] ${s.present ? '' : 'bg-rose-500/[0.03]'}`}>
                          <td className="px-3 py-2 text-slate-600 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {s.photoUrl
                                ? <img src={s.photoUrl} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                : <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{s.fullName?.charAt(0)}</div>}
                              <span className="text-[11.5px] text-slate-200">{s.fullName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${s.present ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {s.present ? t('classes.detail.came') : t('classes.detail.notCame')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">{s.inTime || '—'}</td>
                          <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">{s.outTime || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            {s.guardiansReachable > 0
                              ? <span className="text-[10px] text-emerald-400" title={t('classes.detail.guardianOk')}>✓ {s.guardiansReachable}</span>
                              : <span className="text-[10px] text-slate-600" title={t('classes.detail.guardianNone')}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-[11px] text-rose-400">{error}</p>}

            {result && (
              <div className="mt-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2.5">
                <p className="text-[11px] text-emerald-300">
                  {t('classes.notify.result', { students: result.students, guardians: result.guardians })}
                </p>
                {result.skippedNoTelegram > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t('classes.notify.skipped', { count: result.skippedNoTelegram })}
                  </p>
                )}
              </div>
            )}

            {/* Xabar matni */}
            {composeOpen && (
              <div className="mt-3 rounded-lg bg-white/[0.02] border border-emerald-500/[0.1] p-3">
                <p className="text-[11px] font-semibold text-slate-300 mb-1">{t('classes.notify.title', { count: absentReachable })}</p>
                <p className="text-[10px] text-slate-500 mb-2">{t('classes.notify.hint')}</p>
                <textarea
                  value={text} onChange={e => setText(e.target.value)} rows={4}
                  className="w-full p-3 rounded-lg bg-black/30 border border-emerald-500/[0.12] text-[12px] text-slate-200 outline-none focus:border-emerald-500/40 resize-y"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={send} disabled={sending || !text.trim()}
                    className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50">
                    {sending ? t('classes.notify.sending') : t('classes.notify.confirmBtn')}
                  </button>
                  <button onClick={() => setComposeOpen(false)} disabled={sending}
                    className="h-9 px-4 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-white/[0.03]">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Tugmalar */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={download} disabled={downloading || rows.length === 0}
                className="h-10 px-4 rounded-xl bg-white/[0.04] border border-emerald-500/[0.15] text-slate-200 text-xs font-medium hover:bg-white/[0.07] disabled:opacity-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                {downloading ? t('classes.detail.downloading') : t('classes.detail.downloadBtn')}
              </button>

              {canNotify && (
                <button
                  onClick={openCompose}
                  disabled={composeOpen || absentReachable === 0}
                  title={absentCount === 0 ? t('classes.notify.noAbsent') : absentReachable === 0 ? t('classes.notify.noReachable') : ''}
                  className="h-10 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  {t('classes.notify.btn', { count: absentReachable })}
                </button>
              )}
            </div>

            {canNotify && absentReachable === 0 && (
              <p className="text-[10px] text-slate-600 mt-2">
                {absentCount === 0 ? t('classes.notify.noAbsent') : t('classes.notify.noReachable')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
