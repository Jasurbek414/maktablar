import React, { useState, useEffect } from 'react';

// ── Stat Card ──
function StatCard({ label, value, change, up, icon, color }) {
  const colors = {
    blue: 'bg-brand-600/10 text-brand-400',
    green: 'bg-emerald-600/10 text-emerald-400',
    red: 'bg-red-600/10 text-red-400',
    amber: 'bg-amber-600/10 text-amber-400',
    violet: 'bg-violet-600/10 text-violet-400',
    cyan: 'bg-cyan-600/10 text-cyan-400',
  };

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 hover:border-slate-700/60 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '↑' : '↓'} {change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

// ── Activity Row ──
function ActivityRow({ name, action, time, type }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800/40 last:border-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${type === 'IN' ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{name}</p>
        <p className="text-xs text-slate-500">{action}</p>
      </div>
      <span className="text-xs text-slate-600 shrink-0">{time}</span>
    </div>
  );
}

// ── Quick Action ──
function QuickAction({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-700/60 transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-brand-400 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors">{label}</span>
    </button>
  );
}

// ── Main Dashboard ──
export default function Dashboard({ user }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Xayrli tong';
    if (h < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  const formatTime = (d) => d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {greeting()}, <span className="text-brand-400">{user?.fullName?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{formatDate(time)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{formatTime(time)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Toshkent vaqti</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jami o'quvchilar"
          value="0"
          color="blue"
          icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
        <StatCard
          label="Bugun kelgan"
          value="0"
          change={0}
          up={true}
          color="green"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          label="Kelmagan"
          value="0"
          color="red"
          icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          label="Davomat foizi"
          value="0%"
          color="amber"
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </div>

      {/* SUPERADMIN Extra Stats */}
      {user?.role === 'SUPERADMIN' && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Viloyatlar" value="14" color="violet" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          <StatCard label="Maktablar" value="0" color="cyan" icon="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <StatCard label="Qurilmalar" value="0" color="blue" icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </div>
      )}

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Oxirgi voqealar</h2>
            <span className="text-xs text-slate-600">Real vaqt</span>
          </div>
          <div className="space-y-0">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Hozircha voqealar yo'q</p>
              <p className="text-xs text-slate-600 mt-1">Face ID qurilma ulangach ko'rinadi</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/60 bg-slate-900/40 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Tezkor amallar</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              label="O'quvchi qo'shish"
              icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
            <QuickAction
              label="Sinxronizatsiya"
              icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
            <QuickAction
              label="Hisobot"
              icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
            <QuickAction
              label="Sozlamalar"
              icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
