import React, { useState, useEffect } from 'react';

function MiniChart({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div key={i} className={`w-[6px] rounded-sm bar-animate ${color}`}
          style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 0.08}s`, opacity: i === data.length - 1 ? 1 : 0.5 + (i / data.length) * 0.5 }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon, gradient, chartData, chartColor }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-5 hover:border-emerald-500/20 transition-all duration-300">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-3">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-600 mt-1.5">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${icon.bg}`}>
            <svg className={`w-5 h-5 ${icon.color}`} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon.d} />
            </svg>
          </div>
          {chartData && <MiniChart data={chartData} color={chartColor} />}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ percent, label, color }) {
  const deg = (percent / 100) * 360;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="donut flex items-center justify-center" style={{ background: `conic-gradient(${color} ${deg}deg, rgba(100,116,139,0.1) ${deg}deg)` }}>
        <span className="relative z-10 text-xl font-bold text-white">{percent}%</span>
      </div>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function Action({ label, icon, gradient }) {
  return (
    <button className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <span className="relative text-[11px] font-medium text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
    </button>
  );
}

function StatusDot({ online }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
    </span>
  );
}

export default function Dashboard({ user }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const greeting = () => { const h = time.getHours(); return h < 12 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech'; };
  const fmt = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  const roleSubtitle = {
    SUPERADMIN: 'Barcha viloyatlar boshqaruvi',
    ADMIN: user?.provinceName || 'Viloyat boshqaruvi',
    DIRECTOR: user?.schoolName || 'Maktab boshqaruvi',
    MUDIR: user?.schoolName || "O'quv ishlari",
    TEACHER: user?.schoolName || "O'qituvchi",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 via-[#0d1a14] to-teal-600/10 border border-emerald-500/[0.12] p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{greeting()}</p>
            <h1 className="text-2xl font-bold text-white mt-1">{user?.fullName}</h1>
            <p className="text-emerald-400/60 text-xs mt-1 font-medium">{roleSubtitle[user?.role]}</p>
            <p className="text-slate-500 text-sm mt-1 capitalize">{fmtDate(time)}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-white tabular-nums tracking-tight font-mono">{fmt(time)}</p>
            <div className="flex items-center justify-end gap-1.5 mt-2">
              <StatusDot online={true} />
              <span className="text-[11px] text-emerald-400/80 font-medium">Tizim faol</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="JAMI O'QUVCHILAR" value="0" sub="14 viloyat bo'ylab" gradient="bg-emerald-500/20"
          icon={{ bg: 'bg-emerald-500/10', color: 'text-emerald-400', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }}
          chartData={[30, 45, 38, 52, 48, 60, 55]} chartColor="bg-emerald-400" />
        <StatCard label="BUGUN KELGAN" value="0" sub="0% davomat" gradient="bg-teal-500/20"
          icon={{ bg: 'bg-teal-500/10', color: 'text-teal-400', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }}
          chartData={[65, 78, 82, 71, 89, 92, 0]} chartColor="bg-teal-400" />
        <StatCard label="KELMAGAN" value="0" sub="Sababsiz: 0" gradient="bg-red-500/20"
          icon={{ bg: 'bg-red-500/10', color: 'text-red-400', d: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }}
          chartData={[12, 8, 5, 14, 6, 3, 0]} chartColor="bg-red-400" />
        <StatCard label="MAKTABLAR" value="0" sub="14 viloyat" gradient="bg-cyan-500/20"
          icon={{ bg: 'bg-cyan-500/10', color: 'text-cyan-400', d: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' }}
          chartData={[2, 5, 8, 12, 15, 14, 14]} chartColor="bg-cyan-400" />
      </div>

      {/* Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Donut */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-6">
          <h3 className="text-sm font-semibold text-white mb-6">Davomat ko'rsatkichi</h3>
          <div className="flex justify-center gap-8">
            <DonutChart percent={0} label="Bugun" color="#10b981" />
            <DonutChart percent={0} label="Haftalik" color="#14b8a6" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { l: 'Kelgan', v: '0', bg: 'bg-emerald-500/10', t: 'text-emerald-400' },
              { l: 'Kelmagan', v: '0', bg: 'bg-red-500/10', t: 'text-red-400' },
              { l: 'Kechikkan', v: '0', bg: 'bg-amber-500/10', t: 'text-amber-400' },
            ].map(({ l, v, bg, t }) => (
              <div key={l} className={`text-center py-2.5 rounded-xl ${bg}`}>
                <p className={`text-lg font-bold ${t}`}>{v}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Oxirgi voqealar</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-medium text-emerald-400">LIVE</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.06] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">Voqealar yo'q</p>
            <p className="text-xs text-slate-700 mt-1">Face ID qurilma ulangach ko'rinadi</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Tezkor amallar</h3>
          <div className="grid grid-cols-2 gap-3">
            <Action label="O'quvchi" icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" gradient="bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <Action label="Sinxron" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" gradient="bg-gradient-to-br from-teal-500/5 to-transparent" />
            <Action label="Hisobot" icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" gradient="bg-gradient-to-br from-cyan-500/5 to-transparent" />
            <Action label="Sozlama" icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" gradient="bg-gradient-to-br from-amber-500/5 to-transparent" />
          </div>
          <div className="mt-4 p-3 rounded-xl border border-emerald-500/[0.06] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot online={false} />
                <span className="text-xs text-slate-500">Qurilmalar</span>
              </div>
              <span className="text-xs font-mono text-slate-600">0 / 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
