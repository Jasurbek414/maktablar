import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const ICONS = {
  prov: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  school: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342'
};

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-9 h-9 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-500/20 transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
    </button>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5">
      {items.map((t, i) => (<span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-slate-700">›</span>}<span className={i === items.length - 1 ? 'text-emerald-500' : ''}>{t}</span></span>))}
    </div>
  );
}

function Loader() { return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>; }

function NavCard({ icon, title, subtitle, color = 'emerald', onClick, stats }) {
  const colors = { emerald: 'from-emerald-500/20 to-cyan-500/10 text-emerald-400', teal: 'from-teal-500/20 to-emerald-500/10 text-teal-400', cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400' };
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">{title}</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>
          </div>
          <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </div>
        {stats && <div className="grid grid-cols-2 gap-1.5">{stats.map((s, i) => <div key={i} className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg ${s.bg}`}><span className={`text-xs font-bold ${s.color}`}>{s.value}</span><span className="text-[7px] text-slate-600">{s.label}</span></div>)}</div>}
      </div>
    </button>
  );
}

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
      setEvents(ev); setDevices(dev); setStudents(stu);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (selSchool) loadAttendance(selSchool.id); }, [date]);

  const goProvs = () => { setSelProv(null); setSelDist(null); setSelSchool(null); };
  const goDists = () => { setSelDist(null); setSelSchool(null); };
  const goSchools = () => { setSelSchool(null); };

  // Stats
  const presentIds = new Set(events.filter(e => e.type === 'IN').map(e => e.studentId));
  const totalStudents = students.length;
  const presentCount = presentIds.size;
  const absentCount = totalStudents - presentCount;
  const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  /* SVG Donut Chart */
  const Donut = ({pct=0, size=80, stroke=8, color='#10b981'}) => {
    const r = (size-stroke)/2, c = 2*Math.PI*r, offset = c - (pct/100)*c;
    return (<svg width={size} height={size} className="shrink-0"><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/[0.04]" /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} className="transition-all duration-1000" /><text x={size/2} y={size/2} textAnchor="middle" dy=".35em" className="fill-white text-sm font-bold">{pct}%</text></svg>);
  };

  /* Mini Bar Chart */
  const MiniBar = ({data=[], color='bg-emerald-400'}) => (
    <div className="flex items-end gap-0.5 h-10">{data.map((v,i)=>(<div key={i} className="flex-1 flex flex-col items-center gap-0.5"><div className={`w-full rounded-t-sm ${color} transition-all duration-500`} style={{height:`${v}%`,opacity:0.3+v/140}} /></div>))}</div>
  );

  /* Progress bar */
  const Progress = ({value=0, max=100, color='bg-emerald-400', label, sub}) => {
    const pct = max > 0 ? Math.round(value/max*100) : 0;
    return (<div className="flex-1"><div className="flex items-center justify-between mb-1"><span className="text-[10px] text-slate-500">{label}</span><span className="text-xs font-bold text-white">{value}<span className="text-slate-600 font-normal">/{max}</span></span></div><div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden"><div className={`h-full rounded-full ${color} transition-all duration-700`} style={{width:`${pct}%`}} /></div>{sub && <span className="text-[9px] text-slate-600 mt-0.5">{sub}</span>}</div>);
  };

  const StatDashboard = ({title, subtitle, cards, donut, bars, progresses}) => (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-sm font-semibold text-white">{title}</h2>{subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}</div>
        <span className="text-[9px] text-slate-700 uppercase tracking-wider">Real vaqt</span>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {cards.map((c,i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 relative overflow-hidden group hover:border-emerald-500/20 transition-colors">
              <div className={`absolute top-0 right-0 w-12 h-12 rounded-full ${c.glow || 'bg-emerald-500/5'} blur-xl -translate-y-3 translate-x-3 group-hover:scale-150 transition-transform`} />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot || 'bg-emerald-400'}`} />
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">{c.label}</span>
                </div>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                {c.sub && <p className="text-[9px] text-slate-600 mt-0.5">{c.sub}</p>}
              </div>
            </div>
          ))}
        </div>
        {/* Charts area */}
        {(donut || bars || progresses) && (
          <div className="flex items-center gap-5 lg:w-72 shrink-0">
            {donut && <Donut pct={donut.pct} color={donut.color} />}
            <div className="flex-1 space-y-3">
              {bars && <div><p className="text-[9px] text-slate-600 uppercase mb-1">Taqsimot</p><MiniBar data={bars.data} color={bars.color} /></div>}
              {progresses && progresses.map((p,i) => <Progress key={i} {...p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const totalProvStudents = provinces.reduce((s,p)=>s+(p.studentCount||0),0);
  const totalProvSchools = provinces.reduce((s,p)=>s+(p.schoolCount||0),0);
  const totalProvDists = provinces.reduce((s,p)=>s+(p.districtCount||0),0);

  /* 1. Province */
  if (!selProv && !isDirector) {
    const provBars = provinces.slice(0,7).map(p => Math.min(100, (p.studentCount||0)/Math.max(1,totalProvStudents)*100*provinces.length));
    return (<div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-xl font-bold text-white">Davomat nazorati</h1><p className="text-sm text-slate-500 mt-0.5">Viloyatlar bo'yicha umumiy statistika</p></div>
      <StatDashboard title="Umumiy ko'rsatkichlar" subtitle="Barcha viloyatlar bo'yicha" cards={[
        {label:'Viloyatlar',value:provinces.length,color:'text-emerald-400',dot:'bg-emerald-400',glow:'bg-emerald-500/10',sub:'hudud'},
        {label:'Tumanlar',value:totalProvDists,color:'text-teal-400',dot:'bg-teal-400',glow:'bg-teal-500/10'},
        {label:'Maktablar',value:totalProvSchools,color:'text-cyan-400',dot:'bg-cyan-400',glow:'bg-cyan-500/10'},
        {label:"O'quvchilar",value:totalProvStudents,color:'text-amber-400',dot:'bg-amber-400',glow:'bg-amber-500/10',sub:'jami ro\'yxat'}
      ]} donut={{pct:0,color:'#64748b'}} bars={{data:provBars,color:'bg-emerald-400'}} progresses={[
        {label:'Maktablar',value:totalProvSchools,max:totalProvSchools||1,color:'bg-cyan-400'},
        {label:"O'quvchilar",value:totalProvStudents,max:totalProvStudents||1,color:'bg-amber-400'}
      ]} />
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {provinces.map(p => <NavCard key={p.id} icon={ICONS.prov} title={p.name} subtitle={`${p.districtCount||0} tuman · ${p.schoolCount||0} maktab`} onClick={() => pickProv(p)} stats={[
          {value:p.districtCount||0,label:'Tuman',color:'text-emerald-400',bg:'bg-emerald-500/[0.06]'},
          {value:p.schoolCount||0,label:'Maktab',color:'text-cyan-400',bg:'bg-cyan-500/[0.06]'},
          {value:p.studentCount||0,label:"O'quvchi",color:'text-amber-400',bg:'bg-amber-500/[0.06]'},
          {value:'—',label:'Davomat',color:'text-slate-500',bg:'bg-slate-500/[0.06]'}
        ]} />)}
      </div>}
    </div>);
  }

  const distTotalStudents = districts.reduce((s,d)=>s+(d.studentCount||0),0);
  const distTotalSchools = districts.reduce((s,d)=>s+(d.schoolCount||0),0);

  /* 2. District */
  if (!selDist && !isDirector) {
    const distBars = districts.slice(0,7).map(d => Math.min(100, (d.studentCount||0)/Math.max(1,distTotalStudents)*100*districts.length));
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">{!isAdmin && <BackBtn onClick={goProvs} />}<div><h1 className="text-xl font-bold text-white">{selProv.name}</h1><Breadcrumb items={['Davomat', selProv.name]} /></div></div>
      <StatDashboard title={`${selProv.name} statistikasi`} subtitle={`${districts.length} tuman bo'yicha`} cards={[
        {label:'Tumanlar',value:districts.length,color:'text-teal-400',dot:'bg-teal-400',glow:'bg-teal-500/10'},
        {label:'Maktablar',value:distTotalSchools,color:'text-cyan-400',dot:'bg-cyan-400',glow:'bg-cyan-500/10'},
        {label:"O'quvchilar",value:distTotalStudents,color:'text-amber-400',dot:'bg-amber-400',glow:'bg-amber-500/10'},
        {label:'Davomat',value:'—',color:'text-slate-500',dot:'bg-slate-500',glow:'bg-slate-500/10',sub:'ma\'lumot yo\'q'}
      ]} donut={{pct:0,color:'#64748b'}} bars={{data:distBars,color:'bg-teal-400'}} progresses={[
        {label:'Maktablar',value:distTotalSchools,max:distTotalSchools||1,color:'bg-cyan-400'},
        {label:"O'quvchilar",value:distTotalStudents,max:distTotalStudents||1,color:'bg-amber-400'}
      ]} />
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {districts.map(d => <NavCard key={d.id} icon={ICONS.dist} color="teal" title={d.name} subtitle={`${d.schoolCount||0} maktab · ${d.studentCount||0} o'quvchi`} onClick={() => pickDist(d)} stats={[
          {value:d.schoolCount||0,label:'Maktab',color:'text-cyan-400',bg:'bg-cyan-500/[0.06]'},
          {value:d.studentCount||0,label:"O'quvchi",color:'text-amber-400',bg:'bg-amber-500/[0.06]'}
        ]} />)}
      </div>}
    </div>);
  }

  const schTotalStudents = schools.reduce((s,x)=>s+(x.studentCount||0),0);

  /* 3. School */
  if (!selSchool && !isDirector) {
    const schBars = schools.map(s => Math.min(100, (s.studentCount||0)/Math.max(1,schTotalStudents)*100*schools.length));
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6"><BackBtn onClick={goDists} /><div><h1 className="text-xl font-bold text-white">{selDist.name}</h1><Breadcrumb items={['Davomat', selProv.name, selDist.name]} /></div></div>
      <StatDashboard title={`${selDist.name} statistikasi`} subtitle={`${schools.length} maktab bo'yicha`} cards={[
        {label:'Maktablar',value:schools.length,color:'text-cyan-400',dot:'bg-cyan-400',glow:'bg-cyan-500/10'},
        {label:"O'quvchilar",value:schTotalStudents,color:'text-amber-400',dot:'bg-amber-400',glow:'bg-amber-500/10'},
        {label:'Server',value:'—',color:'text-slate-500',dot:'bg-slate-500',glow:'bg-slate-500/10',sub:'ulanmagan'},
        {label:'Davomat',value:'—',color:'text-slate-500',dot:'bg-slate-500',glow:'bg-slate-500/10',sub:'ma\'lumot yo\'q'}
      ]} donut={{pct:0,color:'#64748b'}} bars={{data:schBars,color:'bg-cyan-400'}} progresses={[
        {label:"O'quvchilar",value:schTotalStudents,max:schTotalStudents||1,color:'bg-amber-400'}
      ]} />
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {schools.map(s => <NavCard key={s.id} icon={ICONS.school} color="cyan" title={s.name} subtitle={`${s.studentCount||0} o'quvchi`} onClick={() => pickSchool(s)} stats={[
          {value:s.studentCount||0,label:"O'quvchi",color:'text-amber-400',bg:'bg-amber-500/[0.06]'},
          {value:'—',label:'Davomat',color:'text-slate-500',bg:'bg-slate-500/[0.06]'}
        ]} />)}
      </div>}
    </div>);
  }

  /* 4. Attendance Dashboard */
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {!isDirector && <BackBtn onClick={goSchools} />}
          <div>
            <h1 className="text-xl font-bold text-white">{selSchool?.name} — Davomat</h1>
            <Breadcrumb items={isDirector ? ['Davomat'] : ['Davomat', selProv?.name, selDist?.name, selSchool?.name].filter(Boolean)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 [color-scheme:dark]" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {label:'Jami',value:totalStudents,color:'text-white',bg:'from-slate-500/10 to-slate-500/5',icon:'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z'},
          {label:'Kelgan',value:presentCount,color:'text-emerald-400',bg:'from-emerald-500/10 to-emerald-500/5',icon:'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},
          {label:'Kelmagan',value:absentCount,color:'text-red-400',bg:'from-red-500/10 to-red-500/5',icon:'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},
          {label:'Foiz',value:`${percentage}%`,color:'text-amber-400',bg:'from-amber-500/10 to-amber-500/5',icon:'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z'}
        ].map((c,i) => (
          <div key={i} className={`rounded-2xl bg-gradient-to-br ${c.bg} border border-emerald-500/[0.06] p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className={`w-4 h-4 ${c.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
              <span className="text-[10px] text-slate-600 uppercase">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Device Status */}
      <div className="mb-6 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.06] p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7" /></svg>
          Mini-PC Server holati
        </h3>
        {devices.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/10">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-xs text-amber-400 font-medium">Server ulanmagan</p>
              <p className="text-[10px] text-slate-600">Mini-PC serverni maktabga ulang va konfiguratsiya qiling</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">{devices.map(d => (
            <div key={d.id} className={`flex items-center justify-between py-3 px-4 rounded-xl ${d.online ? 'bg-emerald-500/[0.05] border border-emerald-500/10' : 'bg-red-500/[0.05] border border-red-500/10'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${d.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <div>
                  <p className={`text-xs font-medium ${d.online ? 'text-emerald-400' : 'text-red-400'}`}>{d.deviceName || d.deviceSerial}</p>
                  <p className="text-[10px] text-slate-600">{d.ipAddress || 'IP noma\'lum'} · {d.online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="text-right">
                {d.pendingEvents > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-medium">{d.pendingEvents} kutilmoqda</span>}
                <p className="text-[9px] text-slate-700 mt-0.5">Oxirgi: {new Date(d.lastSeen).toLocaleTimeString('uz')}</p>
              </div>
            </div>
          ))}</div>
        )}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Events Table */}
          <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-emerald-500/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Bugungi eventlar</h3>
              <span className="text-xs text-slate-600">{events.length} ta yozuv</span>
            </div>
            {events.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-emerald-500/[0.06]">
                  <th className="px-5 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Vaqt</th>
                  <th className="px-5 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Rasm</th>
                  <th className="px-5 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">O'quvchi</th>
                  <th className="px-5 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase">Turi</th>
                  <th className="px-5 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase">Harorat</th>
                </tr></thead>
                <tbody>{events.map(e => (
                  <tr key={e.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                    <td className="px-5 py-2 text-slate-400 text-xs font-mono">{new Date(e.timestamp).toLocaleTimeString('uz', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</td>
                    <td className="px-5 py-1.5">{e.studentPhoto ? <img src={e.studentPhoto} className="w-7 h-7 rounded-full object-cover border border-emerald-500/20" /> : <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-bold">{e.studentName?.charAt(0)}</div>}</td>
                    <td className="px-5 py-2 text-white text-xs">{e.studentName}</td>
                    <td className="px-5 py-2 text-center"><span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${e.type==='IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{e.type==='IN' ? '→ Kirdi' : '← Chiqdi'}</span></td>
                    <td className="px-5 py-2 text-center text-xs text-slate-500">{e.temperature ? `${e.temperature}°C` : '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-600 text-sm">Bugun uchun davomat ma'lumotlari yo'q</div>
            )}
          </div>

          {/* Student Attendance Grid */}
          <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
            <div className="px-5 py-3 border-b border-emerald-500/[0.06]">
              <h3 className="text-sm font-semibold text-white">O'quvchilar holati</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-4">
              {students.map(s => {
                const came = presentIds.has(s.id);
                return (
                  <div key={s.id} className={`flex items-center gap-2 py-2 px-3 rounded-xl border transition-colors ${came ? 'bg-emerald-500/[0.05] border-emerald-500/20' : 'bg-red-500/[0.03] border-red-500/10'}`}>
                    {s.photoUrl ? <img src={s.photoUrl} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">{s.fullName?.charAt(0)}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white truncate">{s.fullName}</p>
                      <p className={`text-[9px] ${came ? 'text-emerald-400' : 'text-red-400'}`}>{came ? '✓ Keldi' : '✗ Kelmadi'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
