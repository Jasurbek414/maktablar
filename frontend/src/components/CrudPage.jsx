import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

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

function Input({ label, ...props }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input {...props} className="mt-1.5 w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors" />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select {...props} className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors">
        <option value="">Tanlang...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function CrudPage({ title, apiPath, columns, formFields, loadDeps }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [deps, setDeps] = useState({});
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await api.get(apiPath)); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (loadDeps) loadDeps().then(setDeps);
  }, [apiPath]);

  const openAdd = () => { setEditing(null); setForm({}); setModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item }); setModal(true); };

  const save = async () => {
    try {
      if (editing) { await api.put(`${apiPath}/${editing.id}`, form); }
      else { await api.post(apiPath, form); }
      setModal(false); load();
    } catch (e) { alert(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await api.del(`${apiPath}/${id}`); load(); } catch (e) { alert(e.message); }
  };

  const filtered = items.filter(item =>
    columns.some(c => String(item[c.key] || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} ta yozuv</p>
        </div>
        <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Qo'shish
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
          className="w-full max-w-xs h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-500/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">№</th>
              {columns.map(c => (
                <th key={c.key} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{c.label}</th>
              ))}
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2} className="px-5 py-12 text-center text-slate-600">Yuklanmoqda...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="px-5 py-12 text-center text-slate-600">Ma'lumot topilmadi</td></tr>
            ) : filtered.map((item, i) => (
              <tr key={item.id} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors">
                <td className="px-5 py-3 text-slate-600">{i + 1}</td>
                {columns.map(c => (
                  <td key={c.key} className="px-5 py-3 text-slate-300">{c.render ? c.render(item) : item[c.key]}</td>
                ))}
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mr-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </button>
                  <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Tahrirlash' : 'Yangi qo\'shish'}>
        {formFields(form, (k, v) => setForm({ ...form, [k]: v }), deps)}
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">Bekor</button>
          <button onClick={save} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">Saqlash</button>
        </div>
      </Modal>
    </div>
  );
}

export { Input, Select };
