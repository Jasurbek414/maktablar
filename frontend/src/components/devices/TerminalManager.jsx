import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import TerminalLivePlayer from './TerminalLivePlayer';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);
const ICON = {
  close: 'M6 18L18 6M6 6l12 12',
  refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  door: 'M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  power: 'M5.636 5.636a9 9 0 1012.728 0M12 3v9',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
};

const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const input = 'px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40';

function PhotoModal({ src, title, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-lg w-full bg-[#0d1a14] border border-white/[0.1] rounded-2xl overflow-hidden p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white truncate">{title || "O'tish surati"}</p>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><I d={ICON.close} c="w-5 h-5" /></button>
        </div>
        <div className="aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/5">
          <img src={src} alt="" className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-2 min-w-0">
      <p className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</p>
      <p className={`text-[12px] text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}

function StatusTab({ terminal, canWrite, t }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [unmatched, setUnmatched] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setStatus(await api.get(`/api/terminals/${terminal.id}/status`)); }
    catch (e) { setError(e.message); setStatus(null); }
    setLoading(false);
    api.get(`/api/terminals/${terminal.id}/unmatched-events`).then(setUnmatched).catch(() => {});
  }, [terminal.id]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, okText) => {
    setBusy(key); setNotice(''); setError('');
    try { const r = await fn(); setNotice(typeof okText === 'function' ? okText(r) : okText); }
    catch (e) { setError(e.message); }
    setBusy('');
  };

  const drift = status?.timeDriftSeconds;
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-slate-500 py-6 justify-center"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />{t('devices.manage.connecting')}</div>
      ) : status ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Row label={t('devices.manage.model')} value={status.model} />
          <Row label={t('devices.manage.serial')} value={status.serialNumber} mono />
          <Row label={t('devices.manage.firmware')} value={status.firmwareVersion} />
          <Row label={t('devices.manage.users')} value={status.users} />
          <Row label={t('devices.manage.usersWithFace')} value={status.usersWithFace} />
          <Row label={t('devices.manage.reachableAt')} value={status.reachableAt?.replace('http://', '')} mono />
          <Row label={t('devices.manage.deviceTime')} value={status.deviceTime ? new Date(status.deviceTime).toLocaleString() : null} />
          <Row label={t('devices.manage.timeDrift')} value={drift == null ? null : t('devices.manage.seconds', { count: drift })} />
          <Row label={t('devices.manage.lastEvent')} value={status.lastEventSerial != null ? `#${status.lastEventSerial}` : null} mono />
        </div>
      ) : null}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/[0.06] border border-red-500/15 px-3 py-2.5">
          <I d={ICON.warning} c="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-300">{error}</p>
        </div>
      )}
      {notice && <p className="text-[12px] text-emerald-400">{notice}</p>}

      <div className="flex flex-wrap gap-2">
        <button onClick={load} disabled={loading} className={`${btn} text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]`}><I d={ICON.refresh} c="w-3.5 h-3.5" />{t('devices.manage.refresh')}</button>
        {canWrite && <>
          <button onClick={() => run('door', () => api.post(`/api/terminals/${terminal.id}/door`, { cmd: 'open' }), t('devices.manage.doorOpened'))} disabled={!!busy} className={`${btn} text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20`}><I d={ICON.door} c="w-3.5 h-3.5" />{busy === 'door' ? '…' : t('devices.manage.openDoor')}</button>
          <button onClick={() => run('time', () => api.post(`/api/terminals/${terminal.id}/sync-time`, {}), r => r.status === 'updated' ? t('devices.manage.timeUpdated', { count: r.driftSeconds }) : t('devices.manage.timeUnchanged', { count: r.driftSeconds }))} disabled={!!busy} className={`${btn} text-blue-300 bg-blue-500/10 hover:bg-blue-500/20`}><I d={ICON.clock} c="w-3.5 h-3.5" />{busy === 'time' ? '…' : t('devices.manage.syncTime')}</button>
          <button onClick={() => setConfirmReboot(true)} disabled={!!busy} className={`${btn} text-amber-300 bg-amber-500/10 hover:bg-amber-500/20`}><I d={ICON.power} c="w-3.5 h-3.5" />{t('devices.manage.reboot')}</button>
        </>}
      </div>

      <ConfirmModal
        open={confirmReboot}
        onCancel={() => setConfirmReboot(false)}
        onConfirm={() => { setConfirmReboot(false); run('reboot', () => api.post(`/api/terminals/${terminal.id}/reboot`, {}), t('devices.manage.rebooting')); }}
        title={t('devices.manage.rebootConfirmTitle')}
        message={t('devices.manage.rebootConfirmMessage')}
      />
    </div>
  );
}

