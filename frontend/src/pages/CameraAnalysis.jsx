import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const getTypeLabels = (t) => ({
  MOTION: t('cameras.eventTypes.MOTION'),
  PERSON_DETECTED: t('cameras.eventTypes.PERSON_DETECTED'),
  CROWD: t('cameras.eventTypes.CROWD'),
  UNAUTHORIZED_ACCESS: t('cameras.eventTypes.UNAUTHORIZED_ACCESS'),
  EQUIPMENT_ISSUE: t('cameras.eventTypes.EQUIPMENT_ISSUE'),
  OTHER: t('cameras.eventTypes.OTHER'),
});

const getSeverityLabels = (t) => ({ LOW: t('cameras.severity.LOW'), MEDIUM: t('cameras.severity.MEDIUM'), HIGH: t('cameras.severity.HIGH') });
const SEVERITY_COLORS = {
  LOW: 'border-l-blue-400 text-blue-400 bg-blue-500/10',
  MEDIUM: 'border-l-amber-400 text-amber-400 bg-amber-500/10',
  HIGH: 'border-l-red-400 text-red-400 bg-red-500/10',
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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
  return fmtDateTime(iso);
}

const selectCls = "px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none";

export default function CameraAnalysis() {
  const { t } = useTranslation();
  const TYPE_LABELS = getTypeLabels(t);
  const SEVERITY_LABELS = getSeverityLabels(t);
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fType, setFType] = useState('');
  const [fSeverity, setFSeverity] = useState('');
  const [fCamera, setFCamera] = useState(searchParams.get('cameraId') || '');
  const [fResolved, setFResolved] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/cameras').then(setCameras).catch(() => setCameras([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fType) params.set('type', fType);
      if (fSeverity) params.set('severity', fSeverity);
      if (fCamera) params.set('cameraId', fCamera);
      if (fResolved) params.set('resolved', fResolved);
      if (fFrom) params.set('from', new Date(fFrom).toISOString());
      if (fTo) params.set('to', new Date(fTo).toISOString());
      const qs = params.toString();
      const res = await api.get(`/api/camera-events${qs ? `?${qs}` : ''}`);
      setEvents(Array.isArray(res) ? res : []);
      setError(null);
    } catch (e) {
      setError(e.message || t('cameraAnalysis.loadError'));
    }
    setLoading(false);
  }, [fType, fSeverity, fCamera, fResolved, fFrom, fTo]);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const toggleResolved = async (ev) => {
    // Optimistic — darhol UI'da almashtiramiz, so'ng serverga yuboramiz.
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, resolved: !e.resolved } : e));
    try {
      await api.patch(`/api/camera-events/${ev.id}`, { resolved: !ev.resolved });
    } catch (e2) {
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, resolved: ev.resolved } : e));
      alert(e2.message || t('cameraAnalysis.toggleError'));
    }
  };

  const openAdd = () => {
    setForm({ cameraId: fCamera || (cameras[0]?.id || ''), type: 'MOTION', severity: 'LOW', description: '', occurredAt: new Date().toISOString().slice(0, 16) });
    setModal(true);
  };

  const save = async () => {
    if (!form.cameraId) { alert(t('cameraAnalysis.modal.selectCameraRequired')); return; }
    setSaving(true);
    try {
      await api.post(`/api/cameras/${form.cameraId}/events`, {
        type: form.type, severity: form.severity, description: form.description,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
      });
      setModal(false);
      await load();
    } catch (e) { alert(e.message || t('cameraAnalysis.modal.saveError')); }
    setSaving(false);
  };

  const unresolvedCount = events.filter(e => !e.resolved).length;

  if (loading && events.length === 0) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">{t('cameraAnalysis.title')}</h1><p className="text-sm text-slate-500 mt-1">{t('cameraAnalysis.subtitle')}</p></div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all">{t('cameraAnalysis.addBtn')}</button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          {error} — <button onClick={load} className="underline">{t('common.retry')}</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [t('cameraAnalysis.stats.total'), events.length, 'text-blue-400 bg-blue-500/10'],
          [t('cameraAnalysis.stats.unresolved'), unresolvedCount, 'text-red-400 bg-red-500/10'],
          [t('cameraAnalysis.stats.resolved'), events.length - unresolvedCount, 'text-emerald-400 bg-emerald-500/10'],
          [t('cameraAnalysis.stats.highRisk'), events.filter(e => e.severity === 'HIGH').length, 'text-amber-400 bg-amber-500/10'],
        ].map(([l, v, c], i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={fCamera} onChange={e => { setFCamera(e.target.value); setSearchParams(e.target.value ? { cameraId: e.target.value } : {}); }} className={selectCls}>
          <option value="">{t('cameraAnalysis.filters.allCameras')}</option>
          {cameras.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schoolName})</option>)}
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)} className={selectCls}>
          <option value="">{t('cameraAnalysis.filters.allTypes')}</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={fSeverity} onChange={e => setFSeverity(e.target.value)} className={selectCls}>
          <option value="">{t('cameraAnalysis.filters.allLevels')}</option>
          {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={fResolved} onChange={e => setFResolved(e.target.value)} className={selectCls}>
          <option value="">{t('cameraAnalysis.filters.allStatuses')}</option>
          <option value="false">{t('cameraAnalysis.filters.unresolved')}</option>
          <option value="true">{t('cameraAnalysis.filters.resolved')}</option>
        </select>
        <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} className={selectCls} />
        <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} className={selectCls} />
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
        {events.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
              <I d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" c="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">{t('cameraAnalysis.empty.title')}</p>
            <p className="text-xs text-slate-600 mt-1">{t('cameraAnalysis.empty.hint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.02]">
            {events.map(ev => (
              <div key={ev.id} className={`flex items-center gap-4 px-5 py-3.5 border-l-2 hover:bg-white/[0.02] transition-colors ${(SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.LOW).split(' ')[0]}`}>
                <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.LOW}`}>{SEVERITY_LABELS[ev.severity] || ev.severity}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-300 truncate">{TYPE_LABELS[ev.type] || ev.type}{ev.description ? <span className="text-slate-500"> — {ev.description}</span> : null}</p>
                  <p className="text-[11px] text-slate-600 truncate">{ev.cameraName} · {ev.schoolName}{ev.reportedByName ? ` · ${t('cameraAnalysis.reportedBySuffix', { name: ev.reportedByName })}` : ''}</p>
                </div>
                <span className="text-[11px] text-slate-600 font-mono shrink-0" title={fmtDateTime(ev.occurredAt)}>{relTime(ev.occurredAt, t)}</span>
                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                  <input type="checkbox" checked={!!ev.resolved} onChange={() => toggleResolved(ev)} className="w-3.5 h-3.5 rounded accent-emerald-500" />
                  <span className={`text-[10px] ${ev.resolved ? 'text-emerald-400' : 'text-slate-600'}`}>{ev.resolved ? t('cameraAnalysis.resolvedLabel') : t('cameraAnalysis.unresolvedLabel')}</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-5">{t('cameraAnalysis.modal.title')}</h3>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameraAnalysis.modal.cameraLabel')}</label>
              <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" value={form.cameraId || ''} onChange={e => setForm({ ...form, cameraId: e.target.value })}>
                <option value="">{t('common.selectDots')}</option>
                {cameras.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schoolName})</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameraAnalysis.modal.typeLabel')}</label>
              <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" value={form.type || 'MOTION'} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameraAnalysis.modal.severityLabel')}</label>
              <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" value={form.severity || 'LOW'} onChange={e => setForm({ ...form, severity: e.target.value })}>
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Input label={t('cameras.eventModal.occurredAtLabel')} type="datetime-local" value={form.occurredAt || ''} onChange={e => setForm({ ...form, occurredAt: e.target.value })} />
            <Input label={t('cameras.eventModal.descriptionLabel')} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('cameras.eventModal.descriptionPlaceholder')} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>
              <button onClick={save} disabled={saving} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50">{saving ? t('common.saving') : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
