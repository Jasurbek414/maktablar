import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

function timeAgo(s) { if (!s) return '—'; const d = Math.floor((Date.now() - new Date(s.includes('Z') ? s : s+'Z')) / 1000); return d < 60 ? 'hozirgina' : d < 3600 ? Math.floor(d/60)+' daq.' : d < 86400 ? Math.floor(d/3600)+' soat' : Math.floor(d/86400)+' kun'; }

const SB = ({ status }) => {
  const c = { ONLINE: ['Onlayn','text-emerald-400','bg-emerald-500/10','bg-emerald-400'], OFFLINE: ['Oflayn','text-red-400','bg-red-500/10','bg-red-400'], ERROR: ['Xato','text-amber-400','bg-amber-500/10','bg-amber-400'] }[status] || ['?','text-slate-400','bg-slate-500/10','bg-slate-400'];
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c[2]} ${c[1]}`}><span className={`w-1.5 h-1.5 rounded-full ${c[3]} ${status==='ONLINE'?'animate-pulse':''}`}/>{c[0]}</span>;
};

export default function Devices({ user }) {
  const [devices, setDevices] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [selProv, setSelProv] = useState('');
  const [selDist, setSelDist] = useState('');
  const [selSchool, setSelSchool] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showTermForm, setShowTermForm] = useState(false);
  const [termForm, setTermForm] = useState({ name: '', direction: 'ENTRANCE', serialNumber: '', model: 'DS-K1T341CMF', ipAddress: '' });
  const [delTarget, setDelTarget] = useState(null);
  const [assignForm, setAssignForm] = useState(null);
  const [assignSchoolId, setAssignSchoolId] = useState('');
  const [showCreateCreds, setShowCreateCreds] = useState(false);
  const [credForm, setCredForm] = useState({ schoolId: '', login: '', password: '' });
  const [credProv, setCredProv] = useState('');
  const [credDist, setCredDist] = useState('');
  const [createdCreds, setCreatedCreds] = useState(null);

  const isAdmin = ['SUPERADMIN','ADMIN'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const params = selSchool ? `?schoolId=${selSchool}` : selDist ? `?districtId=${selDist}` : selProv ? `?provinceId=${selProv}` : '';
      const [devs, ov] = await Promise.all([api.get('/api/devices' + params), api.get('/api/devices/overview')]);
      setDevices(devs); setOverview(ov);
      if (isAdmin) {
        const [p, d, s] = await Promise.all([api.get('/api/provinces'), api.get('/api/districts'), api.get('/api/schools')]);
        setProvinces(p); setDistricts(d); setSchools(s);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [selProv, selDist, selSchool, isAdmin]);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const filteredDists = selProv ? districts.filter(d => d.provinceId?.toString() === selProv) : districts;
  const filteredSchools = selDist ? schools.filter(s => s.districtId?.toString() === selDist) : selProv ? schools.filter(s => districts.filter(d => d.provinceId?.toString() === selProv).map(d=>d.id).includes(s.districtId)) : schools;

  const filtered = devices.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (d.deviceName||'').toLowerCase().includes(s) || (d.schoolName||'').toLowerCase().includes(s) || (d.localIp||'').includes(s);
  });

  // Maktab bo'yicha guruhlash
  const grouped = {};
  filtered.forEach(d => {
    const key = d.schoolName || (d.schoolId ? `Maktab #${d.schoolId}` : 'Biriktirilmagan');
    if (!grouped[key]) grouped[key] = { schoolName: key, provinceName: d.provinceName, districtName: d.districtName, devices: [] };
    grouped[key].devices.push(d);
  });

  const addTerminal = async () => {
    if (!detail || !termForm.name) return;
    await api.post(`/api/devices/${detail.id}/terminals`, termForm);
    const updated = await api.get(`/api/devices/${detail.id}`);
    setDetail(updated); setShowTermForm(false);
    setTermForm({ name: '', direction: 'ENTRANCE', serialNumber: '', model: 'DS-K1T341CMF', ipAddress: '' });
    load();
  };

  const delTerminal = async (tid) => {
    await api.del(`/api/devices/terminals/${tid}`);
    const updated = await api.get(`/api/devices/${detail.id}`);
    setDetail(updated); load();
  };

  const delDevice = async () => {
    if (!delTarget) return;
    await api.del(`/api/devices/${delTarget}`);
    setDelTarget(null); setDetail(null); load();
  };

  const submitAssign = async () => {
    if (!assignForm || !assignSchoolId) return;
    await api.put(`/api/devices/${assignForm.id}/assign-school`, { schoolId: assignSchoolId });
    setAssignForm(null); setAssignSchoolId('');
    if (detail && detail.id === assignForm.id) {
        const updated = await api.get(`/api/devices/${detail.id}`);
        setDetail(updated);
    }
    load();
  };

  const submitCreateCreds = async () => {
    if (!credForm.schoolId || !credForm.login || !credForm.password) return alert('Barcha maydonlarni to\'ldiring');
    try {
      const res = await api.post('/api/devices/create-credentials', credForm);
      setCreatedCreds(res);
      setCredForm({ schoolId: '', login: '', password: '' });
      load();
    } catch(e) { alert(e.response?.data?.error || 'Xatolik yuz berdi'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (<div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold text-white">Qurilmalar nazorati</h1><p className="text-sm text-slate-500 mt-1">Viloyat → Tuman → Maktab → Mini-PC → Face ID terminallar</p></div>
      <div className="flex gap-2">
        {isAdmin && <button onClick={()=>{setShowCreateCreds(true);setCreatedCreds(null)}} className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all">+ Kalit yaratish</button>}
        <button onClick={load} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-emerald-400 transition-all"><I d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" c="w-4 h-4"/></button>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {[
        ['Mini-PC', overview.totalDevices||0, 'text-blue-400 bg-blue-500/10'],
        ['Onlayn', overview.onlineDevices||0, 'text-emerald-400 bg-emerald-500/10'],
        ['Oflayn', overview.offlineDevices||0, 'text-red-400 bg-red-500/10'],
        ['Jami terminal', overview.totalTerminals||0, 'text-purple-400 bg-purple-500/10'],
        ['Kirish ⬇', overview.entranceTerminals||0, 'text-cyan-400 bg-cyan-500/10'],
        ['Chiqish ⬆', overview.exitTerminals||0, 'text-orange-400 bg-orange-500/10'],
        ['Terminal onlayn', overview.onlineTerminals||0, 'text-teal-400 bg-teal-500/10'],
      ].map(([l,v,c],i) => (
        <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">{l}</p>
          <p className={`text-2xl font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p>
        </div>
      ))}
    </div>

    {/* Filters */}
    {isAdmin && <div className="flex flex-wrap gap-3">
      <select value={selProv} onChange={e => { setSelProv(e.target.value); setSelDist(''); setSelSchool(''); }} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">Barcha viloyatlar</option>
        {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={selDist} onChange={e => { setSelDist(e.target.value); setSelSchool(''); }} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">Barcha tumanlar</option>
        {filteredDists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={selSchool} onChange={e => setSelSchool(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">Barcha maktablar</option>
        {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="relative flex-1 min-w-[200px]">
        <I d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" c="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none"/>
      </div>
    </div>}

    {/* Device list grouped by school */}
    {Object.keys(grouped).length === 0 ? (
      <div className="flex flex-col items-center py-20 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3"><I d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" c="w-7 h-7 text-slate-600"/></div>
        <p className="text-slate-400 font-medium">Qurilmalar topilmadi</p>
        <p className="text-xs text-slate-600 mt-1">Mini-PC ro'yxatdan o'tganda bu yerda ko'rinadi</p>
      </div>
    ) : Object.values(grouped).map((g, gi) => (
      <div key={gi} className="space-y-3">
        {/* School header */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><I d="M12 14l9-5-9-5-9 5 9 5z" c="w-4 h-4 text-emerald-400"/></div>
          <div>
            <p className="text-sm font-semibold text-slate-200">{g.schoolName}</p>
            <p className="text-[10px] text-slate-600">{g.provinceName && g.districtName ? `${g.provinceName} / ${g.districtName}` : ''}</p>
          </div>
          <span className="ml-auto text-[11px] text-slate-600">{g.devices.length} ta Mini-PC</span>
        </div>

        {/* Devices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pl-10">
          {g.devices.map(dev => (
            <div key={dev.id} onClick={() => setDetail(dev)}
              className={`group rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-lg ${dev.status==='ONLINE' ? 'bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/10 hover:border-emerald-500/25' : 'bg-white/[0.01] border-white/[0.06] hover:border-white/[0.12]'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dev.status==='ONLINE'?'bg-emerald-500/15 text-emerald-400':'bg-slate-800/60 text-slate-500'}`}>
                    <I d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </div>
                  <div><p className="text-[14px] font-semibold text-slate-200">{dev.deviceName}</p><p className="text-[11px] text-slate-500">IP: {dev.localIp || '—'}</p></div>
                </div>
                <SB status={dev.status}/>
              </div>
              {/* Terminal summary */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><p className="text-[9px] text-slate-600">KIRISH</p><p className="text-sm font-bold text-cyan-400">{dev.entranceTerminals||0}</p></div>
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><p className="text-[9px] text-slate-600">CHIQISH</p><p className="text-sm font-bold text-orange-400">{dev.exitTerminals||0}</p></div>
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><p className="text-[9px] text-slate-600">JAMI</p><p className="text-sm font-bold text-slate-300">{dev.faceTerminalCount||0}</p></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
                <p className="text-[10px] text-slate-600">Heartbeat: {timeAgo(dev.lastHeartbeat)}</p>
                <button onClick={e=>{e.stopPropagation();setDelTarget(dev.id)}} className="p-1 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><I d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" c="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}

    {/* Detail modal */}
    {detail && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setDetail(null)}>
      <div className="bg-[#111916] border border-emerald-500/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] sticky top-0 bg-[#111916] z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${detail.status==='ONLINE'?'bg-emerald-500/15 text-emerald-400':'bg-slate-800/60 text-slate-500'}`}><I d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">{detail.deviceName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-500">{detail.schoolName ? `${detail.schoolName} • ${detail.districtName} • ${detail.provinceName}` : 'Hali maktabga biriktirilmagan'}</p>
                {!detail.schoolName && <button onClick={()=>setAssignForm(detail)} className="text-[10px] text-emerald-400 hover:underline">Biriktirish</button>}
              </div>
            </div>
          </div>
          <button onClick={()=>setDetail(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05]"><I d="M6 18L18 6M6 6l12 12" c="w-5 h-5"/></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3"><SB status={detail.status}/><span className="text-[11px] text-slate-600">IP: {detail.localIp} • MAC: {detail.macAddress || '—'}</span></div>

          <div className="grid grid-cols-3 gap-3">
            {[['Kirish terminallari', detail.entranceTerminals||0, 'text-cyan-400 bg-cyan-500/10'], ['Chiqish terminallari', detail.exitTerminals||0, 'text-orange-400 bg-orange-500/10'], ['Heartbeat', timeAgo(detail.lastHeartbeat), 'text-slate-300 bg-white/[0.03]']].map(([l,v,c],i) => (
              <div key={i} className={`rounded-xl p-3 ${c.split(' ').slice(1).join(' ')}`}><p className="text-[10px] text-slate-600">{l}</p><p className={`text-lg font-bold mt-1 ${c.split(' ')[0]}`}>{v}</p></div>
            ))}
          </div>

          {/* Face ID Terminals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200">Face ID terminallar</h4>
              <button onClick={()=>setShowTermForm(!showTermForm)} className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">+ Terminal qo'shish</button>
            </div>

            {showTermForm && <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={termForm.name} onChange={e=>setTermForm({...termForm,name:e.target.value})} placeholder="Terminal nomi" className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"/>
                <select value={termForm.direction} onChange={e=>setTermForm({...termForm,direction:e.target.value})} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:outline-none">
                  <option value="ENTRANCE">⬇ Kirish</option><option value="EXIT">⬆ Chiqish</option>
                </select>
                <input value={termForm.serialNumber} onChange={e=>setTermForm({...termForm,serialNumber:e.target.value})} placeholder="Serial raqam" className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"/>
                <input value={termForm.ipAddress} onChange={e=>setTermForm({...termForm,ipAddress:e.target.value})} placeholder="IP manzil" className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"/>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setShowTermForm(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300">Bekor</button>
                <button onClick={addTerminal} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-all">Saqlash</button>
              </div>
            </div>}

            {(detail.terminals||[]).length === 0 ? (
              <div className="text-center py-6 rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06]"><p className="text-xs text-slate-600">Terminal yo'q — yuqoridagi tugma orqali qo'shing</p></div>
            ) : (
              <div className="space-y-2">
                {(detail.terminals||[]).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.direction==='ENTRANCE'?'bg-cyan-500/10 text-cyan-400':'bg-orange-500/10 text-orange-400'}`}>
                      <I d={t.direction==='ENTRANCE'?'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3':'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18'} c="w-4 h-4"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-[13px] font-medium text-slate-200">{t.name}</p><SB status={t.status}/></div>
                      <p className="text-[10px] text-slate-600">{t.direction==='ENTRANCE'?'Kirish':'Chiqish'} • {t.model||'—'} • IP: {t.ipAddress||'—'} • SN: {t.serialNumber||'—'}</p>
                    </div>
                    <button onClick={()=>delTerminal(t.id)} className="p-1.5 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><I d="M6 18L18 6M6 6l12 12" c="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection guide */}
          <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/10 p-4">
            <p className="text-[12px] font-semibold text-blue-400 mb-2">📡 Terminal ulash yo'riqnomasi</p>
            <p className="text-[11px] text-slate-400">Server: <span className="text-blue-300 font-mono">{detail.localIp||'192.168.x.x'}</span> • Port: <span className="text-blue-300 font-mono">7660</span> • Protocol: <span className="text-blue-300 font-mono">ISUP 5.0</span></p>
          </div>
        </div>
      </div>
    </div>}

    {/* Assign Modal */}
    {assignForm && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#111916] border border-emerald-500/10 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-white">Maktabga biriktirish</h3>
        <p className="text-xs text-slate-400">Mini-PC: <span className="font-semibold text-white">{assignForm.deviceName}</span></p>
        <div className="space-y-3">
          <select value={assignSchoolId} onChange={e=>setAssignSchoolId(e.target.value)} className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
            <option value="">-- Maktabni tanlang --</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.districtName} - {s.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={()=>setAssignForm(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Bekor</button>
          <button onClick={submitAssign} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl">Saqlash</button>
        </div>
      </div>
    </div>}
    {/* Create Credentials Modal */}
    {showCreateCreds && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#111916] border border-emerald-500/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        {!createdCreds ? <>
          <h3 className="text-lg font-bold text-white">Yangi Mini-PC uchun kalit yaratish</h3>
          <p className="text-xs text-slate-400">Viloyat, tuman va maktabni tanlang. Login va parolni ixtiyoriy kiriting.</p>
          <div className="space-y-3">
            <select value={credProv} onChange={e=>{setCredProv(e.target.value);setCredDist('');setCredForm({...credForm,schoolId:''})}} className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
              <option value="">-- Viloyatni tanlang --</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={credDist} onChange={e=>{setCredDist(e.target.value);setCredForm({...credForm,schoolId:''})}} className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" disabled={!credProv}>
              <option value="">-- Tumanni tanlang --</option>
              {districts.filter(d=>d.provinceId?.toString()===credProv).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={credForm.schoolId} onChange={e=>setCredForm({...credForm,schoolId:e.target.value})} className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" disabled={!credDist}>
              <option value="">-- Maktabni tanlang --</option>
              {schools.filter(s=>s.districtId?.toString()===credDist).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="border-t border-white/[0.04] pt-3"></div>
            <input value={credForm.login} onChange={e=>setCredForm({...credForm,login:e.target.value})} placeholder="Login (masalan: maktab45_admin)" className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none placeholder-slate-600"/>
            <input value={credForm.password} onChange={e=>setCredForm({...credForm,password:e.target.value})} placeholder="Parol (masalan: secret123)" className="w-full bg-[#0a0f0d] border border-[#1a2520] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none placeholder-slate-600"/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={()=>setShowCreateCreds(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Bekor</button>
            <button onClick={submitCreateCreds} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl">Yaratish</button>
          </div>
        </> : <>
          <h3 className="text-lg font-bold text-emerald-400">✅ Kalit yaratildi!</h3>
          <p className="text-xs text-slate-400">Quyidagi ma'lumotlarni Desktop dasturga kiriting:</p>
          <div className="bg-[#020504] border border-emerald-500/20 rounded-xl p-4 space-y-3 font-mono text-sm">
            <div><span className="text-[10px] text-slate-600 uppercase block">Maktab</span><span className="text-white">{createdCreds.schoolName}</span></div>
            <div><span className="text-[10px] text-slate-600 uppercase block">Login</span><span className="text-emerald-400 font-bold text-lg">{createdCreds.login}</span></div>
            <div><span className="text-[10px] text-slate-600 uppercase block">Parol</span><span className="text-emerald-400 font-bold text-lg">{createdCreds.password}</span></div>
            <div><span className="text-[10px] text-slate-600 uppercase block">API Kalit</span><span className="text-cyan-400 font-bold select-all">{createdCreds.apiKey}</span></div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={()=>{setShowCreateCreds(false);setCredProv('');setCredDist('')}} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl">Yopish</button>
          </div>
        </>}
      </div>
    </div>}
    
    {/* Delete confirm */}
    {delTarget && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setDelTarget(null)}>
      <div className="bg-[#111916] border border-red-500/15 rounded-2xl w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
        <h3 className="text-center text-white font-semibold mb-1">Qurilmani o'chirish</h3>
        <p className="text-center text-sm text-slate-500 mb-5">Bu amalni bekor qilib bo'lmaydi.</p>
        <div className="flex gap-3">
          <button onClick={()=>setDelTarget(null)} className="flex-1 py-2 rounded-xl text-sm text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]">Bekor</button>
          <button onClick={delDevice} className="flex-1 py-2 rounded-xl text-sm text-white bg-red-500/80 hover:bg-red-500">O'chirish</button>
        </div>
      </div>
    </div>}
  </div>);
}