function CameraTab({ terminal, canWrite, t }) {
  const [opening, setOpening] = useState(false);
  const [doorNotice, setDoorNotice] = useState('');

  const openDoor = async () => {
    setOpening(true); setDoorNotice('');
    try {
      await api.post(`/api/terminals/${terminal.id}/door`, { cmd: 'open' });
      setDoorNotice("Eshik ochildi");
      setTimeout(() => setDoorNotice(''), 3000);
    } catch (e) {
      setDoorNotice("Xato: " + e.message);
    }
    setOpening(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-white">Jonli kamera ko'rinishi</p>
          <p className="text-[11px] text-slate-500">Terminal kamerasidan to'g'ridan-to'g'ri olingan jonli tasvir</p>
        </div>
        {canWrite && (
          <button
            onClick={openDoor}
            disabled={opening}
            className={`${btn} text-white bg-emerald-600 hover:bg-emerald-500`}
          >
            <I d={ICON.door} c="w-4 h-4" />
            <span>{opening ? 'Ochilmoqda...' : 'Eshikni ochish'}</span>
          </button>
        )}
      </div>
      {doorNotice && (
        <p className={`text-[12px] ${doorNotice.startsWith('Xato') ? 'text-red-400' : 'text-emerald-400'}`}>
          {doorNotice}
        </p>
      )}
      <TerminalLivePlayer terminalId={terminal.id} t={t} />
    </div>
  );
}

function EventsTab({ terminal, canWrite, t }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayStr);

  const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [bfFrom, setBfFrom] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return toLocal(d); });
  const [bfTo, setBfTo] = useState(() => toLocal(new Date()));
  const [bfResult, setBfResult] = useState(null);
  const [bfBusy, setBfBusy] = useState(false);
  const [unmatched, setUnmatched] = useState([]);

  const setPreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setFrom(d.toISOString().slice(0, 10));
    setTo(todayStr);
  };

  const loadEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await api.get(`/api/terminals/${terminal.id}/events?from=${from}&to=${to}`);
      setEvents(data || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [terminal.id, from, to]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => loadEvents(true), 10000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const loadUnmatched = useCallback(async () => {
    try {
      const data = await api.get(`/api/terminals/${terminal.id}/unmatched-events`);
      setUnmatched(data || []);
    } catch {}
  }, [terminal.id]);

  useEffect(() => {
    if (showAdvanced) loadUnmatched();
  }, [showAdvanced, loadUnmatched]);

  const runBackfill = async () => {
    setBfBusy(true); setBfResult(null); setError('');
    try {
      const res = await api.post(`/api/terminals/${terminal.id}/events/backfill`, {
        from: new Date(bfFrom).toISOString(),
        to: new Date(bfTo).toISOString(),
      });
      setBfResult(res);
      loadEvents(true);
    } catch (e) {
      setError(e.message);
    }
    setBfBusy(false);
  };

  const needle = search.trim().toLowerCase();
  const filteredEvents = events.filter(e => {
    if (direction !== 'ALL' && e.direction !== direction) return false;
    if (!needle) return true;
    const st = e.student || {};
    return (st.fullName || '').toLowerCase().includes(needle) ||
           (st.code || '').toLowerCase().includes(needle) ||
           (st.className || '').toLowerCase().includes(needle);
  });

  const stats = {
    total: events.length,
    in: events.filter(e => e.direction === 'IN').length,
    out: events.filter(e => e.direction === 'OUT').length,
    today: events.filter(e => e.time && e.time.startsWith(todayStr)).length,
  };

  return (
    <div className="space-y-4">
      {photo && <PhotoModal src={photo.src} title={photo.title} onClose={() => setPhoto(null)} />}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Jami o'tishlar</p>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-cyan-500/[0.07] border border-cyan-500/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-cyan-400">Kirishlar (IN)</p>
          <p className="text-xl font-bold text-cyan-300 mt-1 tabular-nums">{stats.in}</p>
        </div>
        <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-400">Chiqishlar (OUT)</p>
          <p className="text-xl font-bold text-amber-300 mt-1 tabular-nums">{stats.out}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400">Bugun</p>
          <p className="text-xl font-bold text-emerald-300 mt-1 tabular-nums">{stats.today}</p>
        </div>
      </div>

      {/* Date filter & Quick presets */}
      <div className="rounded-xl bg-black/20 border border-white/[0.04] p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Oraliq:</span>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="px-2 py-1 rounded bg-black/40 border border-white/10 text-[12px] text-white focus:outline-none focus:border-emerald-500/50" />
            <span className="text-slate-500 text-xs">—</span>
            <input type="date" value={to} min={from} max={todayStr} onChange={e => setTo(e.target.value)}
              className="px-2 py-1 rounded bg-black/40 border border-white/10 text-[12px] text-white focus:outline-none focus:border-emerald-500/50" />
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setPreset(0)} className={`px-2 py-1 rounded text-[11px] ${from === todayStr && to === todayStr ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-white/[0.03] text-slate-400 hover:text-white'}`}>Bugun</button>
              <button onClick={() => setPreset(3)} className="px-2 py-1 rounded text-[11px] bg-white/[0.03] text-slate-400 hover:text-white">3 kun</button>
              <button onClick={() => setPreset(7)} className="px-2 py-1 rounded text-[11px] bg-white/[0.03] text-slate-400 hover:text-white">7 kun</button>
              <button onClick={() => setPreset(30)} className="px-2 py-1 rounded text-[11px] bg-white/[0.03] text-slate-400 hover:text-white">30 kun</button>
            </div>
          </div>
          <button onClick={() => loadEvents()} disabled={refreshing || loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-slate-300 transition-all">
            <I d={ICON.refresh} c={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>

        {/* Search & Direction */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.04]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="O'quvchi ismi, sinfi yoki ID..."
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/[0.04]">
            <button onClick={() => setDirection('ALL')} className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${direction === 'ALL' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-white'}`}>Barchasi</button>
            <button onClick={() => setDirection('IN')} className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${direction === 'IN' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-white'}`}>Kirish</button>
            <button onClick={() => setDirection('OUT')} className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${direction === 'OUT' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-white'}`}>Chiqish</button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-300">{error}</div>}

      {/* Events Table */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Voqealar yuklanmoqda...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8 rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06]">
          <p className="text-xs text-slate-500">Ushbu oraliqda o'tish voqealari topilmadi</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-[#0b1610] text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 border-b border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Vaqt</th>
                <th className="py-2.5 px-3 font-semibold">O'quvchi</th>
                <th className="py-2.5 px-3 font-semibold">Yo'nalish</th>
                <th className="py-2.5 px-3 font-semibold">Usul</th>
                <th className="py-2.5 px-3 font-semibold text-right">Surat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredEvents.map(ev => {
                const st = ev.student || {};
                const timeStr = ev.time ? new Date(ev.time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
                const isEntrance = ev.direction === 'IN';
                return (
                  <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 text-slate-300 font-mono tabular-nums text-[11px] whitespace-nowrap">{timeStr}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden border border-emerald-500/20">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            st.fullName ? st.fullName.charAt(0) : '?'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate max-w-[160px]">{st.fullName || "Noma'lum o'quvchi"}</p>
                          <p className="text-[10px] text-slate-500 truncate">{[st.className ? `${st.className} sinf` : null, st.code ? `ID: ${st.code}` : null].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isEntrance ? 'bg-cyan-500/15 text-cyan-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isEntrance ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                        {isEntrance ? 'KIRISH' : 'CHIQISH'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-medium">Face ID</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ev.hasPhoto && ev.photoUrl ? (
                        <button
                          onClick={() => setPhoto({ src: ev.photoUrl, title: `${st.fullName || "O'quvchi"} · ${timeStr}` })}
                          className="px-2 py-0.5 rounded text-[11px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium"
                        >
                          Surat
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Advanced Tools Accordion */}
      <div className="rounded-xl border border-white/[0.04] bg-black/10 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
        >
          <span>Qo'shimcha vositalar (Tarixni qayta tiklash & Moslanmagan voqealar)</span>
          <span className="text-slate-600">{showAdvanced ? '▲ Yashirish' : '▼ Ko\'rish'}</span>
        </button>

        {showAdvanced && (
          <div className="p-4 space-y-4 border-t border-white/[0.04] bg-black/20">
            {/* Backfill tool */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">Qurilma xotirasidan qayta o'qish (Backfill)</p>
              <p className="text-[10px] text-slate-500">{t('devices.manage.eventsHint')}</p>
              {canWrite && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <label className="text-[10px] text-slate-500">
                    {t('devices.manage.from')}
                    <input type="datetime-local" value={bfFrom} onChange={e => setBfFrom(e.target.value)} className={`${input} w-full mt-0.5 text-xs`} />
                  </label>
                  <label className="text-[10px] text-slate-500">
                    {t('devices.manage.to')}
                    <input type="datetime-local" value={bfTo} onChange={e => setBfTo(e.target.value)} className={`${input} w-full mt-0.5 text-xs`} />
                  </label>
                  <button onClick={runBackfill} disabled={bfBusy} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-500 text-xs h-[38px]`}>
                    {bfBusy ? t('devices.manage.backfillRunning') : t('devices.manage.backfill')}
                  </button>
                </div>
              )}
              {bfResult && <p className="text-[11px] text-emerald-400">{t('devices.manage.backfillResult', { read: bfResult.read, recorded: bfResult.recorded })}</p>}
            </div>

            {/* Unmatched events */}
            <div className="pt-3 border-t border-white/[0.04] space-y-2">
              <p className="text-[11px] font-semibold text-amber-400">{t('devices.manage.unmatchedTitle')}</p>
              <p className="text-[10px] text-slate-500">{t('devices.manage.unmatchedHint')}</p>
              {unmatched.length === 0 ? (
                <p className="text-[11px] text-slate-600 italic">{t('devices.manage.unmatchedEmpty')}</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {unmatched.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-400 bg-black/30 rounded px-2.5 py-1.5 border border-white/[0.02]">
                      <span className="font-mono text-emerald-400 truncate">{u.employeeNo || '—'}</span>
                      <span className="text-slate-500">{u.reason === 'AMBIGUOUS_STUDENT' ? t('devices.manage.unmatchedReasonAmbiguous') : t('devices.manage.unmatchedReasonUnknown')}</span>
                      <span className="text-slate-600 shrink-0 font-mono">{new Date(u.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ terminal, canWrite, t }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [delTarget, setDelTarget] = useState(null);

  const loadPage = useCallback(async (offset, append) => {
    setLoading(true); setError('');
    try {
      const r = await api.get(`/api/terminals/${terminal.id}/users?offset=${offset}&limit=30`);
      setRows(prev => append ? [...prev, ...r.users] : r.users);
      setTotal(r.total);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [terminal.id]);

  useEffect(() => { loadPage(0, false); }, [loadPage]);

  const remove = async () => {
    const emp = delTarget; setDelTarget(null);
    try { await api.del(`/api/terminals/${terminal.id}/users/${encodeURIComponent(emp)}`); loadPage(0, false); }
    catch (e) { setError(e.message); }
  };

  const strangers = rows.filter(r => !r.matched).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-400">{t('devices.manage.usersTotal', { count: total })}{strangers > 0 && <span className="text-amber-400"> · {t('devices.manage.strangers', { count: strangers })}</span>}</p>
        <button onClick={() => loadPage(0, false)} disabled={loading} className={`${btn} text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]`}><I d={ICON.refresh} c="w-3.5 h-3.5" /></button>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {rows.length === 0 && !loading ? (
        <p className="text-center text-xs text-slate-600 py-6">{t('devices.manage.noUsers')}</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {rows.map(u => (
            <div key={u.employeeNo} className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-emerald-500/20">
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (u.studentName || u.deviceName || '?').charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-200 truncate">{u.studentName || u.deviceName || '—'}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono">ID: {u.employeeNo}</span>
                  {u.className && <span>· {u.className} sinf</span>}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.faces > 0 ? 'bg-pink-500/10 text-pink-400' : 'bg-white/[0.04] text-slate-500'}`}>{u.faces > 0 ? t('devices.manage.hasFace') : t('devices.manage.noFace')}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.matched ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{u.matched ? t('devices.manage.matched') : t('devices.manage.stranger')}</span>
              {canWrite && <button onClick={() => setDelTarget(u.employeeNo)} className="p-1 rounded text-slate-600 hover:text-red-400" title={t('common.delete')}><I d={ICON.trash} c="w-3.5 h-3.5" /></button>}
            </div>
          ))}
        </div>
      )}
      {rows.length < total && <button onClick={() => loadPage(rows.length, true)} disabled={loading} className="w-full text-[12px] text-emerald-400 hover:text-emerald-300 py-1">{loading ? '…' : t('devices.manage.loadMore')}</button>}
      <ConfirmModal open={!!delTarget} onCancel={() => setDelTarget(null)} onConfirm={remove}
        title={t('devices.manage.deleteUserTitle')} message={t('devices.manage.deleteUserMessage', { id: delTarget })} />
    </div>
  );
}

function FacesTab({ terminal, canWrite, t }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const poll = useCallback((jobId) => {
    clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const j = await api.get(`/api/terminals/${terminal.id}/sync-faces/${jobId}`);
        setJob(j);
        if (j.finished) clearInterval(timer.current);
      } catch (e) { setError(e.message); clearInterval(timer.current); }
    }, 1500);
  }, [terminal.id]);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = async () => {
    setError('');
    try { const j = await api.post(`/api/terminals/${terminal.id}/sync-faces`, {}); setJob(j); poll(j.jobId); }
    catch (e) { setError(e.message); }
  };

  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-400 leading-relaxed">{t('devices.manage.facesHint')}</p>
      {canWrite ? (
        <button onClick={start} disabled={job && !job.finished} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-500`}>{job && !job.finished ? t('devices.manage.syncRunning') : t('devices.manage.syncAll')}</button>
      ) : <p className="text-[11px] text-slate-600">{t('devices.manage.readOnly')}</p>}
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {job && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-slate-300">{t('devices.manage.progress', { done: job.done, total: job.total })}</span>
            <span className="text-emerald-400">{t('devices.manage.succeeded', { count: job.success })}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          {job.abortReason && <p className="text-[12px] text-red-400">{t('devices.manage.aborted')}: {job.abortReason}</p>}
          {job.finished && !job.abortReason && <p className="text-[12px] text-slate-400">{t('devices.manage.finished', { ok: job.success, failed: job.failed })}</p>}
          {job.errors?.length > 0 && (
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">{t('devices.manage.errorsTitle')}</p>
              {job.errors.map((e, i) => (
                <div key={i} className="text-[11px] rounded-lg bg-red-500/[0.04] border border-red-500/10 px-2.5 py-1.5">
                  <span className="text-slate-300">{e.fullName}</span> — <span className="text-red-300">{e.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Face ID terminalini masofadan boshqarish oynasi (backend: /api/terminals/{id}/...). */
export default function TerminalManager({ terminal, canWrite, onClose, t }) {
  const [tab, setTab] = useState('status');
  const tabs = [
    ['status', t('devices.manage.tabStatus')],
    ['camera', t('devices.manage.tabCamera') || 'Kamera (Jonli)'],
    ['events', t('devices.manage.tabEvents')],
    ['faces', t('devices.manage.tabFaces')],
    ['users', t('devices.manage.tabUsers')]
  ];
  const supported = (terminal.brand || '').trim().toLowerCase() === 'hikvision';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-[#0d1a14] border border-emerald-500/[0.12] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] sticky top-0 bg-[#0d1a14]/95 backdrop-blur-xl z-10">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-white truncate">{terminal.name}</h3>
            <p className="text-[11px] text-slate-500 truncate">{[terminal.brand, terminal.model, terminal.ipAddress].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05]"><I d={ICON.close} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {terminal.lastError && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-3 py-2.5">
              <I d={ICON.warning} c="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div><p className="text-[11px] font-semibold text-amber-400">{t('devices.manage.lastError')}</p><p className="text-[11px] text-slate-400 mt-0.5">{terminal.lastError}</p></div>
            </div>
          )}
          {!supported ? (
            <p className="text-[12px] text-slate-400">{t('devices.manage.unsupported')}</p>
          ) : <>
            <div className="flex gap-1 rounded-xl bg-black/20 p-1">
              {tabs.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`flex-1 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${tab === id ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>
              ))}
            </div>
            {tab === 'status' && <StatusTab terminal={terminal} canWrite={canWrite} t={t} />}
            {tab === 'camera' && <CameraTab terminal={terminal} canWrite={canWrite} t={t} />}
            {tab === 'events' && <EventsTab terminal={terminal} canWrite={canWrite} t={t} />}
            {tab === 'faces' && <FacesTab terminal={terminal} canWrite={canWrite} t={t} />}
            {tab === 'users' && <UsersTab terminal={terminal} canWrite={canWrite} t={t} />}
          </>}
        </div>
      </div>
    </div>
  );
}
