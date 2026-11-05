import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const MOCK = [
  { day: 'Du', active: 34, offline: 6 },
  { day: 'Se', active: 36, offline: 4 },
  { day: 'Ch', active: 38, offline: 2 },
  { day: 'Pa', active: 35, offline: 5 },
  { day: 'Ju', active: 39, offline: 1 },
  { day: 'Sh', active: 40, offline: 0 },
  { day: 'Ya', active: 32, offline: 8 },
];

const MOCK_EVENTS = [
  { id: 1, camera: 'Kirish eshigi', school: 'Andijon shahar 1-maktab', time: '08:42', type: 'MOTION', level: 'INFO', desc: 'Harakat aniqlandi' },
  { id: 2, camera: '1-qavat koridor', school: 'Andijon shahar 1-maktab', time: '10:15', type: 'LOW_LIGHT', level: 'WARNING', desc: 'Yorug\'lik past' },
  { id: 3, camera: 'Kirish eshigi', school: 'Andijon tuman 2-maktab', time: '12:03', type: 'SIGNAL', level: 'ERROR', desc: 'Signal uzilgan' },
  { id: 4, camera: 'Sport zali', school: 'Andijon shahar 1-maktab', time: '13:27', type: 'RECORDING', level: 'SUCCESS', desc: 'Yozuv boshlandi' },
  { id: 5, camera: '2-qavat koridor', school: 'Andijon shahar 1-maktab', time: '15:44', type: 'MOTION', level: 'INFO', desc: 'Harakat aniqlandi' },
];

const levelColors = { INFO: 'text-blue-400 bg-blue-500/10', SUCCESS: 'text-emerald-400 bg-emerald-500/10', WARNING: 'text-amber-400 bg-amber-500/10', ERROR: 'text-red-400 bg-red-500/10' };

export default function CameraAnalysis() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7');

  const load = useCallback(async () => {
    try {
      let data = MOCK_EVENTS;
      try {
        const res = await api.get('/api/cameras/analysis/events');
        if (Array.isArray(res) && res.length) data = res;
      } catch (e) {}
      setEvents(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const total = MOCK.reduce((s, d) => s + d.active, 0);
  const offline = MOCK.reduce((s, d) => s + d.offline, 0);
  const uptime = Math.round((total / (total + offline)) * 100);
  const max = Math.max(...MOCK.map(d => d.active + d.offline));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Kamera tahlili</h1><p className="text-sm text-slate-500 mt-1">Kuzatuv kameralarining ishlash statistikasi</p></div>
        <select value={range} onChange={e => setRange(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
          <option value="7">Oxirgi 7 kun</option>
          <option value="30">Oxirgi 30 kun</option>
          <option value="90">Oxirgi 90 kun</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Umumiy ishlash', `${uptime}%`, 'text-emerald-400 bg-emerald-500/10'],
          ['Faol soatlar', total, 'text-blue-400 bg-blue-500/10'],
          ['Oflayn holatlar', offline, 'text-red-400 bg-red-500/10'],
          ['Yozilgan voqealar', events.length, 'text-purple-400 bg-purple-500/10'],
        ].map(([l, v, c], i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-5">Haftalik faollik</h3>
        <div className="flex items-end justify-between gap-3 h-48">
          {MOCK.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col justify-end items-center gap-1" style={{ height: '150px' }}>
                <div className="w-full max-w-[28px] rounded-t-md bg-red-500/40 transition-all" style={{ height: `${(d.offline / max) * 100}%` }} />
                <div className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all" style={{ height: `${(d.active / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-600">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04] text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" /> Faol</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40" /> Oflayn</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[['Kamera holati', [
          ['Onlayn', 90, 'bg-emerald-500'],
          ['Yozuv', 80, 'bg-cyan-500'],
          ['Oflayn', 10, 'bg-red-500'],
          ['Signal xatosi', 5, 'bg-amber-500'],
        ]], ['Ruxsat (Resolution)', [
          ['4K', 25, 'bg-purple-500'],
          ['1080p', 60, 'bg-blue-500'],
          ['720p', 15, 'bg-slate-500'],
        ]]].map(([title, rows], i) => (
          <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-5">{title}</h3>
            <div className="space-y-4">
              {rows.map(([label, pct, color]) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-1.5"><span className="text-slate-400">{label}</span><span className="text-slate-600">{pct}%</span></div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-200">Yaqin voqealar</h3>
          <span className="text-[11px] text-slate-600">Oxirgi {events.length} ta</span>
        </div>
        <div className="divide-y divide-white/[0.02]">
          {events.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-600">Voqealar topilmadi</div>
          ) : events.map(ev => (
            <div key={ev.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
              <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${levelColors[ev.level] || levelColors.INFO}`}>{ev.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-slate-300 truncate">{ev.camera} — <span className="text-slate-500">{ev.desc}</span></p>
                <p className="text-[11px] text-slate-600 truncate">{ev.school}</p>
              </div>
              <span className="text-[11px] text-slate-600 font-mono">{ev.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
