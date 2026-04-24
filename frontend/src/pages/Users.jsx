import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const ROLES = [
  { value: 'ADMIN', label: 'Admin (Viloyat)', icon: '🛡️', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'DIRECTOR', label: 'Direktor', icon: '🏫', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'MUDIR', label: "O'quv mudir", icon: '📋', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'TEACHER', label: "O'qituvchi", icon: '👨‍🏫', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
];
const ROLE_COLORS = { SUPERADMIN:'bg-red-500/10 text-red-400', ADMIN:'bg-amber-500/10 text-amber-400', DIRECTOR:'bg-emerald-500/10 text-emerald-400', MUDIR:'bg-cyan-500/10 text-cyan-400', TEACHER:'bg-violet-500/10 text-violet-400' };
const ROLE_LABELS = { SUPERADMIN:'Super Admin', ADMIN:'Viloyat Admin', DIRECTOR:'Direktor', MUDIR:"O'quv mudir", TEACHER:"O'qituvchi" };

function Modal({open, onClose, title, children}) {
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}><div className="w-full max-w-lg rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><h3 className="text-lg font-semibold text-white mb-5">{title}</h3>{children}</div></div>);
}

function Field({label, children}) {
  return (<div className="mb-4"><label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label><div className="mt-1.5">{children}</div></div>);
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [allSchools, setAllSchools] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [u, p, d, s] = await Promise.all([
        api.get('/api/users'), api.get('/api/provinces'), api.get('/api/districts'), api.get('/api/schools')
      ]);
      setUsers(u); setProvinces(p); setAllDistricts(d); setAllSchools(s);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Form cascading filters
  useEffect(() => {
    if (form.provinceId) setDistricts(allDistricts.filter(d => d.provinceId == form.provinceId));
    else setDistricts([]);
  }, [form.provinceId, allDistricts]);
  useEffect(() => {
    if (form.districtId) setSchools(allSchools.filter(s => s.districtId == form.districtId));
    else if (form.provinceId) {
      const dIds = allDistricts.filter(d => d.provinceId == form.provinceId).map(d => d.id);
      setSchools(allSchools.filter(s => dIds.includes(s.districtId)));
    } else setSchools(allSchools);
  }, [form.districtId, form.provinceId, allDistricts, allSchools]);

  const openAdd = () => { setEditing(null); setForm({}); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({...item}); setModal(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/api/users/${editing.id}`, form);
      else await api.post('/api/users', form);
      setModal(false); load();
    } catch(e) { alert(e.message); }
  };
  const remove = async (id) => { try { await api.del(`/api/users/${id}`); setDeleteId(null); load(); } catch(e) { alert(e.message); } };

  const set = (k,v) => {
    const next = {...form, [k]:v};
    if (k === 'role') { next.provinceId = ''; next.districtId = ''; next.schoolId = ''; }
    if (k === 'provinceId') { next.districtId = ''; next.schoolId = ''; }
    if (k === 'districtId') { next.schoolId = ''; }
    setForm(next);
  };

  const filtered = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.fullName||'').toLowerCase().includes(s) || (u.username||'').toLowerCase().includes(s);
    }
    return true;
  });

  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role]||0)+1; });

  const getSchoolName = (u) => { const s = allSchools.find(x=>x.id==u.schoolId); return s?.name||''; };
  const getProvName = (u) => { const p = provinces.find(x=>x.id==u.provinceId); return p?.name||''; };

  const inputCls = "w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors";
  const selectCls = "w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-white">Foydalanuvchilar</h1><p className="text-sm text-slate-500 mt-0.5">{users.length} ta foydalanuvchi</p></div>
        <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Qo'shish
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        <button onClick={()=>setRoleFilter('')} className={`rounded-xl p-3 border transition-colors ${!roleFilter ? 'bg-emerald-500/10 border-emerald-500/30':'bg-white/[0.02] border-white/[0.04] hover:border-emerald-500/20'}`}>
          <span className="text-[9px] text-slate-600 uppercase">Barchasi</span>
          <p className="text-xl font-bold text-white mt-1">{users.length}</p>
        </button>
        {ROLES.map(r => (
          <button key={r.value} onClick={()=>setRoleFilter(rf=>rf===r.value?'':r.value)} className={`rounded-xl p-3 border transition-colors ${roleFilter===r.value ? 'bg-emerald-500/10 border-emerald-500/30':'bg-white/[0.02] border-white/[0.04] hover:border-emerald-500/20'}`}>
            <span className="text-[9px] text-slate-600 uppercase">{r.icon} {r.label}</span>
            <p className="text-xl font-bold text-white mt-1">{roleCounts[r.value]||0}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ism yoki login bo'yicha qidirish..."
          className="w-full max-w-sm h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-emerald-500/[0.06]">
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase w-8">№</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase">F.I.O</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase">Login</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase">Rol</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase">Biriktirma</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase w-24">Amallar</th>
          </tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={6} className="px-5 py-12 text-center text-slate-600">Yuklanmoqda...</td></tr>)
            : filtered.length === 0 ? (<tr><td colSpan={6} className="px-5 py-12 text-center text-slate-600">Ma'lumot topilmadi</td></tr>)
            : filtered.map((u,i) => (
              <tr key={u.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                <td className="px-5 py-3 text-slate-600 text-xs">{i+1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">{u.fullName?.charAt(0)||'?'}</div>
                    <span className="text-white text-sm font-medium">{u.fullName}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-xs font-mono">{u.username}</td>
                <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${ROLE_COLORS[u.role]||''}`}>{ROLE_LABELS[u.role]||u.role}</span></td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {u.role==='ADMIN' && getProvName(u) && <span className="px-2 py-0.5 rounded-md bg-amber-500/[0.06] text-amber-400/80 text-[10px]">📍 {getProvName(u)}</span>}
                  {['DIRECTOR','MUDIR','TEACHER'].includes(u.role) && getSchoolName(u) && <span className="px-2 py-0.5 rounded-md bg-cyan-500/[0.06] text-cyan-400/80 text-[10px]">🏫 {getSchoolName(u)}</span>}
                  {u.role==='SUPERADMIN' && <span className="text-[10px] text-slate-600">Butun tizim</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  {u.role !== 'SUPERADMIN' && <>
                    <button onClick={()=>openEdit(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mr-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onClick={()=>setDeleteId(u.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}>
        <Field label="To'liq ism"><input className={inputCls} value={form.fullName||''} onChange={e=>set('fullName',e.target.value)} placeholder="Masalan: Karimov Ali" /></Field>
        <Field label="Login"><input className={inputCls} value={form.username||''} onChange={e=>set('username',e.target.value)} placeholder="karimov_ali" /></Field>
        <Field label={editing ? "Yangi parol (bo'sh qoldiring agar o'zgartirmasangiz)" : "Parol"}><input type="password" className={inputCls} value={form.password||''} onChange={e=>set('password',e.target.value)} placeholder="••••••" /></Field>

        {/* Role selection as cards */}
        <Field label="Rol">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button key={r.value} type="button" onClick={()=>set('role',r.value)}
                className={`p-3 rounded-xl border text-left transition-all ${form.role===r.value ? r.color+' border-current scale-[1.02]' : 'bg-white/[0.02] border-white/[0.05] hover:border-emerald-500/20 text-slate-400'}`}>
                <span className="text-lg">{r.icon}</span>
                <p className="text-xs font-semibold mt-1">{r.label}</p>
              </button>
            ))}
          </div>
        </Field>

        {/* ADMIN → Province */}
        {form.role === 'ADMIN' && (
          <Field label="📍 Viloyat">
            <select className={selectCls} value={form.provinceId||''} onChange={e=>set('provinceId',e.target.value)}>
              <option value="">Viloyatni tanlang...</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}

        {/* DIRECTOR / MUDIR / TEACHER → Province → District → School */}
        {['DIRECTOR','MUDIR','TEACHER'].includes(form.role) && (<>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 mb-4 space-y-3">
            <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">🏫 Maktabga biriktirish</p>
            <div>
              <label className="text-[10px] text-slate-600">Viloyat</label>
              <select className={selectCls + ' mt-1'} value={form.provinceId||''} onChange={e=>set('provinceId',e.target.value)}>
                <option value="">Tanlang...</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {form.provinceId && (
              <div>
                <label className="text-[10px] text-slate-600">Tuman</label>
                <select className={selectCls + ' mt-1'} value={form.districtId||''} onChange={e=>set('districtId',e.target.value)}>
                  <option value="">Tanlang...</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] text-slate-600">Maktab</label>
              <select className={selectCls + ' mt-1'} value={form.schoolId||''} onChange={e=>set('schoolId',e.target.value)}>
                <option value="">Tanlang...</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </>)}

        <div className="flex gap-3 mt-6">
          <button onClick={()=>setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
          <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteId} onCancel={()=>setDeleteId(null)} onConfirm={()=>remove(deleteId)} />
    </div>
  );
}
