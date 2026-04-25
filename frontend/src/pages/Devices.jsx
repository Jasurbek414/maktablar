import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/* ── SVG Ikonkalar ── */
const Icon = ({ d, cls = 'w-5 h-5' }) => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

/* ── Vaqt format ── */
function timeAgo(str) {
  if (!str) return '—';
  const now = new Date();
  const d = new Date(str.includes('T') && !str.includes('Z') ? str + 'Z' : str);
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'hozirgina';
  if (sec < 3600) return Math.floor(sec / 60) + ' daq. oldin';
  if (sec < 86400) return Math.floor(sec / 3600) + ' soat oldin';
  if (sec < 604800) return Math.floor(sec / 86400) + ' kun oldin';
  return d.toLocaleDateString('uz-UZ');
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') && !str.includes('Z') ? str + 'Z' : str);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

/* ── Status badge ── */
const statusCfg = {
  ONLINE: { label: 'Onlayn', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', ring: 'ring-emerald-500/20' },
  OFFLINE: { label: 'Oflayn', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400', ring: 'ring-red-500/20' },
  ERROR: { label: 'Xatolik', color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400', ring: 'ring-amber-500/20' },
};

function StatusBadge({ status }) {
  const c = statusCfg[status] || statusCfg.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'ONLINE' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, icon, color = 'emerald' }) {
  const colors = {
    emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', icon: 'bg-emerald-500/15 text-emerald-400', text: 'text-emerald-400' },
    red: { bg: 'from-red-500/10 to-red-600/5', icon: 'bg-red-500/15 text-red-400', text: 'text-red-400' },
    amber: { bg: 'from-amber-500/10 to-amber-600/5', icon: 'bg-amber-500/15 text-amber-400', text: 'text-amber-400' },
    blue: { bg: 'from-blue-500/10 to-blue-600/5', icon: 'bg-blue-500/15 text-blue-400', text: 'text-blue-400' },
  };
  const c = colors[color] || colors.emerald;
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${c.bg} border border-white/[0.04] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon d={icon} cls="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}

export default function Devices({ user }) {
  const [devices, setDevices] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [delId, setDelId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, ONLINE, OFFLINE
  const [schoolFilter, setSchoolFilter] = useState('');
  const [search, setSearch] = useState('');

  const isDirector = user?.role === 'DIRECTOR';
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      let devicesData;
      if (isDirector && user?.schoolId) {
        devicesData = await api.get(`/api/devices?schoolId=${user.schoolId}`);
      } else {
        devicesData = await api.get('/api/devices');
      }
      setDevices(devicesData);

      if (isAdmin) {
        const sch = await api.get('/api/schools');
        setSchools(sch);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, isDirector, isAdmin]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Har 30 sek yangilash
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async () => {
    if (!delId) return;
    try {
      await api.del(`/api/devices/${delId}`);
      setDevices(prev => prev.filter(d => d.id !== delId));
      setDelId(null);
    } catch (e) {
      alert('O\'chirishda xatolik');
    }
  };

  // Filtrlash
  const filtered = devices.filter(d => {
    if (filter !== 'ALL' && d.status !== filter) return false;
    if (schoolFilter && d.schoolId?.toString() !== schoolFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.deviceName || '').toLowerCase().includes(s) ||
        (d.schoolName || '').toLowerCase().includes(s) ||
        (d.localIp || '').toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'ONLINE').length,
    offline: devices.filter(d => d.status === 'OFFLINE').length,
    terminals: devices.reduce((sum, d) => sum + (d.faceTerminalCount || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Qurilmalar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Mini-PC serverlar va Face ID terminallarni boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-all">
            <Icon d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Statistika ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Jami qurilmalar" value={stats.total} color="blue"
          icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        <StatCard label="Onlayn" value={stats.online} color="emerald"
          icon="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        <StatCard label="Oflayn" value={stats.offline} color="red"
          icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        <StatCard label="Face ID terminallar" value={stats.terminals} color="amber"
          icon="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </div>

      {/* ── Filtrlar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Qidirish */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Icon d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Qurilma nomi, maktab, IP..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none transition-colors"
          />
        </div>

        {/* Status filtr */}
        <div className="flex rounded-xl overflow-hidden border border-white/[0.06]">
          {['ALL', 'ONLINE', 'OFFLINE'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[12px] font-semibold transition-all ${filter === f
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/[0.02] text-slate-500 hover:text-slate-300'}`}
            >
              {f === 'ALL' ? 'Barchasi' : f === 'ONLINE' ? '🟢 Onlayn' : '🔴 Oflayn'}
            </button>
          ))}
        </div>

        {/* Maktab filter (faqat admin/superadmin uchun) */}
        {isAdmin && schools.length > 0 && (
          <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="">Barcha maktablar</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Qurilmalar ro'yxati ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
            <Icon d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" cls="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">Qurilmalar topilmadi</p>
          <p className="text-xs text-slate-600 mt-1">Mini-PC'lar ro'yxatdan o'tgandan keyin bu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(dev => (
            <div key={dev.id}
              className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-lg cursor-pointer ${
                dev.status === 'ONLINE'
                  ? 'bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/10 hover:border-emerald-500/25 hover:shadow-emerald-500/5'
                  : dev.status === 'ERROR'
                    ? 'bg-gradient-to-br from-amber-500/[0.04] to-transparent border-amber-500/10 hover:border-amber-500/25'
                    : 'bg-gradient-to-br from-white/[0.01] to-transparent border-white/[0.06] hover:border-white/[0.12]'
              }`}
              onClick={() => { setSelectedDevice(dev); setShowModal(true); }}
            >
              {/* Status strip */}
              <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-b-full ${
                dev.status === 'ONLINE' ? 'bg-emerald-500/60' : dev.status === 'ERROR' ? 'bg-amber-500/60' : 'bg-slate-700/30'
              }`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      dev.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800/60 text-slate-500'
                    }`}>
                      <Icon d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" cls="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-200">{dev.deviceName}</p>
                      <p className="text-[11px] text-slate-500">{dev.schoolName || `Maktab #${dev.schoolId}`}</p>
                    </div>
                  </div>
                  <StatusBadge status={dev.status} />
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.02] px-3 py-2">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">IP Manzil</p>
                    <p className="text-[13px] text-slate-300 font-mono mt-0.5">{dev.localIp || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] px-3 py-2">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">Face ID</p>
                    <p className="text-[13px] text-slate-300 font-medium mt-0.5">{dev.faceTerminalCount || 0} ta terminal</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <Icon d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-3.5 h-3.5 text-slate-600" />
                    <p className="text-[11px] text-slate-600">
                      {dev.lastHeartbeat ? timeAgo(dev.lastHeartbeat) : 'Hech qachon'}
                    </p>
                  </div>
                  {(isAdmin || isDirector) && (
                    <button
                      onClick={e => { e.stopPropagation(); setDelId(dev.id); }}
                      className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Icon d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" cls="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {showModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-[#111916] border border-emerald-500/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedDevice.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800/60 text-slate-500'
                }`}>
                  <Icon d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white">{selectedDevice.deviceName}</h3>
                  <p className="text-[12px] text-slate-500">{selectedDevice.schoolName || `Maktab #${selectedDevice.schoolId}`}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all">
                <Icon d="M6 18L18 6M6 6l12 12" cls="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedDevice.status} />
                {selectedDevice.status === 'ONLINE' && (
                  <span className="text-[11px] text-emerald-500/70">Server bilan aloqa barqaror</span>
                )}
                {selectedDevice.status === 'OFFLINE' && (
                  <span className="text-[11px] text-red-400/70">Aloqa uzilgan — tekshiring</span>
                )}
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ID', value: `#${selectedDevice.id}` },
                  { label: 'Maktab', value: selectedDevice.schoolName || `#${selectedDevice.schoolId}` },
                  { label: 'Lokal IP', value: selectedDevice.localIp || '—' },
                  { label: 'Face ID terminal', value: `${selectedDevice.faceTerminalCount || 0} ta` },
                  { label: "Ro'yxatdan o'tgan", value: fmtDate(selectedDevice.registeredAt) },
                  { label: 'Oxirgi heartbeat', value: selectedDevice.lastHeartbeat ? timeAgo(selectedDevice.lastHeartbeat) : '—' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.03] px-4 py-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">{item.label}</p>
                    <p className="text-[13px] text-slate-300 font-medium mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Connection guide */}
              <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/10 p-4">
                <p className="text-[12px] font-semibold text-blue-400 mb-2">📡 Face ID terminal ulash</p>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400">
                    <span className="text-blue-300 font-mono">Server Address:</span> {selectedDevice.localIp || '192.168.x.x'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-blue-300 font-mono">Server Port:</span> 7660
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-blue-300 font-mono">Protocol:</span> ISUP 5.0
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.04]">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all">
                Yopish
              </button>
              {(isAdmin || isDirector) && (
                <button onClick={() => { setDelId(selectedDevice.id); setShowModal(false); }}
                  className="px-4 py-2 text-sm rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                  O'chirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {delId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDelId(null)}>
          <div className="bg-[#111916] border border-red-500/15 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
              <Icon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-center text-white font-semibold mb-1">Qurilmani o'chirish</h3>
            <p className="text-center text-sm text-slate-500 mb-5">
              Bu amalni bekor qilib bo'lmaydi. Mini-PC qaytadan ro'yxatdan o'tishi kerak bo'ladi.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                Bekor qilish
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500/80 hover:bg-red-500 transition-all">
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
