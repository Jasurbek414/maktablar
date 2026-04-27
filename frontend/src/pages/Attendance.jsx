import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

// --- Premium UI Icons ---
const ICONS = {
  prov: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  school: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342',
  trendUp: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  cross: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

// --- Premium UI Components ---

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} className="group flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/50 backdrop-blur-md border border-slate-700/50 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 hover:-translate-x-1 shadow-lg shadow-black/20">
    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
  </button>
);

const Loader = () => (
  <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
      <div className="absolute inset-2 rounded-full border-r-2 border-cyan-500 animate-spin opacity-70" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      <div className="absolute inset-4 rounded-full border-b-2 border-teal-400 animate-spin opacity-40" style={{ animationDuration: '2s' }} />
    </div>
    <p className="mt-4 text-sm text-slate-500 uppercase tracking-widest font-semibold animate-pulse">Ma'lumotlar yuklanmoqda...</p>
  </div>
);

// High-end Animated Donut Chart
const PremiumDonut = ({ pct, color = '#10b981', label }) => {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect behind */}
      <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
      
      <svg width={size} height={size} className="relative z-10 drop-shadow-xl">
        {/* Background track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        {/* Animated progress */}
        <circle 
          cx={size/2} cy={size/2} r={r} fill="none" 
          stroke={color} strokeWidth={stroke} 
          strokeDasharray={c} strokeDashoffset={offset} 
          strokeLinecap="round" 
          transform={`rotate(-90 ${size/2} ${size/2})`} 
          className="transition-all duration-1500 ease-out" 
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-2xl font-black text-white tracking-tighter">{pct}%</span>
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</span>
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
        <path d={`M ${points}`} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000 group-hover:drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
      </svg>
    </div>
  );
};

