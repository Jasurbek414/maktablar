import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

// --- Icons ---
const ICONS = {
  prov: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  school: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
};

// --- Custom Charts & UI ---
const BackBtn = ({ onClick }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-full bg-white/[0.03] border border-emerald-500/[0.1] flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
  </button>
);

const Loader = () => (
  <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
);

const PremiumDonut = ({ pct = 0, size = 90, stroke = 8, color = '#10b981', label, value }) => {
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
            <span className="text-lg font-bold text-white leading-none">{value}</span>
            <span className="text-[8px] text-slate-500 uppercase mt-0.5">{label}</span>
          </>
        ) : (
          <span className="text-lg font-bold text-white">{pct}%</span>
        )}
      </div>
    </div>
  );
};

const MiniBarChart = ({ data = [], color = 'bg-emerald-400', height = 'h-12' }) => (
  <div className={`flex items-end gap-0.5 ${height} w-full`}>
    {data.map((v, i) => (
      <div key={i} className="flex-1 flex flex-col items-center group relative">
        <div className={`w-full rounded-t-sm ${color} transition-all duration-700 hover:brightness-125 opacity-80 group-hover:opacity-100`} style={{ height: `${Math.max(2, v)}%` }} />
      </div>
    ))}
  </div>
);

const ProgressBar = ({ label, value, max, color = 'bg-emerald-400' }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1">
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-bold text-white">{value.toLocaleString()} <span className="text-slate-600 font-normal text-[9px]">/ {max.toLocaleString()}</span></span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Activity Line Graph (Smooth SVG curve)
const ActivityGraph = ({ data = [] }) => {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-600 text-xs">Ma'lumot yetarli emas</div>;
  
  const max = Math.max(...data, 1);
  const width = 300;
  const height = 80;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (val / max) * height;
    return `${x},${y}`;
  }).join(' L ');

  return (
    <div className="w-full h-full relative group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M 0,${height} L ${points} L ${width},${height} Z`} fill="url(#fillGrad)" className="transition-all duration-1000" />
        <path d={`M ${points}`} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000" />
      </svg>
    </div>
  );
};

