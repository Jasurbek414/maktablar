import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const SB = ({ status }) => {
  const c = { ONLINE: ['Onlayn', 'text-emerald-400', 'bg-emerald-500/10', 'bg-emerald-400'], OFFLINE: ['Oflayn', 'text-red-400', 'bg-red-500/10', 'bg-red-400'], RECORDING: ['Yozuv', 'text-blue-400', 'bg-blue-500/10', 'bg-blue-400'] }[status] || ['?', 'text-slate-400', 'bg-slate-500/10', 'bg-slate-400'];
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c[2]} ${c[1]}`}><span className={`w-1.5 h-1.5 rounded-full ${c[3]} ${status === 'ONLINE' ? 'animate-pulse' : ''}`} />{c[0]}</span>;
};

const MOCK = [
  { id: 1, name: '1-qavat koridor', schoolName: 'Andijon shahar 1-maktab', status: 'RECORDING', ip: '192.168.1.21', resolution: '1080p', uptime: '12.5', storage: 68 },
  { id: 2, name: 'Kirish eshigi', schoolName: 'Andijon shahar 1-maktab', status: 'ONLINE', ip: '192.168.1.22', resolution: '4K', uptime: '8.2', storage: 41 },
  { id: 3, name: '2-qavat koridor', schoolName: 'Andijon shahar 1-maktab', status: 'ONLINE', ip: '192.168.1.23', resolution: '1080p', uptime: '3.7', storage: 92 },
  { id: 4, name: 'Sport zali', schoolName: 'Andijon shahar 1-maktab', status: 'OFFLINE', ip: '192.168.1.24', resolution: '720p', uptime: '0', storage: 55 },
  { id: 5, name: 'Kirish eshigi', schoolName: 'Andijon tuman 2-maktab', status: 'RECORDING', ip: '192.168.2.15', resolution: '1080p', uptime: '24.1', storage: 77 },
  { id: 6, name: 'Oshxona', schoolName: 'Andijon tuman 2-maktab', status: 'ONLINE', ip: '192.168.2.16', resolution: '720p', uptime: '5.9', storage: 33 },
];

export default function Cameras({ user }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selStatus, setSelStatus] = useState('');
  const [detail, setDetail] = useState(null);

  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      let data = MOCK;
      try {
        const res = await api.get('/api/cameras');
        if (Array.isArray(res) && res.length) data = res;
      } catch (e) {}
      setCameras(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const filtered = cameras.filter(c => {
    if (selStatus && c.status !== selStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(s) || (c.schoolName || '').toLowerCase().includes(s) || (c.ip || '').includes(s);
  });

  const stats = [
    ['Jami kameralar', cameras.length, 'text-blue-400 bg-blue-500/10'],
    ['Onlayn', cameras.filter(c => c.status === 'ONLINE' || c.status === 'RECORDING').length, 'text-emerald-400 bg-emerald-500/10'],
    ['Yozuv olmoqda', cameras.filter(c => c.status === 'RECORDING').length, 'text-cyan-400 bg-cyan-500/10'],
    ['Oflayn', cameras.filter(c => c.status === 'OFFLINE').length, 'text-red-400 bg-red-500/10'],
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Kameralar</h1><p className="text-sm text-slate-500 mt-1">Maktablardagi video kuzatuv kameralari monitoringi</p></div>
        {isAdmin && (
          <button className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all">+ Kamera qo'shish</button>
        )}
      </div>

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
          <option value="">Barcha holatlar</option>
          <option value="ONLINE">Onlayn</option>
          <option value="RECORDING">Yozuv olmoqda</option>
          <option value="OFFLINE">Oflayn</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <I d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" c="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3"><I d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" c="w-7 h-7 text-slate-600" /></div>
          <p className="text-slate-400 font-medium">Kameralar topilmadi</p>
          <p className="text-xs text-slate-600 mt-1">Kamera qo'shilganda bu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(cam => (
            <div key={cam.id} onClick={() => setDetail(cam)}
              className={`group rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-lg ${cam.status === 'OFFLINE' ? 'bg-white/[0.01] border-white/[0.06] hover:border-white/[0.12]' : 'bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/10 hover:border-emerald-500/25'}`}>
              <div className="aspect-video rounded-xl bg-black/50 border border-white/[0.04] mb-4 flex items-center justify-center overflow-hidden">
                {cam.status !== 'OFFLINE' ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <I d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" c="w-8 h-8 text-slate-700" />
                    <span className="text-[10px] text-slate-600">{cam.name}</span>
                  </div>
                ) : (
                  <I d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" c="w-8 h-8 text-slate-800" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-200 truncate">{cam.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{cam.schoolName}</p>
                </div>
                <SB status={cam.status} />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04] text-[10px] text-slate-600">
                <span className="font-mono">{cam.ip}</span>
                <span>{cam.resolution} • {cam.uptime}h</span>
              </div>
              {cam.status === 'RECORDING' && (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] text-slate-600 mb-1"><span>Xotira</span><span>{cam.storage}%</span></div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${cam.storage > 80 ? 'bg-red-500' : 'bg-cyan-400'}`} style={{ width: `${cam.storage}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-gradient-to-b from-[#131d17] to-[#0d140f] border border-emerald-500/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div>
                <h3 className="text-[15px] font-bold text-white">{detail.name}</h3>
                <p className="text-[11px] text-slate-500">{detail.schoolName}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05]"><I d="M6 18L18 6M6 6l12 12" c="w-5 h-5" /></button>
            </div>
            <div className="aspect-video bg-black/60 flex items-center justify-center m-6 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col items-center gap-2 text-slate-700">
                <I d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" c="w-12 h-12" />
                <p className="text-xs">Jonli tasvir stream platformasiga ulanmagan</p>
              </div>
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              {[['IP manzil', detail.ip], ['Ruxsat', detail.resolution], ['Ishlab turgan', `${detail.uptime} soat`], ['Xotira', `${detail.storage}%`]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">{l}</p>
                  <p className="text-sm font-semibold text-slate-200 mt-1 font-mono">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
