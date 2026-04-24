import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Input, Select } from '../components/CrudPage';

function Ring({ percent, size = 80, stroke = 7, color = '#10b981' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

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

function SchoolCard({ item, onEdit, onDelete }) {
  const pct = item.attendancePercent || 0;
  return (
    <div className="group relative rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">{item.name}</h3>
            <p className="text-[11px] text-emerald-400/50 mt-0.5">{item.districtName} · {item.provinceName}</p>
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
            <Ring percent={pct} size={88} stroke={7} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{pct}%</span>
              <span className="text-[9px] text-slate-600">davomat</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="text-center py-2.5 rounded-xl bg-amber-500/[0.06]">
              <p className="text-lg font-bold text-amber-400">{item.studentCount || 0}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">O'quvchi</p>
            </div>
            <div className="text-center py-2.5 rounded-xl bg-emerald-500/[0.06]">
              <p className="text-lg font-bold text-emerald-400">{item.studentCount > 0 ? 0 : 0}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Bugun</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-emerald-500/[0.06]">
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

export default function Schools({ user }) {
  const [view, setView] = useState('card');
  const [items, setItems] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([api.get('/api/schools'), api.get('/api/districts')]);
      // ADMIN faqat o'z viloyatidagi maktablarni ko'radi
      if (user?.role === 'ADMIN' && user?.provinceId) {
        const myDistricts = d.filter(dd => dd.provinceId == user.provinceId);
        const myDistrictIds = new Set(myDistricts.map(dd => dd.id));
        setItems(s.filter(sc => myDistrictIds.has(sc.districtId)));
        setDistricts(myDistricts);
      } else {
        setItems(s); setDistricts(d);
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({}); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/api/schools/${editing.id}`, form);
      else await api.post('/api/schools', form);
      setModal(false); load();
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await api.del(`/api/schools/${id}`); load(); } catch (e) { alert(e.message); }
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const totalStudents = items.reduce((s, i) => s + (i.studentCount || 0), 0);

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Maktablar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} ta maktab · {totalStudents} o'quvchi</p>
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Maktab nomi bo'yicha qidirish..."
          className="w-full max-w-xs h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
          {filtered.map(item => <SchoolCard key={item.id} item={item} onEdit={openEdit} onDelete={remove} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-emerald-500/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">№</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nomi</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tuman</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Viloyat</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">O'quvchilar</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
            </tr></thead>
            <tbody>{filtered.map((item, i) => (
              <tr key={item.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                <td className="px-5 py-3 text-slate-600">{i + 1}</td>
                <td className="px-5 py-3 text-white font-medium">{item.name}</td>
                <td className="px-5 py-3 text-slate-400">{item.districtName}</td>
                <td className="px-5 py-3 text-slate-500">{item.provinceName}</td>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Tahrirlash' : 'Yangi maktab'}>
        <Input label="Maktab nomi" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masalan: 56-maktab" />
        <Select label="Tuman" value={form.districtId || ''} onChange={e => setForm({ ...form, districtId: e.target.value })}
          options={districts.map(d => ({ value: d.id, label: `${d.name} (${d.provinceName})` }))} />
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
          <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
        </div>
      </Modal>
    </div>
  );
}
