import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

// --- Icons ---
const ICONS = {
  prov: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  school: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
};

// --- Custom Charts & UI ---
const BackBtn = ({ onClick }) => (
  <button onClick={onClick} className="w-10 h-10 rounded-full bg-white/[0.03] border border-emerald-500/[0.1] flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
  </button>
);

const Loader = () => (
  <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
);

const PremiumDonut = ({ pct = 0, size = 110, stroke = 10, color = '#10b981', label, value }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/[0.05]" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value !== undefined ? (
          <>
            <span className="text-xl font-bold text-white leading-none">{value}</span>
            <span className="text-[10px] text-slate-500 uppercase mt-1">{label}</span>
          </>
        ) : (
          <span className="text-xl font-bold text-white">{pct}%</span>
        )}
      </div>
    </div>
  );
};

const MiniBarChart = ({ data = [], color = 'bg-emerald-400', height = 'h-16' }) => (
  <div className={`flex items-end gap-1 ${height} w-full`}>
    {data.map((v, i) => (
      <div key={i} className="flex-1 flex flex-col items-center group relative">
        <div className={`w-full rounded-t-sm ${color} transition-all duration-700 hover:brightness-125 opacity-80 group-hover:opacity-100`} style={{ height: `${Math.max(4, v)}%` }} />
      </div>
    ))}
  </div>
);

