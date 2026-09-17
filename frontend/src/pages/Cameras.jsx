import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';
import CameraSnapshot from '../components/devices/CameraSnapshot';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const CAM_ICON = "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z";
const ROOM_ICON = "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21";
const SETTINGS_ICON = "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z";

const SB = ({ status, t }) => {
  const map = {
    ONLINE: [t('cameras.status.ONLINE'), 'text-emerald-400', 'bg-emerald-500/10', 'bg-emerald-400'],
    OFFLINE: [t('cameras.status.OFFLINE'), 'text-red-400', 'bg-red-500/10', 'bg-red-400'],
    MAINTENANCE: [t('cameras.status.MAINTENANCE'), 'text-amber-400', 'bg-amber-500/10', 'bg-amber-400'],
  };
  const c = map[status] || [t('cameras.status.unknown'), 'text-slate-400', 'bg-slate-500/10', 'bg-slate-400'];
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c[2]} ${c[1]}`}><span className={`w-1.5 h-1.5 rounded-full ${c[3]} ${status === 'ONLINE' ? 'animate-pulse' : ''}`} />{c[0]}</span>;
};

const getTypeLabels = (t) => ({
  MOTION: t('cameras.eventTypes.MOTION'),
  PERSON_DETECTED: t('cameras.eventTypes.PERSON_DETECTED'),
  CROWD: t('cameras.eventTypes.CROWD'),
  UNAUTHORIZED_ACCESS: t('cameras.eventTypes.UNAUTHORIZED_ACCESS'),
  EQUIPMENT_ISSUE: t('cameras.eventTypes.EQUIPMENT_ISSUE'),
  OTHER: t('cameras.eventTypes.OTHER'),
});

const getSeverityLabels = (t) => ({ LOW: t('cameras.severity.LOW'), MEDIUM: t('cameras.severity.MEDIUM'), HIGH: t('cameras.severity.HIGH') });
const SEVERITY_COLORS = { LOW: 'text-blue-400 bg-blue-500/10', MEDIUM: 'text-amber-400 bg-amber-500/10', HIGH: 'text-red-400 bg-red-500/10' };
const CAMERA_MANAGER_ROLES = ['SUPERADMIN', 'ADMIN', 'REGION_DIRECTOR', 'DISTRICT_DIRECTOR', 'DIRECTOR', 'MUDIR'];

function relTime(iso, t) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return t('common.relTime.justNow');
  if (diffMin < 60) return t('common.relTime.minutesAgo', { count: diffMin });
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return t('common.relTime.hoursAgo', { count: diffH });
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return t('common.relTime.daysAgo', { count: diffD });
  return d.toLocaleDateString('uz-UZ');
}

/** Boshqariladigan kamera: holatni tekshirish, RTSP manzil, oxirgi xato. */
function CameraDeviceInfo({ camera, t }) {
  const [check, setCheck] = useState(null);
  const [stream, setStream] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runCheck = async () => {
    setBusy(true); setError('');
    try { setCheck(await api.post(`/api/cameras/${camera.id}/check`, {})); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const loadStream = async () => {
    setError('');
    try { setStream(await api.get(`/api/cameras/${camera.id}/stream`)); } catch (e) { setError(e.message); }
  };

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span>{[camera.brand, camera.model].filter(Boolean).join(' ') || '—'}</span>
        {camera.serialNumber && <span className="font-mono text-slate-600">SN: {camera.serialNumber}</span>}
        <span className="text-slate-600">{t('cameras.device.lastSeen')}: {relTime(camera.lastSeen, t)}</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={runCheck} disabled={busy} className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">{busy ? '…' : t('cameras.device.checkBtn')}</button>
          <button onClick={loadStream} className="px-2.5 py-1 rounded-md bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]">{t('cameras.device.rtspBtn')}</button>
        </div>
      </div>
      {camera.lastError && !check && <p className="text-[11px] text-amber-400">{camera.lastError}</p>}
      {check && <p className="text-[11px] text-emerald-400">{t('cameras.device.checkOk', { model: check.model || '—' })}</p>}
      {stream && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-600">{t('cameras.device.rtspHint')}</p>
          <p className="text-[11px] font-mono text-slate-300 break-all select-all">{stream.lanRtspUrl}</p>
        </div>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

function CameraCard({ cam, onOpen, t }) {
  return (
    <div onClick={() => onOpen(cam)}
      style={{ boxSizing: 'border-box' }}
      className="relative w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-colors duration-300 p-4 cursor-pointer">
      <div style={{ aspectRatio: '16 / 9' }} className="relative w-full rounded-xl bg-white/[0.03] border border-white/[0.04] mb-3 flex items-center justify-center overflow-hidden">
        {cam.status === 'ONLINE' && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        <I d={CAM_ICON} c={`w-8 h-8 ${cam.status === 'ONLINE' ? 'text-emerald-500' : 'text-slate-500'}`} />
      </div>
      <div className="flex items-start justify-between gap-2 mb-2 w-full">
        <p className="text-[13px] font-semibold text-slate-200 truncate flex-1 min-w-0">{cam.name}</p>
        <span className="shrink-0"><SB status={cam.status} t={t} /></span>
      </div>
      <div className="flex items-center gap-1.5 w-full">
        <I d={ROOM_ICON} c="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-[11px] text-cyan-400 font-medium truncate flex-1 min-w-0">{cam.roomId ? `${cam.roomNumber} — ${cam.roomName}` : t('cameras.card.noRoom')}</span>
      </div>
      {cam.eventCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-purple-400">
          <I d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" c="w-3.5 h-3.5" />
          {t('cameras.card.eventCount', { count: cam.eventCount })}
        </div>
      )}
    </div>
  );
}

export default function Cameras({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const TYPE_LABELS = getTypeLabels(t);
  const SEVERITY_LABELS = getSeverityLabels(t);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selStatus, setSelStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailEvents, setDetailEvents] = useState([]);

  const [eventModal, setEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({});
  const [savingEvent, setSavingEvent] = useState(false);

  // silent=true — fon rejimida (30s'da bir) yangilanganda butun sahifani "yuklanmoqda"
  // holatiga qaytarmaslik uchun; faqat birinchi ochilishda spinner ko'rsatiladi.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/cameras');
      setCameras(Array.isArray(res) ? res : []);
      setError(null);
    } catch (e) {
      if (!silent) setError(e.message || t('cameras.loadError'));
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load(false);
    const i = setInterval(() => load(true), 30000);
    return () => clearInterval(i);
  }, [load]);

  const loadDetailEvents = async (cameraId) => {
    try {
      const evs = await api.get(`/api/cameras/${cameraId}/events`);
      setDetailEvents(Array.isArray(evs) ? evs.slice(0, 5) : []);
    } catch (e) { setDetailEvents([]); }
  };

  const openDetail = (cam) => { setDetail(cam); loadDetailEvents(cam.id); };

  const openLogEvent = () => {
    setEventForm({ type: 'MOTION', severity: 'LOW', description: '', occurredAt: new Date().toISOString().slice(0, 16) });
    setEventModal(true);
  };

  const saveEvent = async () => {
    setSavingEvent(true);
    try {
      await api.post(`/api/cameras/${detail.id}/events`, {
        ...eventForm,
        occurredAt: eventForm.occurredAt ? new Date(eventForm.occurredAt).toISOString() : undefined,
      });
      setEventModal(false);
      await loadDetailEvents(detail.id);
    } catch (e) { alert(e.message || t('cameras.eventModal.saveError')); }
    setSavingEvent(false);
  };

  const filtered = cameras.filter(c => {
    if (selStatus && c.status !== selStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(s) || (c.schoolName || '').toLowerCase().includes(s) || (c.roomName || '').toLowerCase().includes(s) || (c.roomNumber || '').toLowerCase().includes(s);
  });

  const stats = [
    [t('cameras.stats.total'), cameras.length, 'text-blue-400 bg-blue-500/10'],
    [t('cameras.stats.online'), cameras.filter(c => c.status === 'ONLINE').length, 'text-emerald-400 bg-emerald-500/10'],
    [t('cameras.stats.maintenance'), cameras.filter(c => c.status === 'MAINTENANCE').length, 'text-amber-400 bg-amber-500/10'],
    [t('cameras.stats.offline'), cameras.filter(c => c.status === 'OFFLINE').length, 'text-red-400 bg-red-500/10'],
  ];

  const selectCls = "mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors";

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">{t('cameras.title')}</h1><p className="text-sm text-slate-500 mt-1">{t('cameras.subtitle')}</p></div>
        {CAMERA_MANAGER_ROLES.includes(user?.role) && (
          <Link to="/settings" onClick={() => localStorage.setItem('settingsTab', 'cameras')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-slate-300 text-sm font-medium hover:bg-white/[0.04] transition-all">
            <I d={SETTINGS_ICON} c="w-4 h-4" />
            {t('cameras.manageInSettings')}
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          {error} — <button onClick={() => load(false)} className="underline">{t('common.retry')}</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([l, v, c], i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={selStatus} onChange={e => setSelStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
          <option value="">{t('cameras.filters.allStatuses')}</option>
          <option value="ONLINE">{t('cameras.status.ONLINE')}</option>
          <option value="MAINTENANCE">{t('cameras.status.MAINTENANCE')}</option>
          <option value="OFFLINE">{t('cameras.status.OFFLINE')}</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <I d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" c="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('cameras.searchPlaceholder')} className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none" />
        </div>
      </div>

      {!error && filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3"><I d={CAM_ICON} c="w-7 h-7 text-slate-600" /></div>
          <p className="text-slate-400 font-medium">{cameras.length === 0 ? t('cameras.empty.noneAdded') : t('cameras.empty.notFound')}</p>
          <p className="text-xs text-slate-600 mt-1">{cameras.length === 0 ? t('cameras.empty.addHint') : t('cameras.empty.filterHint')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', width: '100%' }}>
          {filtered.map(cam => <CameraCard key={cam.id} cam={cam} onOpen={openDetail} t={t} />)}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#0d1a14] border border-emerald-500/[0.12] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div>
                <h3 className="text-[15px] font-bold text-white">{detail.name}</h3>
                <p className="text-[11px] text-slate-500">{detail.schoolName}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05]"><I d="M6 18L18 6M6 6l12 12" c="w-5 h-5" /></button>
            </div>
            {detail.managed ? (
              <div className="m-6 space-y-3">
                <CameraSnapshot cameraId={detail.id} t={t} />
                <CameraDeviceInfo camera={detail} t={t} />
              </div>
            ) : (
              <div style={{ aspectRatio: '16 / 9' }} className="bg-gradient-to-br from-[#0d1a14] to-[#0a1410] flex flex-col items-center justify-center gap-3 m-6 rounded-xl border border-emerald-500/[0.08]">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <I d={CAM_ICON} c="w-7 h-7 text-emerald-500" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm text-slate-300 font-medium">{t('cameras.detail.liveStreamNotConnected')}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{t('cameras.device.notManagedHint')}</p>
                </div>
              </div>
            )}
            <div className="px-6 grid grid-cols-2 gap-3">
              {[[t('cameras.rooms.roomLabel'), detail.roomId ? `${detail.roomNumber} — ${detail.roomName}` : t('cameras.rooms.noRoom')], [t('cameras.detail.status'), <SB key="s" status={detail.status} t={t} />]].map(([l, v], i) => (
                <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">{l}</p>
                  <div className="text-sm font-semibold text-slate-200 mt-1">{v}</div>
                </div>
              ))}
            </div>

            <div className="px-6 mt-5 pt-5 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-200">{t('cameras.detail.eventsTitle')}</h4>
                <button onClick={openLogEvent} className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">{t('cameras.detail.logEventBtn')}</button>
              </div>
              {detailEvents.length === 0 ? (
                <p className="text-xs text-slate-600 py-4 text-center">{t('cameras.detail.noEvents')}</p>
              ) : (
                <div className="space-y-2">
                  {detailEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.LOW}`}>{SEVERITY_LABELS[ev.severity] || ev.severity}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-slate-300 truncate">{TYPE_LABELS[ev.type] || ev.type}{ev.description ? ` — ${ev.description}` : ''}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">{relTime(ev.occurredAt, t)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => navigate(`/camera-analysis?cameraId=${detail.id}`)} className="mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">{t('cameras.detail.viewAll')}</button>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Log event modal */}
      {eventModal && detail && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEventModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-5">{t('cameras.eventModal.title', { camera: detail.name })}</h3>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.eventModal.typeLabel')}</label>
              <select className={selectCls} value={eventForm.type || 'MOTION'} onChange={e => setEventForm({ ...eventForm, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.eventModal.severityLabel')}</label>
              <select className={selectCls} value={eventForm.severity || 'LOW'} onChange={e => setEventForm({ ...eventForm, severity: e.target.value })}>
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label={t('cameras.eventModal.occurredAtLabel')} type="datetime-local" value={eventForm.occurredAt || ''} onChange={e => setEventForm({ ...eventForm, occurredAt: e.target.value })} />
            <Input label={t('cameras.eventModal.descriptionLabel')} value={eventForm.description || ''} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder={t('cameras.eventModal.descriptionPlaceholder')} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEventModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>
              <button onClick={saveEvent} disabled={savingEvent} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50">{savingEvent ? t('common.saving') : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
