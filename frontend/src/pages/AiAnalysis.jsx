import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const getTypeLabels = (t) => ({
  MOTION: t('cameras.eventTypes.MOTION'),
  PERSON_DETECTED: t('cameras.eventTypes.PERSON_DETECTED'),
  CROWD: t('cameras.eventTypes.CROWD'),
  UNAUTHORIZED_ACCESS: t('cameras.eventTypes.UNAUTHORIZED_ACCESS'),
  EQUIPMENT_ISSUE: t('cameras.eventTypes.EQUIPMENT_ISSUE'),
  OTHER: t('cameras.eventTypes.OTHER'),
});

function Ring({ segments, size = 140, stroke = 16 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const frac = seg.value / total;
        const dash = frac * circ;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" className="transition-all duration-700" />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

function TrendBars({ data, t }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
          <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
            <div
              className={`w-full rounded-t-sm transition-all ${d.count > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-white/[0.04]'}`}
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%` }}
              title={t('aiAnalysis.trendTooltip', { date: d.date, count: d.count })}
            />
          </div>
          {data.length <= 14 && <span className="text-[8px] text-slate-600 whitespace-nowrap">{d.date.slice(5)}</span>}
        </div>
      ))}
    </div>
  );
}

export default function AiAnalysis() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const TYPE_LABELS = getTypeLabels(t);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/camera-events/stats?days=${d}`);
      setStats(res);
      setError(null);
    } catch (e) {
      setError(e.message || t('aiAnalysis.loadError'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(days); const i = setInterval(() => load(days), 60000); return () => clearInterval(i); }, [days, load]);

  if (loading && !stats) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-white">{t('aiAnalysis.title')}</h1><p className="text-sm text-slate-500 mt-1">{t('aiAnalysis.subtitle1')}</p></div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
          {error} — <button onClick={() => load(days)} className="underline">{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  const severitySegments = [
    { key: 'HIGH', value: stats?.bySeverity?.HIGH || 0, color: '#f87171', label: t('cameras.severity.HIGH') },
    { key: 'MEDIUM', value: stats?.bySeverity?.MEDIUM || 0, color: '#fbbf24', label: t('cameras.severity.MEDIUM') },
    { key: 'LOW', value: stats?.bySeverity?.LOW || 0, color: '#60a5fa', label: t('cameras.severity.LOW') },
  ];

  const topType = stats?.byType ? Object.entries(stats.byType).sort((a, b) => b[1] - a[1])[0] : null;

  if (!stats || stats.totalEvents === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-white">{t('aiAnalysis.title')}</h1><p className="text-sm text-slate-500 mt-1">{t('aiAnalysis.subtitle2')}</p></div>
        <div className="flex flex-col items-center py-20 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
            <I d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" c="w-7 h-7 text-purple-400" />
          </div>
          <p className="text-slate-300 font-medium">{t('aiAnalysis.emptyState.title')}</p>
          <p className="text-xs text-slate-600 mt-1.5 text-center max-w-sm">{t('aiAnalysis.emptyState.desc')}</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => navigate('/cameras')} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all">{t('aiAnalysis.emptyState.addCameraBtn')}</button>
            <button onClick={() => navigate('/camera-analysis')} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.06] transition-all">{t('aiAnalysis.emptyState.logEventBtn')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('aiAnalysis.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('aiAnalysis.subtitle2')}</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
          <option value={7}>{t('aiAnalysis.periodOptions.days7')}</option>
          <option value={30}>{t('aiAnalysis.periodOptions.days30')}</option>
          <option value={90}>{t('aiAnalysis.periodOptions.days90')}</option>
        </select>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-purple-500/[0.06] to-transparent border border-purple-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-400">
            <I d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" c="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-white">{t('aiAnalysis.summaryCard.title')}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('aiAnalysis.summaryCard.desc')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [t('aiAnalysis.stats.total'), stats.totalEvents, 'text-purple-400 bg-purple-500/10'],
          [t('aiAnalysis.stats.unresolved'), stats.unresolvedCount, 'text-red-400 bg-red-500/10'],
          [t('aiAnalysis.stats.topType'), topType ? TYPE_LABELS[topType[0]] || topType[0] : '—', 'text-blue-400 bg-blue-500/10', true],
          [t('aiAnalysis.stats.resolvedRatio'), stats.totalEvents ? `${Math.round(((stats.totalEvents - stats.unresolvedCount) / stats.totalEvents) * 100)}%` : '0%', 'text-emerald-400 bg-emerald-500/10'],
        ].map(([l, v, c, small], i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
            <p className={`${small ? 'text-sm' : 'text-2xl'} font-bold mt-1 ${c.split(' ')[0]} truncate`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-5">{t('aiAnalysis.severityDistTitle')}</h3>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <Ring segments={severitySegments} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{stats.totalEvents}</span>
                <span className="text-[8px] text-slate-600 uppercase">{t('aiAnalysis.totalLabel')}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {severitySegments.map(seg => (
                <div key={seg.key} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} />{seg.label}</span>
                  <span className="font-semibold text-slate-200">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-5">{t('aiAnalysis.typeDistTitle')}</h3>
          <div className="space-y-3">
            {Object.entries(stats.byType || {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const max = Math.max(...Object.values(stats.byType || { x: 1 }), 1);
              return (
                <div key={type}>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">{TYPE_LABELS[type] || type}</span><span className="text-slate-600">{count}</span></div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400" style={{ width: `${Math.max((count / max) * 100, count > 0 ? 3 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-5">{t('aiAnalysis.dailyTrendTitle', { days })}</h3>
        <TrendBars data={stats.dailyTrend || []} t={t} />
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-200">{t('aiAnalysis.topCamerasTitle')}</h3>
        </div>
        {(!stats.topCameras || stats.topCameras.length === 0) ? (
          <div className="text-center py-10 text-sm text-slate-600">{t('aiAnalysis.topCamerasEmpty')}</div>
        ) : (
          <div className="divide-y divide-white/[0.02]">
            {stats.topCameras.map((tc, i) => (
              <div key={tc.cameraId} className="flex items-center gap-4 px-6 py-3.5">
                <span className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">{i + 1}</span>
                <span className="flex-1 text-[13px] text-slate-300 truncate">{tc.cameraName}</span>
                <span className="text-[13px] font-semibold text-purple-400">{t('aiAnalysis.eventsSuffix', { count: tc.count })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