const ProgressBar = ({ label, value, max, color = 'bg-emerald-400' }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-white">{value.toLocaleString()} <span className="text-slate-600 font-normal text-[10px]">/ {max.toLocaleString()}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Top Analytics Dashboard
const GlobalDashboard = ({ title, subtitle, cards, donut, bars, progresses }) => (
  <div className="mb-6 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.1] shadow-[0_0_40px_rgba(16,185,129,0.03)] p-6 overflow-hidden relative">
    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
    
    <div className="flex items-center justify-between mb-6 relative z-10 border-b border-emerald-500/[0.05] pb-4">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Stats
      </div>
    </div>

    <div className="flex flex-col lg:flex-row gap-8 relative z-10">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-emerald-500/[0.05] p-4 relative group hover:bg-white/[0.04] transition-colors">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full ${c.glowColor || 'bg-emerald-500/10'} blur-2xl -translate-y-4 translate-x-4 opacity-50 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.05] ${c.iconColor}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{c.label}</span>
            </div>
            <p className={`text-2xl font-black ${c.textColor || 'text-white'}`}>{c.value.toLocaleString()}</p>
            {c.sub && <p className="text-[10px] text-slate-500 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      {(donut || bars || progresses) && (
        <div className="flex flex-col sm:flex-row items-center gap-6 lg:w-[400px] shrink-0 p-4 rounded-xl bg-black/20 border border-emerald-500/[0.05]">
          {donut && <PremiumDonut pct={donut.pct} value={donut.value} label={donut.label} color={donut.color} />}
          <div className="flex-1 w-full space-y-4">
            {bars && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Taqsimot grafigi</p>
                <MiniBarChart data={bars.data} color={bars.color} />
              </div>
            )}
            {progresses && (
              <div className="space-y-3">
                {progresses.map((p, i) => <ProgressBar key={i} {...p} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);

// Navigation Item Card
const NavCard = ({ icon, title, subtitle, onClick, stats, accent = 'emerald' }) => {
  const accents = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20 group-hover:border-teal-500/50 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.1)]'
  };
  
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:bg-[#11221b] transition-all duration-300 relative overflow-hidden flex flex-col h-full">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${accents[accent]}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">{title}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-emerald-500/[0.05]">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};


export default function Attendance({ user }) {
  const [provinces, setProvinces] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selProv, setSelProv] = useState(null);
  const [selDist, setSelDist] = useState(null);
  const [selSchool, setSelSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [events, setEvents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [students, setStudents] = useState([]);

  const isAdmin = user?.role === 'ADMIN';
  const isDirector = user?.role === 'DIRECTOR';

  useEffect(() => {
    Promise.all([api.get('/api/provinces'), api.get('/api/districts')]).then(([p, d]) => {
      setProvinces(p); setAllDistricts(d);
      if (isDirector && user?.schoolId) { loadSchoolDirect(); return; }
      if (isAdmin && user?.provinceId) { const my = p.find(x => x.id === user.provinceId); if (my) { pickProv(my, d); return; } }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadSchoolDirect = async () => {
    try {
      const s = await api.get(`/api/schools/${user.schoolId}`);
      setSelSchool(s);
      await loadAttendance(user.schoolId);
    } catch { setLoading(false); }
  };

  const pickProv = (p, dList) => {
    setSelProv(p);
    setDistricts((dList || allDistricts).filter(d => d.provinceId === p.id));
    setLoading(false);
  };
  const pickDist = async (d) => {
    setSelDist(d); setLoading(true);
    try { setSchools(await api.get(`/api/schools?districtId=${d.id}`)); } catch {}
    setLoading(false);
  };
  const pickSchool = async (s) => {
    setSelSchool(s);
    await loadAttendance(s.id);
  };

  const loadAttendance = async (schoolId) => {
    setLoading(true);
    try {
      const [ev, dev, stu] = await Promise.all([
        api.get(`/api/attendance/school/${schoolId}?date=${date}`),
        api.get(`/api/attendance/devices/${schoolId}`),
        api.get(`/api/students?schoolId=${schoolId}`)
      ]);
      setEvents(ev || []); setDevices(dev || []); setStudents(stu || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (selSchool) loadAttendance(selSchool.id); }, [date]);

  const goProvs = () => { setSelProv(null); setSelDist(null); setSelSchool(null); };
  const goDists = () => { setSelDist(null); setSelSchool(null); };
  const goSchools = () => { setSelSchool(null); };

  // --- Calculations ---
  const presentIds = useMemo(() => new Set(events.filter(e => e.type === 'IN').map(e => e.studentId)), [events]);
  const totalStudents = students.length;
  const presentCount = presentIds.size;
  const absentCount = totalStudents - presentCount;
  const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const totalProvStudents = useMemo(() => provinces.reduce((s,p)=>s+(p.studentCount||0),0), [provinces]);
  const totalProvSchools = useMemo(() => provinces.reduce((s,p)=>s+(p.schoolCount||0),0), [provinces]);
  const totalProvDists = useMemo(() => provinces.reduce((s,p)=>s+(p.districtCount||0),0), [provinces]);

  const maxProvStudents = useMemo(() => Math.max(...provinces.map(p => p.studentCount || 0), 1), [provinces]);

  // ============================
  // 1. PROVINCES VIEW
  // ============================
  if (!selProv && !isDirector) {
    const provBars = provinces.slice(0, 10).map(p => ((p.studentCount||0) / maxProvStudents) * 100);
    
    return (
      <div className="animate-fade-in pb-10">
        <GlobalDashboard 
          title="Respublika Davomat Tahlili" 
          subtitle="Tizimga ulangan barcha viloyatlar bo'yicha markazlashtirilgan statistika"
          cards={[
            {label: 'Hududlar', value: provinces.length, icon: ICONS.prov, iconColor: 'text-emerald-400', glowColor: 'bg-emerald-500/20'},
            {label: 'Tumanlar', value: totalProvDists, icon: ICONS.dist, iconColor: 'text-teal-400', glowColor: 'bg-teal-500/20'},
            {label: 'Maktablar', value: totalProvSchools, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar Bazasi", value: totalProvStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'}
          ]}
          donut={{pct: Math.min(100, Math.round((totalProvSchools/10000)*100)), value: totalProvSchools, label: "Maktab", color: "#10b981"}}
          bars={{data: provBars, color: 'bg-emerald-500'}}
          progresses={[
            {label: "Maktablar taqsimoti", value: totalProvSchools, max: 10000, color: "bg-cyan-500"},
            {label: "O'quvchilar qamrovi", value: totalProvStudents, max: 6000000, color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {provinces.map(p => (
              <NavCard 
                key={p.id} icon={ICONS.prov} accent="emerald"
                title={p.name} subtitle={`${p.districtCount||0} tuman · ${p.schoolCount||0} maktab`} 
                onClick={() => pickProv(p)} 
                stats={[
                  {label: 'Maktablar', value: p.schoolCount||0, color: 'text-cyan-400'},
                  {label: "O'quvchilar", value: p.studentCount||0, color: 'text-amber-400'}
                ]} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const distTotalStudents = districts.reduce((s,d)=>s+(d.studentCount||0),0);
  const distTotalSchools = districts.reduce((s,d)=>s+(d.schoolCount||0),0);
  const maxDistStudents = Math.max(...districts.map(d => d.studentCount || 0), 1);

  // ============================
  // 2. DISTRICTS VIEW
  // ============================
  if (!selDist && !isDirector) {
    const distBars = districts.slice(0, 10).map(d => ((d.studentCount||0) / maxDistStudents) * 100);

    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-4 mb-6">
          {!isAdmin && <BackBtn onClick={goProvs} />}
          <h1 className="text-2xl font-bold text-white">{selProv.name}</h1>
        </div>

        <GlobalDashboard 
          title={`${selProv.name} Tahlili`} 
          subtitle="Viloyat kesimidagi barcha tumanlar reytingi va statistikasi"
          cards={[
            {label: 'Tumanlar', value: districts.length, icon: ICONS.dist, iconColor: 'text-teal-400', glowColor: 'bg-teal-500/20'},
            {label: 'Maktablar', value: distTotalSchools, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar", value: distTotalStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'}
          ]}
          bars={{data: distBars, color: 'bg-teal-500'}}
          progresses={[
            {label: "Maktablar taqsimoti", value: distTotalSchools, max: 1500, color: "bg-cyan-500"},
            {label: "O'quvchilar qamrovi", value: distTotalStudents, max: 1000000, color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {districts.map(d => (
              <NavCard 
                key={d.id} icon={ICONS.dist} accent="teal"
                title={d.name} subtitle={`${d.schoolCount||0} maktab`} 
                onClick={() => pickDist(d)} 
                stats={[
                  {label: 'Maktablar', value: d.schoolCount||0, color: 'text-cyan-400'},
                  {label: "O'quvchilar", value: d.studentCount||0, color: 'text-amber-400'}
                ]} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const schTotalStudents = schools.reduce((s,x)=>s+(x.studentCount||0),0);

  // ============================
  // 3. SCHOOLS VIEW
  // ============================
  if (!selSchool && !isDirector) {
    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-4 mb-6">
          <BackBtn onClick={goDists} />
          <h1 className="text-2xl font-bold text-white">{selDist.name}</h1>
        </div>

        <GlobalDashboard 
          title={`${selDist.name} Maktablari`} 
          subtitle="Tuman miqyosidagi barcha ta'lim muassasalari"
          cards={[
            {label: 'Muassasalar', value: schools.length, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar", value: schTotalStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'}
          ]}
          progresses={[
            {label: "O'quvchilar qamrovi", value: schTotalStudents, max: 50000, color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {schools.map(s => (
              <NavCard 
                key={s.id} icon={ICONS.school} accent="cyan"
                title={s.name} subtitle={`${s.studentCount||0} nafar o'quvchi`} 
                onClick={() => pickSchool(s)} 
                stats={[
                  {label: "O'quvchilar", value: s.studentCount||0, color: 'text-amber-400'}
                ]} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================
  // 4. DETAILED SCHOOL DASHBOARD
  // ============================
  return (
    <div className="animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-5 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.1] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 relative z-10">
          {!isDirector && <BackBtn onClick={goSchools} />}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{selSchool?.name}</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{selProv?.name} • {selDist?.name}</p>
          </div>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          className="relative z-10 h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.2] text-emerald-400 font-medium outline-none focus:border-emerald-400 [color-scheme:dark]" 
        />
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest self-start mb-6">Davomat Ko'rsatkichi</h3>
              <PremiumDonut pct={percentage} color={percentage > 80 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'} />
              <div className="w-full grid grid-cols-2 gap-4 mt-8 border-t border-emerald-500/[0.1] pt-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Keldi</p>
                  <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Kelmadi</p>
                  <p className="text-2xl font-bold text-rose-400">{absentCount}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Device Status */}
              <div className="bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Terminallar (Face ID)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {devices.length === 0 ? (
                    <div className="col-span-full py-4 px-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                      Uskunalar ulanmagan
                    </div>
                  ) : devices.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-emerald-500/[0.05]">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${d.online ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-rose-500'}`} />
                        <div>
                          <p className="text-sm font-bold text-white">{d.deviceName || d.deviceSerial}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{d.ipAddress || 'IP: ---'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase ${d.online ? 'text-emerald-400' : 'text-rose-400'}`}>{d.online ? 'Online' : 'Offline'}</p>
                        <p className="text-[9px] text-slate-500 mt-1">{new Date(d.lastSeen).toLocaleTimeString('uz')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl p-6 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Jami o'quvchilar</p>
                  <p className="text-4xl font-black text-white">{totalStudents}</p>
                </div>
                <div className="bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl p-6 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Kutishdagi ma'lumotlar</p>
                  <p className="text-4xl font-black text-amber-400">{devices.reduce((s,d)=>s+(d.pendingEvents||0),0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Live Feed */}
            <div className="xl:col-span-2 bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl overflow-hidden h-[600px] flex flex-col">
              <div className="px-6 py-4 border-b border-emerald-500/[0.1] bg-emerald-500/[0.02] flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Operativ Lenta (Live)</h3>
                <span className="text-[10px] text-slate-500">{events.length} qayd</span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05]">Vaqt</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05]">O'quvchi</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05] text-center">Harakat</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05] text-center">Harorat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i} className="border-b border-emerald-500/[0.02] hover:bg-emerald-500/[0.02] transition-colors">
                        <td className="py-3 text-xs font-mono text-slate-400">{new Date(e.timestamp).toLocaleTimeString('uz')}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {e.studentPhoto ? <img src={e.studentPhoto} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">{e.studentName?.charAt(0)}</div>}
                            <span className="text-white text-sm">{e.studentName}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${e.type==='IN'?'bg-emerald-500/10 text-emerald-400':'bg-blue-500/10 text-blue-400'}`}>
                            {e.type==='IN'?'Kirdi':'Chiqdi'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-mono ${parseFloat(e.temperature)>37.2?'text-rose-400':'text-slate-500'}`}>{e.temperature ? `${e.temperature}°C` : '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-[#0d1a14] border border-emerald-500/[0.1] rounded-2xl overflow-hidden h-[600px] flex flex-col">
              <div className="px-6 py-4 border-b border-emerald-500/[0.1] bg-emerald-500/[0.02]">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">O'quvchilar ro'yxati</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {students.map(s => {
                  const came = presentIds.has(s.id);
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${came ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/[0.02] border-emerald-500/[0.05]'}`}>
                      <div className="flex items-center gap-3">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">{s.fullName?.charAt(0)}</div>}
                        <span className="text-xs font-medium text-slate-200">{s.fullName}</span>
                      </div>
                      {came ? <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <span className="text-xs text-slate-600">—</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
