import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function Classes() {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allDist, setAllDist] = useState([]);
  const [allSchools, setAllSchools] = useState([]);
  const [selProv, setSelProv] = useState('');
  const [selDist, setSelDist] = useState('');
  const [selSchool, setSelSchool] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/provinces'), api.get('/api/districts'), api.get('/api/schools')])
      .then(([p,d,s]) => { setProvinces(p); setAllDist(d); setAllSchools(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selProv) setDistricts(allDist.filter(d => d.provinceId == selProv));
    else setDistricts([]);
  }, [selProv, allDist]);

  useEffect(() => {
    if (selDist) setSchools(allSchools.filter(s => s.districtId == selDist));
    else if (selProv) {
      const dIds = allDist.filter(d => d.provinceId == selProv).map(d => d.id);
      setSchools(allSchools.filter(s => dIds.includes(s.districtId)));
    } else setSchools(allSchools);
  }, [selDist, selProv, allDist, allSchools]);

  useEffect(() => {
    if (selSchool) {
      setLoading(true);
      api.get(`/api/classes?schoolId=${selSchool}`).then(setClasses).catch(()=>setClasses([])).finally(()=>setLoading(false));
    } else setClasses([]);
  }, [selSchool]);

  const openAdd = () => { setEditing(null); setForm({ schoolId: selSchool, grade: '', section: '', name: '' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({...c}); setModal(true); };
  const save = async () => {
    try {
      const data = { ...form, name: form.name || `${form.grade}-${form.section}` };
      if (editing) await api.put(`/api/classes/${editing.id}`, data);
      else await api.post('/api/classes', data);
      setModal(false);
      if (selSchool) { const r = await api.get(`/api/classes?schoolId=${selSchool}`); setClasses(r); }
    } catch(e) { alert(e.message); }
  };
  const remove = async (id) => {
    try { await api.del(`/api/classes/${id}`); setDeleteId(null);
      if (selSchool) { const r = await api.get(`/api/classes?schoolId=${selSchool}`); setClasses(r); }
    } catch(e) { alert(e.message); }
  };

  useEffect(() => { if (form.grade && form.section) setForm(f => ({...f, name: `${f.grade}-${f.section}`})); }, [form.grade, form.section]);

  const filtered = classes.filter(c => !search || (c.name||'').toLowerCase().includes(search.toLowerCase()));
  const selSchoolObj = allSchools.find(s => s.id == selSchool);
  const inputCls = "w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors";
  const selectCls = "w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors";

  const gradeColors = ['','bg-red-500/10 text-red-400','bg-orange-500/10 text-orange-400','bg-amber-500/10 text-amber-400','bg-yellow-500/10 text-yellow-400','bg-lime-500/10 text-lime-400','bg-emerald-500/10 text-emerald-400','bg-teal-500/10 text-teal-400','bg-cyan-500/10 text-cyan-400','bg-blue-500/10 text-blue-400','bg-indigo-500/10 text-indigo-400','bg-violet-500/10 text-violet-400'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-white">Sinflar</h1><p className="text-sm text-slate-500 mt-0.5">Maktab sinflarini boshqarish</p></div>
        {selSchool && <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Sinf qo'shish
        </button>}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="text-[10px] text-slate-600 uppercase mb-1 block">Viloyat</label>
          <select className={selectCls} value={selProv} onChange={e=>{setSelProv(e.target.value);setSelDist('');setSelSchool('');}}>
            <option value="">Barchasi</option>
            {provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-600 uppercase mb-1 block">Tuman</label>
          <select className={selectCls} value={selDist} onChange={e=>{setSelDist(e.target.value);setSelSchool('');}}>
            <option value="">Barchasi</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-600 uppercase mb-1 block">Maktab</label>
          <select className={selectCls} value={selSchool} onChange={e=>setSelSchool(e.target.value)}>
            <option value="">Tanlang...</option>
            {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {!selSchool ? (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-16 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-700 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
          <p className="text-slate-600 text-sm">Sinflarni ko'rish uchun maktabni tanlang</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (<>
        {/* School info + stats */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" /></svg>
              </div>
              <div><h2 className="text-sm font-semibold text-white">{selSchoolObj?.name}</h2><p className="text-[10px] text-slate-600">{selSchoolObj?.districtName} · {selSchoolObj?.provinceName}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
              <p className="text-xl font-bold text-cyan-400">{classes.length}</p><span className="text-[9px] text-slate-600">Sinflar</span>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{selSchoolObj?.studentCount||0}</p><span className="text-[9px] text-slate-600">O'quvchilar</span>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{classes.reduce((s,c)=>s+(c.studentCount||0),0)}</p><span className="text-[9px] text-slate-600">Sinfga biriktirilgan</span>
            </div>
          </div>
        </div>

        {/* Search */}
        {classes.length > 0 && <div className="mb-4"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sinf nomi bo'yicha qidirish..." className="w-full max-w-sm h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" /></div>}

        {/* Classes grid */}
        {filtered.length > 0 ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
            {filtered.map(c => (
              <div key={c.id} className="group rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${gradeColors[c.grade]||'bg-slate-500/10 text-slate-400'}`}>{c.name}</div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(c)} className="p-1 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      </button>
                      <button onClick={()=>setDeleteId(c.id)} className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                      <span className="text-xs text-amber-400 font-semibold">{c.studentCount||0}</span>
                      <span className="text-[9px] text-slate-600">o'quvchi</span>
                    </div>
                    {c.grade && <span className="text-[9px] text-slate-700">{c.grade}-sinf</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-12 text-center">
            <p className="text-slate-600 text-sm">Bu maktabda hali sinf yo'q</p>
            <button onClick={openAdd} className="mt-3 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">+ Sinf qo'shish</button>
          </div>
        )}
      </>)}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={()=>setModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 animate-slide-up" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-5">{editing ? 'Sinfni tahrirlash' : 'Yangi sinf'}</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Sinf raqami</label>
                <select className={selectCls + ' mt-1.5'} value={form.grade||''} onChange={e=>setForm({...form,grade:e.target.value})}>
                  <option value="">Tanlang</option>
                  {[1,2,3,4,5,6,7,8,9,10,11].map(g=><option key={g} value={g}>{g}-sinf</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Bo'lim</label>
                <select className={selectCls + ' mt-1.5'} value={form.section||''} onChange={e=>setForm({...form,section:e.target.value})}>
                  <option value="">Tanlang</option>
                  {['A','B','C','D','E','F','G','H'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 uppercase">Sinf nomi</label>
              <input className={inputCls + ' mt-1.5'} value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Masalan: 5-A" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
              <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleteId} onCancel={()=>setDeleteId(null)} onConfirm={()=>remove(deleteId)} />
    </div>
  );
}