// Compact Top Analytics Dashboard
const GlobalDashboard = ({ title, subtitle, cards, donut, bars, progresses }) => (
  <div className="mb-5 rounded-xl bg-[#0d1a14] border border-emerald-500/[0.08] p-5 overflow-hidden relative">
    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
    
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 relative z-10 border-b border-emerald-500/[0.05] pb-3">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest mt-2 sm:mt-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Stats
      </div>
    </div>

    <div className="flex flex-col lg:flex-row gap-5 relative z-10">
      {/* Stat Cards Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
        {cards.map((c, i) => (
          <div key={i} className="rounded-lg bg-white/[0.02] border border-emerald-500/[0.05] p-3 relative group hover:bg-white/[0.04] transition-colors">
            <div className={`absolute top-0 right-0 w-10 h-10 rounded-full ${c.glowColor || 'bg-emerald-500/10'} blur-xl -translate-y-2 translate-x-2 opacity-30 group-hover:opacity-80 transition-opacity`} />
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.03] border border-white/[0.05] ${c.iconColor}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
              </div>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.textColor || 'text-white'}`}>{c.value.toLocaleString()}</p>
            {c.sub && <p className="text-[9px] text-slate-500 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Analytics Charts - Compact */}
      {(donut || bars || progresses) && (
        <div className="flex items-center gap-5 lg:w-[320px] shrink-0 p-3 rounded-lg bg-black/20 border border-emerald-500/[0.05]">
          {donut && <PremiumDonut pct={donut.pct} value={donut.value} label={donut.label} color={donut.color} />}
          <div className="flex-1 w-full space-y-3">
            {bars && (
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Taqsimot grafigi</p>
                <MiniBarChart data={bars.data} color={bars.color} />
              </div>
            )}
            {progresses && (
              <div className="space-y-2">
                {progresses.map((p, i) => <ProgressBar key={i} {...p} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);

// Compact Navigation Item Card with inline stats
const NavCard = ({ icon, title, subtitle, onClick, stats, accent = 'emerald', pct = 0 }) => {
  const accents = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/40',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20 group-hover:border-teal-500/40'
  };
  
  return (
    <button onClick={onClick} className="group text-left w-full rounded-xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:bg-[#11221b] transition-all duration-300 overflow-hidden flex flex-col h-full relative">
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[0.02]">
        <div className={`h-full bg-${accent}-500/50 transition-all duration-700`} style={{ width: `${Math.max(5, pct)}%` }} />
      </div>
      <div className="p-3.5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${accents[accent]}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 leading-snug">{title}</h3>
              <p className="text-[9px] text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-emerald-500/[0.05]">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-1 h-1 rounded-full ${s.dotClass || 'bg-slate-500'}`} />
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest">{s.label}</span>
                </div>
                <span className={`text-[13px] font-bold ${s.color}`}>{s.value.toLocaleString()}</span>
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

  const hourlyActivity = useMemo(() => {
    const hours = new Array(12).fill(0);
    events.forEach(e => {
      const h = new Date(e.timestamp).getHours();
      if (h >= 7 && h <= 18) hours[h - 7]++;
    });
    if (events.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    return hours;
  }, [events]);

  const totalProvStudents = useMemo(() => provinces.reduce((s,p)=>s+(p.studentCount||0),0), [provinces]);
  const totalProvSchools = useMemo(() => provinces.reduce((s,p)=>s+(p.schoolCount||0),0), [provinces]);
  const totalProvDists = useMemo(() => provinces.reduce((s,p)=>s+(p.districtCount||0),0), [provinces]);

  const maxProvStudents = useMemo(() => Math.max(...provinces.map(p => p.studentCount || 0), 1), [provinces]);
  const maxProvSchools = useMemo(() => Math.max(...provinces.map(p => p.schoolCount || 0), 1), [provinces]);

  // ============================
  // 1. PROVINCES VIEW
  // ============================
  if (!selProv && !isDirector) {
    const provBars = provinces.slice(0, 12).map(p => ((p.studentCount||0) / maxProvStudents) * 100);
    
    return (
      <div className="animate-fade-in pb-10">
        <GlobalDashboard 
          title="Respublika Davomat Tahlili" 
          subtitle="Barcha viloyatlar bo'yicha markazlashtirilgan o'quvchilar va maktablar qamrovi"
          cards={[
            {label: 'Hududlar', value: provinces.length, icon: ICONS.prov, iconColor: 'text-emerald-400', glowColor: 'bg-emerald-500/20'},
            {label: 'Tumanlar', value: totalProvDists, icon: ICONS.dist, iconColor: 'text-teal-400', glowColor: 'bg-teal-500/20'},
            {label: 'Maktablar', value: totalProvSchools, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar", value: totalProvStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'}
          ]}
          donut={{pct: Math.min(100, Math.round((totalProvSchools/10000)*100)), value: totalProvSchools, label: "Maktab", color: "#10b981"}}
          bars={{data: provBars, color: 'bg-emerald-500'}}
          progresses={[
            {label: "Tizimga ulangan maktablar", value: totalProvSchools, max: 10000, color: "bg-cyan-500"},
            {label: "Ro'yxatdagi o'quvchilar", value: totalProvStudents, max: Math.max(totalProvStudents, 6000000), color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
            {provinces.map(p => (
              <NavCard 
                key={p.id} icon={ICONS.prov} accent="emerald"
                title={p.name} subtitle={`${p.districtCount||0} tuman · ${p.schoolCount||0} maktab`} 
                onClick={() => pickProv(p)} 
                pct={((p.studentCount||0)/maxProvStudents)*100}
                stats={[
                  {label: 'Maktablar', value: p.schoolCount||0, color: 'text-cyan-400', dotClass: 'bg-cyan-500'},
                  {label: "O'quvchilar", value: p.studentCount||0, color: 'text-amber-400', dotClass: 'bg-amber-500'}
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
    const distBars = districts.slice(0, 12).map(d => ((d.studentCount||0) / maxDistStudents) * 100);

    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-3 mb-5">
          {!isAdmin && <BackBtn onClick={goProvs} />}
          <h1 className="text-xl font-bold text-white">{selProv.name} tahlili</h1>
        </div>

        <GlobalDashboard 
          title={`${selProv.name} bo'yicha tumanlar kesimida`} 
          subtitle="Viloyatga qarashli tumanlardagi maktab va o'quvchilar qamrovi statistikasi"
          cards={[
            {label: 'Tumanlar', value: districts.length, icon: ICONS.dist, iconColor: 'text-teal-400', glowColor: 'bg-teal-500/20'},
            {label: 'Maktablar', value: distTotalSchools, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar", value: distTotalStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'},
            {label: "O'rtacha quvvat", value: Math.round(distTotalStudents/(distTotalSchools||1)), icon: ICONS.school, iconColor: 'text-indigo-400', glowColor: 'bg-indigo-500/20'}
          ]}
          bars={{data: distBars, color: 'bg-teal-500'}}
          progresses={[
            {label: "Maktablar taqsimoti", value: distTotalSchools, max: Math.max(distTotalSchools, 1000), color: "bg-cyan-500"},
            {label: "O'quvchilar qamrovi", value: distTotalStudents, max: Math.max(distTotalStudents, 500000), color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
            {districts.map(d => (
              <NavCard 
                key={d.id} icon={ICONS.dist} accent="teal"
                title={d.name} subtitle={`${d.schoolCount||0} maktab`} 
                onClick={() => pickDist(d)} 
                pct={((d.studentCount||0)/maxDistStudents)*100}
                stats={[
                  {label: 'Maktablar', value: d.schoolCount||0, color: 'text-cyan-400', dotClass: 'bg-cyan-500'},
                  {label: "O'quvchilar", value: d.studentCount||0, color: 'text-amber-400', dotClass: 'bg-amber-500'}
                ]} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const schTotalStudents = schools.reduce((s,x)=>s+(x.studentCount||0),0);
  const maxSchStudents = Math.max(...schools.map(s => s.studentCount || 0), 1);

  // ============================
  // 3. SCHOOLS VIEW
  // ============================
  if (!selSchool && !isDirector) {
    const schBars = schools.slice(0, 15).map(s => ((s.studentCount||0) / maxSchStudents) * 100);

    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-3 mb-5">
          <BackBtn onClick={goDists} />
          <h1 className="text-xl font-bold text-white">{selDist.name} maktablari</h1>
        </div>

        <GlobalDashboard 
          title={`${selDist.name} ro'yxati`} 
          subtitle="Tuman miqyosidagi barcha ta'lim muassasalari va ulardagi o'quvchilar soni"
          cards={[
            {label: 'Muassasalar', value: schools.length, icon: ICONS.school, iconColor: 'text-cyan-400', glowColor: 'bg-cyan-500/20'},
            {label: "O'quvchilar", value: schTotalStudents, icon: ICONS.users, iconColor: 'text-amber-400', glowColor: 'bg-amber-500/20', textColor: 'text-amber-400'}
          ]}
          bars={{data: schBars, color: 'bg-indigo-500'}}
          progresses={[
            {label: "Tuman bo'yicha qamrov", value: schTotalStudents, max: Math.max(schTotalStudents, 50000), color: "bg-amber-500"}
          ]}
        />

        {loading ? <Loader /> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
            {schools.map(s => (
              <NavCard 
                key={s.id} icon={ICONS.school} accent="cyan"
                title={s.name} subtitle={`${s.studentCount||0} nafar o'quvchi`} 
                onClick={() => pickSchool(s)} 
                pct={((s.studentCount||0)/maxSchStudents)*100}
                stats={[
                  {label: "O'quvchilar", value: s.studentCount||0, color: 'text-amber-400', dotClass: 'bg-amber-500'},
                  {label: 'Holati', value: 'Faol', color: 'text-emerald-400', dotClass: 'bg-emerald-500'}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 p-4 rounded-xl bg-[#0d1a14] border border-emerald-500/[0.08] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-3 relative z-10">
          {!isDirector && <BackBtn onClick={goSchools} />}
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white mb-0.5">{selSchool?.name}</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">{selProv?.name} • {selDist?.name}</p>
          </div>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          className="relative z-10 h-9 px-3 rounded-lg bg-white/[0.03] border border-emerald-500/[0.2] text-emerald-400 text-sm font-medium outline-none focus:border-emerald-400 [color-scheme:dark]" 
        />
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-1 bg-[#0d1a14] border border-emerald-500/[0.08] rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-start mb-4">Davomat Ko'rsatkichi</h3>
              <PremiumDonut pct={percentage} color={percentage > 80 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'} />
              <div className="w-full grid grid-cols-2 gap-3 mt-6 border-t border-emerald-500/[0.05] pt-4">
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Keldi</p>
                  <p className="text-xl font-bold text-emerald-400">{presentCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Kelmadi</p>
                  <p className="text-xl font-bold text-rose-400">{absentCount}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="bg-[#0d1a14] border border-emerald-500/[0.08] rounded-xl p-5 flex flex-col relative overflow-hidden h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kirdi-chiqdi Tahlili</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5">Kunning soatlari bo'yicha oqim statistikasi</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex-1 min-h-[120px] relative mt-2">
                  <ActivityGraph data={hourlyActivity} />
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between translate-y-5 text-[8px] text-slate-500 font-medium">
                    <span>07:00</span><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>18:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Mini-PC va Terminallar Monitori</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {devices.length === 0 ? (
                <div className="col-span-full py-3 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Face ID uskunalar ulanmagan
                </div>
              ) : devices.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-emerald-500/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${d.online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-rose-500'}`} />
                    <div>
                      <p className="text-[11px] font-bold text-white">{d.deviceName || d.deviceSerial}</p>
                      <p className="text-[8px] text-slate-500 font-mono mt-0.5">{d.ipAddress || 'IP: ---'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[8px] font-bold uppercase ${d.online ? 'text-emerald-400' : 'text-rose-400'}`}>{d.online ? 'Online' : 'Offline'}</p>
                    <p className="text-[7px] text-slate-500 mt-1">{new Date(d.lastSeen).toLocaleTimeString('uz')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-[#0d1a14] border border-emerald-500/[0.08] rounded-xl overflow-hidden h-[500px] flex flex-col">
              <div className="px-5 py-3 border-b border-emerald-500/[0.05] bg-emerald-500/[0.02] flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Jonli Lenta (Kirdi-chiqdi)</h3>
                <span className="text-[9px] text-slate-500 bg-black/20 px-2 py-0.5 rounded">{events.length} qayd</span>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0d1a14]">
                    <tr>
                      <th className="pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05]">Vaqt</th>
                      <th className="pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05]">O'quvchi</th>
                      <th className="pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05] text-center">Harakat</th>
                      <th className="pb-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-emerald-500/[0.05] text-center">Harorat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i} className="border-b border-emerald-500/[0.02] hover:bg-emerald-500/[0.02] transition-colors">
                        <td className="py-2.5 font-mono text-slate-400">{new Date(e.timestamp).toLocaleTimeString('uz')}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            {e.studentPhoto ? <img src={e.studentPhoto} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-[10px]">{e.studentName?.charAt(0)}</div>}
                            <span className="text-white text-[11px]">{e.studentName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${e.type==='IN'?'bg-emerald-500/10 text-emerald-400':'bg-blue-500/10 text-blue-400'}`}>
                            {e.type==='IN'?'Kirdi':'Chiqdi'}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`font-mono text-[10px] ${parseFloat(e.temperature)>37.2?'text-rose-400':'text-slate-500'}`}>{e.temperature ? `${e.temperature}°C` : '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#0d1a14] border border-emerald-500/[0.08] rounded-xl overflow-hidden h-[500px] flex flex-col">
              <div className="px-5 py-3 border-b border-emerald-500/[0.05] bg-emerald-500/[0.02]">
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">O'quvchilar ro'yxati</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {students.map(s => {
                  const came = presentIds.has(s.id);
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-2 rounded-lg border ${came ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/[0.02] border-emerald-500/[0.02]'}`}>
                      <div className="flex items-center gap-2">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">{s.fullName?.charAt(0)}</div>}
                        <span className="text-[11px] font-medium text-slate-200">{s.fullName}</span>
                      </div>
                      {came ? <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <span className="text-[10px] text-slate-600">—</span>}
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
