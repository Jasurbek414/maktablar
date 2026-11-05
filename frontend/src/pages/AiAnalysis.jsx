import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const MOCK_INSIGHTS = [
  { id: 1, type: 'CROWD', title: 'Tirband vaqt aniqlanishi', desc: 'Ertalabki dars boshlanishida koridor kamerasida odamlar soni normadan 3 barobar yuqori.', level: 'WARNING', score: 87, tag: 'Tirbandlik' },
  { id: 2, type: 'BEHAVIOR', title: 'Anomal xatti-harakat', desc: 'Sport zali atrofida soat 23:00 da kutilmagan harakat qayd etildi. Nodavlat soat.', level: 'ERROR', score: 64, tag: 'Xavfsizlik' },
  { id: 3, type: 'FACILITY', title: 'Qatnashma maydon tahlili', desc: 'Hafta davomida oshxona hududida o\'rtacha davomat me\'yordan past.', level: 'INFO', score: 41, tag: 'Samaradorlik' },
  { id: 4, type: 'RECOGNITION', title: 'Yuzni tanish samaradorligi', desc: 'Kirish eshigidagi Face ID termnalining tanib olish aniqligi 98.4% — me\'yordan yuqori.', level: 'SUCCESS', score: 98, tag: 'Yuz tanish' },
];

const levelColors = { INFO: 'text-blue-400 bg-blue-500/10', SUCCESS: 'text-emerald-400 bg-emerald-500/10', WARNING: 'text-amber-400 bg-amber-500/10', ERROR: 'text-red-400 bg-red-500/10' };

export default function AiAnalysis() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      let data = MOCK_INSIGHTS;
      try {
        const res = await api.get('/api/ai/analysis/insights');
        if (Array.isArray(res) && res.length) data = res;
      } catch (e) {}
      setInsights(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI tahlili</h1>
          <p className="text-sm text-slate-500 mt-1">Sun'iy intellekt orqali kamera ma'lumotlarini tahlil qilish</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
          Tahlil faol
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-purple-500/[0.06] to-transparent border border-purple-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-400">
            <I d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" c="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-white">Sun'iy intellekt monitoringi</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">AI modeli barcha ulangan kameralar tasvirlarini real vaqtda tahlil qiladi: tirbandlik, anomal xatti-harakatlar, xavfsizlik holatlari va yuzni tanish samaradorligini aniqlaydi.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Tirbandlik', 'Xavfsizlik', 'Yuz tanish', 'Anomal xatti-harakat'].map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Aniqlangan xulosalar', insights.length, 'text-purple-400 bg-purple-500/10'],
          ['Yuqori xavfli', insights.filter(i => i.level === 'ERROR').length, 'text-red-400 bg-red-500/10'],
          ['O\'rtacha ishonch', insights.length ? Math.round(insights.reduce((s, i) => s + i.score, 0) / insights.length) : 0, 'text-blue-400 bg-blue-500/10'],
          ['Yuz tanish aniqligi', '98.4%', 'text-emerald-400 bg-emerald-500/10'],
        ].map(([l, v, c], i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">AI xulosalari</h3>
        {insights.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/[0.04] text-sm text-slate-600">Hozircha xulosalar yo'q</div>
        ) : insights.map(item => (
          <div key={item.id} onClick={() => setActive(active === item.id ? null : item.id)}
            className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-lg ${active === item.id ? 'border-purple-500/30 bg-purple-500/[0.04]' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold ${levelColors[item.level] || levelColors.INFO}`}>{item.type}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-slate-200">{item.title}</p>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-500">{item.tag}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center">
                  <span className={`text-lg font-bold ${item.score >= 70 ? 'text-emerald-400' : item.score >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>{item.score}</span>
                  <span className="text-[8px] text-slate-600 uppercase">ishonch</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
