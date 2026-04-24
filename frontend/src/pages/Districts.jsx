import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Input, Select } from '../components/CrudPage';

function Ring({ percent, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (percent / 100) * circ} strokeLinecap="round" className="transition-all duration-1000" />
    </svg>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ── Viloyat Card (bosish mumkin) ── */
function ProvinceSelector({ province, onClick }) {
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:border-emerald-500/25 transition-all duration-300 p-5 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">{province.name}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{province.districtCount} ta tuman</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-400">{province.districtCount}</p>
            <p className="text-[9px] text-slate-600">tuman</p>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </button>
  );
}

/* ── Tuman Card ── */
function DistrictCard({ item, onEdit, onDelete }) {
  return (
    <div className="group relative rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">{item.name}</h3>
            <p className="text-[11px] text-emerald-400/50 mt-0.5">{item.provinceName}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center shrink-0">
            <Ring percent={0} size={80} stroke={6} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white">0%</span>
              <span className="text-[8px] text-slate-600">davomat</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="text-center py-2 rounded-xl bg-cyan-500/[0.06]">
              <p className="text-lg font-bold text-cyan-400">{item.schoolCount || 0}</p>
              <p className="text-[9px] text-slate-500">Maktab</p>
            </div>
            <div className="text-center py-2 rounded-xl bg-amber-500/[0.06]">
              <p className="text-lg font-bold text-amber-400">{item.studentCount || 0}</p>
              <p className="text-[9px] text-slate-500">O'quvchi</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-emerald-500/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2"><span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
            <span className="text-[10px] text-emerald-400/70 font-medium">Faol</span>
          </div>
          <span className="text-[10px] text-slate-700">#{item.id}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function Districts({ user }) {
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [view, setView] = useState('card');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    api.get('/api/provinces').then(p => {
      setProvinces(p);
      // ADMIN avtomatik o'z viloyatiga yo'naltiriladi
      if (isAdmin && user?.provinceId) {
        const myProv = p.find(x => x.id === user.provinceId);
        if (myProv) { selectProvince(myProv); return; }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectProvince = async (prov) => {
    setSelectedProvince(prov);
    setLoading(true);
    try { setDistricts(await api.get(`/api/districts?provinceId=${prov.id}`)); } catch {}
    setLoading(false);
  };

  const goBack = () => { setSelectedProvince(null); setDistricts([]); setSearch(''); };

  const openAdd = () => { setEditing(null); setForm({ provinceId: selectedProvince?.id }); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/api/districts/${editing.id}`, form);
      else await api.post('/api/districts', form);
      setModal(false); selectProvince(selectedProvince);
      api.get('/api/provinces').then(setProvinces);
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await api.del(`/api/districts/${id}`); selectProvince(selectedProvince); api.get('/api/provinces').then(setProvinces); } catch (e) { alert(e.message); }
  };

  const filtered = districts.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));

  const ViewToggle = () => (
    <div className="flex rounded-xl border border-emerald-500/[0.1] overflow-hidden">
      <button onClick={() => setView('card')} className={`px-3 py-2 text-xs font-medium transition-colors ${view === 'card' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
      </button>
      <button onClick={() => setView('table')} className={`px-3 py-2 text-xs font-medium transition-colors ${view === 'table' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>
      </button>
    </div>
  );

  /* ── Viloyat tanlash bosqichi ── */
  if (!selectedProvince) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Tumanlar</h1>
            <p className="text-sm text-slate-500 mt-0.5">Viloyatni tanlang</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {provinces.map(p => <ProvinceSelector key={p.id} province={p} onClick={() => selectProvince(p)} />)}
          </div>
        )}
      </div>
    );
  }

  /* ── Tanlangan viloyat tumanlari ── */
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <button onClick={goBack} className="p-2 rounded-xl border border-emerald-500/[0.1] text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{selectedProvince.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{districts.length} ta tuman</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle />
          <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Qo'shish
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tuman nomi bo'yicha qidirish..."
          className="w-full max-w-xs h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => <DistrictCard key={item.id} item={item} onEdit={openEdit} onDelete={remove} />)}
          {filtered.length === 0 && <p className="col-span-3 text-center text-slate-600 py-12">Tuman topilmadi</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-emerald-500/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">№</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nomi</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Maktablar</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">O'quvchilar</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
            </tr></thead>
            <tbody>{filtered.map((item, i) => (
              <tr key={item.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                <td className="px-5 py-3 text-slate-600">{i + 1}</td>
                <td className="px-5 py-3 text-white font-medium">{item.name}</td>
                <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium">{item.schoolCount || 0}</span></td>
                <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium">{item.studentCount || 0}</span></td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mr-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
                  <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Tahrirlash' : `Yangi tuman — ${selectedProvince.name}`}>
        <Input label="Tuman nomi" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Chilonzor" />
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
          <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
        </div>
      </Modal>
    </div>
  );
}
