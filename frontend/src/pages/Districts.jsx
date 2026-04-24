import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';

function Ring({ percent, size = 72, stroke = 6 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ - (percent / 100) * circ} strokeLinecap="round" className="transition-all duration-1000" />
      <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
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

/* ── Mini bar chart ── */
function MiniBar({ count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return <div className="h-1 rounded-full bg-emerald-500/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" style={{ width: `${Math.max(pct, 4)}%` }} /></div>;
}

/* ══ VILOYAT CARD — premium ══ */
function ProvinceCard({ province, maxDistricts, onClick }) {
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-400 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-emerald-500/[0.04] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative p-5">
        {/* Top */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">{province.name}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">{province.districtCount} ta tuman · {province.schoolCount || 0} maktab</p>
          </div>
          <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center py-1.5 rounded-lg bg-emerald-500/[0.05]">
            <p className="text-sm font-bold text-emerald-400">{province.districtCount}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-wider">Tuman</p>
          </div>
          <div className="text-center py-1.5 rounded-lg bg-cyan-500/[0.05]">
            <p className="text-sm font-bold text-cyan-400">{province.schoolCount || 0}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-wider">Maktab</p>
          </div>
          <div className="text-center py-1.5 rounded-lg bg-amber-500/[0.05]">
            <p className="text-sm font-bold text-amber-400">{province.studentCount || 0}</p>
            <p className="text-[8px] text-slate-600 uppercase tracking-wider">O'quvchi</p>
          </div>
        </div>

        {/* Progress bar */}
        <MiniBar count={province.districtCount} max={maxDistricts} />
      </div>
    </button>
  );
}

/* ══ TUMAN CARD — premium ══ */
function DistrictCard({ item, onEdit, onDelete }) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-500/[0.04] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white group-hover:text-emerald-300 transition-colors">{item.name}</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">{item.provinceName}</p>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
            </button>
          </div>
        </div>

        {/* Chart + Stats */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center shrink-0">
            <Ring percent={0} size={72} stroke={5} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white">0%</span>
              <span className="text-[7px] text-slate-600 uppercase tracking-wider">davomat</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-cyan-500/[0.05]">
              <span className="text-[10px] text-slate-500">Maktablar</span>
              <span className="text-sm font-bold text-cyan-400">{item.schoolCount || 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-500/[0.05]">
              <span className="text-[10px] text-slate-500">O'quvchilar</span>
              <span className="text-sm font-bold text-amber-400">{item.studentCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.03]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5"><span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
            <span className="text-[10px] text-emerald-400/60 font-medium">Faol</span>
          </div>
          <span className="text-[9px] text-slate-700 font-mono">ID: {item.id}</span>
        </div>
      </div>
    </div>
  );
}

/* ══ ViewToggle ══ */
function ViewToggle({ view, setView }) {
  return (
    <div className="flex rounded-xl border border-emerald-500/[0.1] overflow-hidden">
      {[['card','M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z'],
        ['table','M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5']].map(([v, d]) => (
        <button key={v} onClick={() => setView(v)} className={`px-3 py-2 transition-colors ${view === v ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
        </button>
      ))}
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
      if (isAdmin && user?.provinceId) {
        const my = p.find(x => x.id === user.provinceId);
        if (my) { selectProvince(my); return; }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectProvince = async (prov) => {
    setSelectedProvince(prov); setLoading(true);
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
      setModal(false); selectProvince(selectedProvince); api.get('/api/provinces').then(setProvinces);
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await api.del(`/api/districts/${id}`); selectProvince(selectedProvince); api.get('/api/provinces').then(setProvinces); } catch (e) { alert(e.message); }
  };

  const filtered = districts.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const maxDistricts = Math.max(...provinces.map(p => p.districtCount || 0), 1);

  const Loader = () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  /* ── VILOYAT TANLASH ── */
  if (!selectedProvince) {
    const totalD = provinces.reduce((s, p) => s + (p.districtCount || 0), 0);
    const totalS = provinces.reduce((s, p) => s + (p.schoolCount || 0), 0);
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Tumanlar</h1>
            <p className="text-sm text-slate-500 mt-0.5">{provinces.length} viloyat · {totalD} tuman · {totalS} maktab</p>
          </div>
        </div>
        {loading ? <Loader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
            {provinces.map(p => <ProvinceCard key={p.id} province={p} maxDistricts={maxDistricts} onClick={() => selectProvince(p)} />)}
          </div>
        )}
      </div>
    );
  }

  /* ── TUMANLAR RO'YXATI ── */
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
          <ViewToggle view={view} setView={setView} />
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

      {loading ? <Loader /> : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
          {filtered.map(item => <DistrictCard key={item.id} item={item} onEdit={openEdit} onDelete={remove} />)}
          {filtered.length === 0 && <p className="col-span-full text-center text-slate-600 py-12">Tuman topilmadi</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-emerald-500/[0.06]">
              {['№','Nomi','Maktablar',"O'quvchilar",'Amallar'].map(h => (
                <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${h==='Amallar'?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((item, i) => (
              <tr key={item.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                <td className="px-5 py-3 text-slate-600">{i+1}</td>
                <td className="px-5 py-3 text-white font-medium">{item.name}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium">{item.schoolCount||0}</span></td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium">{item.studentCount||0}</span></td>
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