// Premium Navigation Card
const NavCard = ({ icon, title, subtitle, colorTheme = 'emerald', onClick, stats }) => {
  const themes = {
    emerald: { bg: 'from-emerald-500/10 to-teal-900/20', border: 'hover:border-emerald-500/50', iconBg: 'bg-emerald-500/20 text-emerald-400', glow: 'bg-emerald-500/20' },
    cyan: { bg: 'from-cyan-500/10 to-blue-900/20', border: 'hover:border-cyan-500/50', iconBg: 'bg-cyan-500/20 text-cyan-400', glow: 'bg-cyan-500/20' },
    amber: { bg: 'from-amber-500/10 to-orange-900/20', border: 'hover:border-amber-500/50', iconBg: 'bg-amber-500/20 text-amber-400', glow: 'bg-amber-500/20' }
  };
  const theme = themes[colorTheme] || themes.emerald;

  return (
    <button onClick={onClick} className={`group relative w-full text-left rounded-2xl bg-[#0f172a]/80 backdrop-blur-xl border border-slate-700/50 p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-${colorTheme}-500/10 ${theme.border}`}>
      {/* Background Ambient Glow */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${theme.glow}`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${theme.iconBg}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 group-hover:bg-white/10 group-hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700/50">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{s.label}</span>
                <span className={`text-lg font-black tracking-tight ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

const StatSummaryCard = ({ title, value, subValue, icon, colorTheme }) => {
  const colors = {
    emerald: 'from-emerald-600/20 to-emerald-900/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
    cyan: 'from-cyan-600/20 to-cyan-900/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/10',
    amber: 'from-amber-600/20 to-amber-900/10 text-amber-400 border-amber-500/20 shadow-amber-500/10',
    rose: 'from-rose-600/20 to-rose-900/10 text-rose-400 border-rose-500/20 shadow-rose-500/10',
    indigo: 'from-indigo-600/20 to-indigo-900/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10'
  };
  const theme = colors[colorTheme] || colors.emerald;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0f172a] border ${theme.split(' ')[2]} p-5 shadow-lg`}>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${theme.split(' ')[0]} ${theme.split(' ')[1]}`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-3xl font-black tracking-tighter text-white drop-shadow-md`}>{value}</h2>
            {subValue && <span className={`text-xs font-bold ${theme.split(' ')[2]}`}>{subValue}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 shadow-inner ${theme.split(' ')[2]}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
        </div>
      </div>
    </div>
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
  
  // Detailed data
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

  // --- Calculations for Analytics ---
  const presentIds = useMemo(() => new Set(events.filter(e => e.type === 'IN').map(e => e.studentId)), [events]);
  const totalStudents = students.length;
  const presentCount = presentIds.size;
  const absentCount = totalStudents - presentCount;
  const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Fake hourly activity data for the graph based on events
  const hourlyActivity = useMemo(() => {
    const hours = new Array(12).fill(0); // 7 AM to 6 PM
    events.forEach(e => {
      const h = new Date(e.timestamp).getHours();
      if (h >= 7 && h <= 18) hours[h - 7]++;
    });
    // Add some realistic noise if no events to show empty graph structure
    if (events.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    return hours;
  }, [events]);

  const totalProvStudents = useMemo(() => provinces.reduce((s,p)=>s+(p.studentCount||0),0), [provinces]);
  const totalProvSchools = useMemo(() => provinces.reduce((s,p)=>s+(p.schoolCount||0),0), [provinces]);
  const totalProvDists = useMemo(() => provinces.reduce((s,p)=>s+(p.districtCount||0),0), [provinces]);

  // ============================
  // 1. PROVINCES VIEW
  // ============================
  if (!selProv && !isDirector) {
    return (
      <div className="animate-fade-in pb-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Respublika Davomat Tahlili</h1>
          <p className="text-sm text-slate-400">Tizimga ulangan barcha viloyatlar bo'yicha markazlashtirilgan real vaqt statistikasi</p>
        </div>

        {/* High-end Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatSummaryCard title="Hududlar" value={provinces.length} icon={ICONS.prov} colorTheme="emerald" />
          <StatSummaryCard title="Tumanlar" value={totalProvDists} icon={ICONS.dist} colorTheme="cyan" />
          <StatSummaryCard title="Maktablar" value={totalProvSchools.toLocaleString()} icon={ICONS.school} colorTheme="indigo" />
          <StatSummaryCard title="O'quvchilar bazasi" value={totalProvStudents.toLocaleString()} subValue="jami" icon={ICONS.users} colorTheme="amber" />
        </div>

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {provinces.map(p => (
              <NavCard 
                key={p.id} icon={ICONS.prov} colorTheme="emerald"
                title={p.name} subtitle={`${p.districtCount||0} tuman · ${p.schoolCount||0} maktab`} 
                onClick={() => pickProv(p)} 
                stats={[
                  {label: 'Maktablar', value: p.schoolCount||0, color: 'text-cyan-400'},
                  {label: "O'quvchilar", value: (p.studentCount||0).toLocaleString(), color: 'text-amber-400'}
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

  // ============================
  // 2. DISTRICTS VIEW
  // ============================
  if (!selDist && !isDirector) {
    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-4 mb-8">
          {!isAdmin && <BackBtn onClick={goProvs} />}
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">{selProv.name}</h1>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
              <span>Davomat</span> <span className="text-slate-700">•</span> <span className="text-cyan-400">{selProv.name}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatSummaryCard title="Tumanlar" value={districts.length} icon={ICONS.dist} colorTheme="cyan" />
          <StatSummaryCard title="Maktablar" value={distTotalSchools.toLocaleString()} icon={ICONS.school} colorTheme="indigo" />
          <StatSummaryCard title="O'quvchilar" value={distTotalStudents.toLocaleString()} icon={ICONS.users} colorTheme="amber" />
        </div>

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {districts.map(d => (
              <NavCard 
                key={d.id} icon={ICONS.dist} colorTheme="cyan"
                title={d.name} subtitle={`${d.schoolCount||0} maktab · ${d.studentCount||0} o'quvchi`} 
                onClick={() => pickDist(d)} 
                stats={[
                  {label: 'Maktablar', value: d.schoolCount||0, color: 'text-indigo-400'},
                  {label: "O'quvchilar", value: (d.studentCount||0).toLocaleString(), color: 'text-amber-400'}
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
        <div className="flex items-center gap-4 mb-8">
          <BackBtn onClick={goDists} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">{selDist.name}</h1>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
              <span>Davomat</span> <span className="text-slate-700">•</span> <span>{selProv.name}</span> <span className="text-slate-700">•</span> <span className="text-indigo-400">{selDist.name}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatSummaryCard title="Maktablar" value={schools.length} icon={ICONS.school} colorTheme="indigo" />
          <StatSummaryCard title="O'quvchilar" value={schTotalStudents.toLocaleString()} icon={ICONS.users} colorTheme="amber" />
        </div>

        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {schools.map(s => (
              <NavCard 
                key={s.id} icon={ICONS.school} colorTheme="indigo"
                title={s.name} subtitle={`${s.studentCount||0} nafar o'quvchi`} 
                onClick={() => pickSchool(s)} 
                stats={[
                  {label: "O'quvchilar", value: (s.studentCount||0).toLocaleString(), color: 'text-amber-400'},
                  {label: 'Status', value: 'Faol', color: 'text-emerald-400'}
                ]} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================
  // 4. DETAILED ATTENDANCE DASHBOARD (SCHOOL LEVEL)
  // ============================
  return (
    <div className="animate-fade-in pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#0f172a] p-5 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 relative z-10">
          {!isDirector && <BackBtn onClick={goSchools} />}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">{selSchool?.name}</h1>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest flex-wrap">
              {isDirector ? <span>Maktab Davomati</span> : (
                <><span>{selProv?.name}</span> <span className="text-slate-700">•</span> <span>{selDist?.name}</span></>
              )}
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full md:w-auto h-12 px-5 rounded-xl bg-slate-900/80 border border-slate-600 text-white font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-inner [color-scheme:dark]" 
          />
        </div>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Top Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Donut & Core Stats */}
            <div className="lg:col-span-1 bg-[#0f172a] border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest self-start mb-6 w-full border-b border-slate-700/50 pb-4">Umumiy Davomat</h3>
              
              <PremiumDonut pct={percentage} label="Kelganlar foizi" color={percentage > 80 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'} />
              
              <div className="w-full grid grid-cols-2 gap-4 mt-8">
                <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-emerald-500/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Keldi</p>
                  <p className="text-2xl font-black text-emerald-400">{presentCount}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 text-center border border-rose-500/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Kelmadi</p>
                  <p className="text-2xl font-black text-rose-400">{absentCount}</p>
                </div>
              </div>
            </div>

            {/* Activity Graph */}
            <div className="lg:col-span-2 bg-[#0f172a] border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Faollik Grafigi</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Kun davomidagi kirish-chiqish intensivligi</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase">Live</span>
                </div>
              </div>
              <div className="flex-1 min-h-[150px] relative mt-4">
                <ActivityGraph data={hourlyActivity} />
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between translate-y-6 text-[9px] text-slate-500 font-medium">
                  <span>07:00</span><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>18:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure & Devices */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 pl-2">Infratuzilma holati</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {devices.length === 0 ? (
                <div className="col-span-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">Terminallar ulanmagan</h4>
                    <p className="text-xs text-amber-400/70 mt-1">Maktabga hali yuzni aniqlash qurilmalari biriktirilmagan yoki ular tarmoqdan uzilgan.</p>
                  </div>
                </div>
              ) : (
                devices.map(d => (
                  <div key={d.id} className="relative overflow-hidden bg-[#0f172a] border border-slate-700/50 rounded-2xl p-5 shadow-lg group">
                    <div className={`absolute top-0 left-0 w-1 h-full ${d.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{d.deviceName || d.deviceSerial}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{d.ipAddress || 'IP Noma\'lum'}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${d.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${d.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {d.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-800">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Sinxeonizatsiya</p>
                        <p className="text-xs text-slate-300">{new Date(d.lastSeen).toLocaleTimeString('uz')}</p>
                      </div>
                      {d.pendingEvents > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] font-bold text-blue-400">
                          {d.pendingEvents} navbatda
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Real-time Event Log */}
            <div className="xl:col-span-2 bg-[#0f172a] border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[600px]">
              <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Operativ Lenta</h3>
                <span className="bg-slate-800 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-bold border border-cyan-500/20">Bugun: {events.length} ta yozuv</span>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {events.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-[#0f172a] z-10">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700">Vaqt</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700">O'quvchi</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 text-center">Harakat</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 text-center">Harorat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {events.map((e, idx) => (
                        <tr key={e.id || idx} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors">
                              {new Date(e.timestamp).toLocaleTimeString('uz', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {e.studentPhoto ? (
                                <img src={e.studentPhoto} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-600 shadow-sm" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                  {e.studentName?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{e.studentName || 'Noma\'lum o\'quvchi'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${e.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {e.type === 'IN' ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
                              </svg>
                              {e.type === 'IN' ? 'Kirdi' : 'Chiqdi'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {e.temperature ? (
                              <span className={`text-xs font-mono font-medium ${parseFloat(e.temperature) > 37.2 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {e.temperature}°C
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-60">
                    <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm uppercase tracking-widest font-semibold">Ma'lumotlar yo'q</p>
                  </div>
                )}
              </div>
            </div>

            {/* Students List Status */}
            <div className="xl:col-span-1 bg-[#0f172a] border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[600px]">
              <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Ro'yxat</h3>
                <span className="text-[10px] font-bold text-slate-400">{students.length} kishi</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {students.map(s => {
                  const came = presentIds.has(s.id);
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] ${came ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30' : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-500/50'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} className="w-9 h-9 rounded-full object-cover border border-slate-600" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                            {s.fullName?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-200 truncate">{s.fullName}</span>
                      </div>
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${came ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {came ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-xs font-bold">—</span>
                        )}
                      </div>
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
