import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';
import ConfirmModal from '../components/ConfirmModal';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <svg className="w-3 h-3 text-slate-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
          <span className={i === items.length - 1 ? 'text-emerald-400 font-medium' : 'text-slate-600'}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="p-2 rounded-xl border border-emerald-500/[0.1] text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-colors shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
    </button>
  );
}

function NavCard({ icon, title, subtitle, color = 'emerald', onClick, stats }) {
  const colors = { emerald: 'from-emerald-500/20 to-cyan-500/10 text-emerald-400', teal: 'from-teal-500/20 to-emerald-500/10 text-teal-400', cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400' };
  const glows = { emerald: 'from-emerald-500/[0.04]', teal: 'from-teal-500/[0.04]', cyan: 'from-cyan-500/[0.04]' };
  const hoverColor = { emerald: 'text-emerald-300', teal: 'text-teal-300', cyan: 'text-cyan-300' };
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${glows[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/[0.05] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="relative p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold text-white group-hover:${hoverColor[color]} transition-colors truncate`}>{title}</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>
          </div>
          <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </div>
        {stats && <div className="grid grid-cols-2 gap-1.5">
          {stats.map((s, i) => <div key={i} className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg ${s.bg}`}>
            <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
            <span className="text-[7px] text-slate-600">{s.label}</span>
          </div>)}
        </div>}
      </div>
    </button>
  );
}

function StudentCard({ s, onEdit, onDelete }) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {s.photoUrl ? (
              <img src={s.photoUrl} alt={s.fullName} className="w-11 h-11 rounded-full object-cover shrink-0 border border-emerald-500/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                {s.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{s.fullName}</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">{s.birthDate || 'Sana kiritilmagan'}</p>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="py-1.5 px-3 rounded-lg bg-emerald-500/[0.05] text-center">
            <p className="text-xs font-bold text-emerald-400">0%</p>
            <p className="text-[8px] text-slate-600 uppercase">Davomat</p>
          </div>
          <div className="py-1.5 px-3 rounded-lg bg-cyan-500/[0.05] text-center">
            <p className="text-xs font-bold text-cyan-400">{s.schoolName || '—'}</p>
            <p className="text-[8px] text-slate-600 uppercase">Maktab</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader = () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
const ICONS = { prov: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21', dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z', school: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21', cls: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' };
const CLASS_COLORS = ['','bg-red-500/10 text-red-400','bg-orange-500/10 text-orange-400','bg-amber-500/10 text-amber-400','bg-yellow-500/10 text-yellow-400','bg-lime-500/10 text-lime-400','bg-emerald-500/10 text-emerald-400','bg-teal-500/10 text-teal-400','bg-cyan-500/10 text-cyan-400','bg-blue-500/10 text-blue-400','bg-indigo-500/10 text-indigo-400','bg-violet-500/10 text-violet-400'];

export default function Students({ user }) {
  const [provinces, setProvinces] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selProv, setSelProv] = useState(null);
  const [selDist, setSelDist] = useState(null);
  const [selSchool, setSelSchool] = useState(null);
  const [selClass, setSelClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [view, setView] = useState('card');
  const [profile, setProfile] = useState(null);
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
      setSelSchool(s); setClasses(await api.get(`/api/classes?schoolId=${user.schoolId}`));
    } catch {}
    setLoading(false);
  };

  const pickProv = (p, dists) => { setSelProv(p); setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); setDistricts((dists || allDistricts).filter(d => d.provinceId == p.id)); setLoading(false); };
  const pickDist = async (d) => { setSelDist(d); setSelSchool(null); setSelClass(null); setLoading(true); setSearch(''); try { setSchools(await api.get(`/api/schools?districtId=${d.id}`)); } catch {} setLoading(false); };
  const pickSchool = async (s) => { setSelSchool(s); setSelClass(null); setLoading(true); setSearch(''); try { setClasses(await api.get(`/api/classes?schoolId=${s.id}`)); } catch {} setLoading(false); };
  const pickClass = async (c) => { setSelClass(c); setLoading(true); setSearch(''); try { setStudents(await api.get(`/api/students?classId=${c.id}`)); } catch {} setLoading(false); };

  const goProvs = () => { setSelProv(null); setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); };
  const goDists = () => { setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); };
  const goSchools = () => { setSelSchool(null); setSelClass(null); setSearch(''); };
  const goClasses = () => { setSelClass(null); setSearch(''); };

  const openAdd = () => { setEditing(null); setForm({ schoolId: selSchool?.id, classId: selClass?.id }); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setModal(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/api/students/${editing.id}`, form);
      else await api.post('/api/students', form);
      setModal(false); if (selClass) await pickClass(selClass); else if (selSchool) await pickSchool(selSchool);
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => {
    try { await api.del(`/api/students/${id}`); setDeleteId(null); if (selClass) await pickClass(selClass); else if (selSchool) await pickSchool(selSchool); } catch (e) { alert(e.message); }
  };

  const filtered = students.filter(s => s.fullName?.toLowerCase().includes(search.toLowerCase()));

  /* 1. Viloyat */
  if (!selProv && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-xl font-bold text-white">O'quvchilar</h1><p className="text-sm text-slate-500 mt-0.5">Viloyatni tanlang</p></div>
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
        {provinces.map(p => <NavCard key={p.id} icon={ICONS.prov} title={p.name} subtitle={`${p.studentCount||0} o'quvchi`} onClick={() => pickProv(p)} stats={[{value:p.districtCount,label:'Tuman',color:'text-emerald-400',bg:'bg-emerald-500/[0.06]'},{value:p.schoolCount||0,label:'Maktab',color:'text-cyan-400',bg:'bg-cyan-500/[0.06]'}]} />)}
      </div>}
    </div>);
  }

  /* 2. Tuman */
  if (!selDist && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">{!isAdmin && <BackBtn onClick={goProvs} />}<div><h1 className="text-xl font-bold text-white">{selProv.name}</h1><Breadcrumb items={["O'quvchilar", selProv.name]} /></div></div>
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
        {districts.map(d => <NavCard key={d.id} icon={ICONS.dist} color="teal" title={d.name} subtitle={`${d.studentCount||0} o'quvchi`} onClick={() => pickDist(d)} stats={[{value:d.schoolCount||0,label:'Maktab',color:'text-teal-400',bg:'bg-teal-500/[0.06]'},{value:d.studentCount||0,label:"O'quvchi",color:'text-amber-400',bg:'bg-amber-500/[0.06]'}]} />)}
        {!districts.length && <p className="col-span-full text-center text-slate-600 py-12">Tuman topilmadi</p>}
      </div>}
    </div>);
  }

  /* 3. Maktab */
  if (!selSchool && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6"><BackBtn onClick={goDists} /><div><h1 className="text-xl font-bold text-white">{selDist.name}</h1><Breadcrumb items={["O'quvchilar", selProv.name, selDist.name]} /></div></div>
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
        {schools.map(s => <NavCard key={s.id} icon={ICONS.school} color="cyan" title={s.name} subtitle={`${s.studentCount||0} o'quvchi`} onClick={() => pickSchool(s)} stats={[{value:s.studentCount||0,label:"O'quvchi",color:'text-cyan-400',bg:'bg-cyan-500/[0.06]'},{value:'0%',label:'Davomat',color:'text-emerald-400',bg:'bg-emerald-500/[0.06]'}]} />)}
        {!schools.length && <p className="col-span-full text-center text-slate-600 py-12">Maktab topilmadi</p>}
      </div>}
    </div>);
  }

  /* 4. Sinf tanlash */
  if (!selClass && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6"><BackBtn onClick={goSchools} /><div><h1 className="text-xl font-bold text-white">{selSchool?.name}</h1><Breadcrumb items={["O'quvchilar", selProv?.name, selDist?.name, selSchool?.name].filter(Boolean)} /></div></div>
      {loading ? <Loader /> : classes.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
          {classes.map(c => (
            <button key={c.id} onClick={() => pickClass(c)} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${CLASS_COLORS[c.grade]||'bg-slate-500/10 text-slate-400'}`}>{c.name}</div>
                  <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  <span className="text-xs text-amber-400 font-semibold">{c.studentCount||0}</span>
                  <span className="text-[9px] text-slate-600">o'quvchi</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (<div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-12 text-center"><p className="text-slate-600 text-sm">Bu maktabda hali sinf yo'q</p><p className="text-[10px] text-slate-500 mt-1">Sinflar bo'limidan sinf qo'shing</p></div>)}
    </div>);
  }

  /* Director uchun sinf tanlash */
  if (!selClass && isDirector) {
    return (<div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-xl font-bold text-white">{selSchool?.name || 'O\'quvchilar'}</h1><p className="text-sm text-slate-500">Sinfni tanlang</p></div>
      {loading ? <Loader /> : classes.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
          {classes.map(c => (
            <button key={c.id} onClick={() => pickClass(c)} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative"><div className="flex items-center justify-between mb-3"><div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${CLASS_COLORS[c.grade]||'bg-slate-500/10 text-slate-400'}`}>{c.name}</div><svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></div>
                <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg><span className="text-xs text-amber-400 font-semibold">{c.studentCount||0}</span><span className="text-[9px] text-slate-600">o'quvchi</span></div>
              </div>
            </button>
          ))}
        </div>
      ) : (<div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-12 text-center"><p className="text-slate-600 text-sm">Bu maktabda hali sinf yo'q</p></div>)}
    </div>);
  }

  /* 5. O'quvchilar */
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackBtn onClick={goClasses} />
          <div>
            <h1 className="text-xl font-bold text-white">{selClass?.name} — {selSchool?.name || 'Maktab'}</h1>
            <Breadcrumb items={isDirector ? ["O'quvchilar", selSchool?.name, selClass?.name] : ["O'quvchilar", selProv?.name, selDist?.name, selSchool?.name, selClass?.name].filter(Boolean)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-emerald-500/[0.1] overflow-hidden">
            <button onClick={() => setView('card')} className={`px-3 py-1.5 text-xs transition-colors ${view==='card' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-xs transition-colors ${view==='table' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>
            </button>
          </div>
          <span className="text-sm text-slate-500">{filtered.length} ta</span>
          <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Qo'shish
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ism bo'yicha qidirish..."
          className="w-full max-w-xs h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {loading ? <Loader /> : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
          {filtered.map(s => <div key={s.id} onClick={() => setProfile(s)} className="cursor-pointer"><StudentCard s={s} onEdit={openEdit} onDelete={setDeleteId} /></div>)}
          {!filtered.length && <p className="col-span-full text-center text-slate-600 py-12">O'quvchi topilmadi</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-emerald-500/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">№</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rasm</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">F.I.O</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Face ID</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Maktab</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Davomat</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
            </tr></thead>
            <tbody>{filtered.map((s, i) => (
              <tr key={s.id} onClick={() => setProfile(s)} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors cursor-pointer">
                <td className="px-5 py-3 text-slate-600">{i+1}</td>
                <td className="px-5 py-2">{s.photoUrl ? <img src={s.photoUrl} className="w-8 h-8 rounded-full object-cover border border-emerald-500/20" /> : <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">{s.fullName?.charAt(0)}</div>}</td>
                <td className="px-5 py-3 text-white font-medium">{s.fullName}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs font-mono">{s.faceId}</span></td>
                <td className="px-5 py-3 text-slate-400 text-xs">{s.schoolName}</td>
                <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">0%</span></td>
                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mr-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Student Profile Panel */}
      {profile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setProfile(null)}>
          <div className="w-full max-w-lg bg-[#0a120e] border-l border-emerald-500/[0.1] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="h-32 bg-gradient-to-br from-emerald-900/40 to-teal-900/20" />
              <button onClick={() => setProfile(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute -bottom-12 left-6">
                {profile.photoUrl ? <img src={profile.photoUrl} className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0a120e] shadow-xl" /> : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border-4 border-[#0a120e] flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-xl">{profile.fullName?.charAt(0)}</div>}
              </div>
            </div>
            <div className="px-6 pt-16 pb-6">
              <h2 className="text-xl font-bold text-white">{profile.fullName}</h2>
              <p className="text-sm text-slate-500 mt-1">{selSchool?.name || profile.schoolName}</p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  {l:"Tug'ilgan sana",v:profile.birthDate || '—',c:'text-white'},
                  {l:'Face ID',v:profile.faceId,c:'text-emerald-400 font-mono text-xs'},
                  {l:'ID raqam',v:`#${profile.id}`,c:'text-cyan-400 font-mono'},
                  {l:'Maktab',v:profile.schoolName,c:'text-white'},
                  {l:'Holat',v:'Faol',c:'text-emerald-400',dot:true},
                  {l:'Server',v:selSchool?.name ? 'Biriktirilgan' : 'Yo\'q',c:selSchool?.name?'text-emerald-400':'text-slate-500',dot:true}
                ].map((x,i) => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-emerald-500/[0.06] p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">{x.l}</p>
                    <div className="flex items-center gap-1.5 mt-1">{x.dot && <span className={`w-2 h-2 rounded-full ${x.c.includes('emerald')?'bg-emerald-400':'bg-slate-600'}`} />}<p className={`text-sm ${x.c}`}>{x.v}</p></div>
                  </div>
                ))}
              </div>
              {/* Server Info */}
              <div className="mt-4 py-3 px-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>
                  <p className="text-xs font-semibold text-cyan-400">Mini-PC Server</p>
                </div>
                <p className="text-[10px] text-slate-500">Face ID qurilmaga yuborilgandan so'ng o'quvchi yuzini ro'yxatdan o'tkazish uchun terminal oldiga turishi kerak</p>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>Davomat statistikasi</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[{v:'0',l:'Kelgan',c:'text-emerald-400',bg:'bg-emerald-500/[0.06]'},{v:'0',l:'Kelmagan',c:'text-red-400',bg:'bg-red-500/[0.06]'},{v:'0%',l:'Foiz',c:'text-amber-400',bg:'bg-amber-500/[0.06]'}].map((x,i) => (
                    <div key={i} className={`rounded-xl ${x.bg} p-3 text-center`}><p className={`text-lg font-bold ${x.c}`}>{x.v}</p><p className="text-[9px] text-slate-600 uppercase">{x.l}</p></div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>Haftalik davomat</h3>
                <div className="flex items-end gap-1.5 h-20">
                  {['Du','Se','Cho','Pa','Ju'].map((d, i) => {const h = [65,80,45,90,70][i]; return (<div key={d} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t-md bg-emerald-500/20 relative overflow-hidden" style={{height:`${h}%`}}><div className="absolute inset-x-0 bottom-0 bg-emerald-500/40 rounded-t-md" style={{height:`${h}%`}} /></div><span className="text-[8px] text-slate-600">{d}</span></div>);})}
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3">So'nggi faoliyat</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]"><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /><div><p className="text-xs text-white">Tizimga qo'shildi</p><p className="text-[10px] text-slate-600">Bugun</p></div></div>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]"><div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" /><div><p className="text-xs text-slate-400">Davomat ma'lumotlari yo'q</p><p className="text-[10px] text-slate-600">Face ID qurilma ulanmagan</p></div></div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setProfile(null); openEdit(profile); }} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>Tahrirlash
                </button>
                <button onClick={() => { setProfile(null); setDeleteId(profile.id); }} className="h-10 px-5 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>O'chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Tahrirlash' : `Yangi o'quvchi`}>
        <Input label="Ism va familiya" value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Masalan: Karimov Jasur" />
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tug'ilgan sana</label>
          <input type="date" value={form.birthDate || ''} onChange={e => setForm({ ...form, birthDate: e.target.value })}
            className="mt-1.5 w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors [color-scheme:dark]" />
        </div>
        {/* Photo Upload */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rasm</label>
          {form.photoUrl ? (
            <div className="mt-1.5 relative group">
              <img src={form.photoUrl} className="w-full h-40 object-cover rounded-xl border border-emerald-500/20" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <label className="mt-1.5 flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-emerald-500/20 hover:border-emerald-500/40 bg-white/[0.02] cursor-pointer transition-colors">
              <svg className="w-8 h-8 text-emerald-500/40 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              <span className="text-xs text-slate-500">Rasmni tanlang yoki bu yerga tashlang</span>
              <span className="text-[10px] text-slate-600 mt-0.5">JPG, PNG, WEBP · 10MB gacha</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const res = await api.upload(file);
                  setForm(f => ({ ...f, photoUrl: res.url }));
                } catch (err) { alert('Rasm yuklanmadi: ' + err.message); }
              }} />
            </label>
          )}
        </div>
        {editing && (
          <div className="mt-2 py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase">Face ID (avtomatik)</p>
            <p className="text-sm font-mono text-emerald-400 mt-0.5">{form.faceId}</p>
          </div>
        )}
        {!editing && (
          <div className="mt-2 py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10">
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Face ID avtomatik yaratiladi
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Rasm mini-PC serverga yuboriladi → Face ID qurilmaga yuklanadi</p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
          <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => remove(deleteId)} />
    </div>
  );
}

