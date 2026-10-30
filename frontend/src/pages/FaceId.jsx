import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import TerminalManager from '../components/devices/TerminalManager';
import ConnectionWizardModal from '../components/devices/ConnectionWizardModal';
import TerminalLivePlayer from '../components/devices/TerminalLivePlayer';

const I = ({ d, c = 'w-5 h-5' }) => (
  <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  faceId: 'M3.75 4.5A.75.75 0 014.5 3.75H8a.75.75 0 010 1.5H5.25V8a.75.75 0 01-1.5 0V4.5zm16.5 0a.75.75 0 00-.75-.75H16a.75.75 0 000 1.5h2.75V8a.75.75 0 001.5 0V4.5zM3.75 19.5a.75.75 0 00.75.75H8a.75.75 0 000-1.5H5.25V16a.75.75 0 00-1.5 0v3.5zm16.5 0a.75.75 0 01-.75.75H16a.75.75 0 010-1.5h2.75V16a.75.75 0 011.5 0v3.5zM9 10.5a3 3 0 116 0 3 3 0 01-6 0zm-1.5 7.5a4.5 4.5 0 019 0H7.5z',
  camera: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  online: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  offline: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  in: 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3',
  out: 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18',
  pulse: 'M9 12h1.5l1.5-4.5 3 9 1.5-4.5H21',
  refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  close: 'M6 18L18 6M6 6l12 12',
  edit: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  door: 'M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 12.75v6.75a2.25 2.25 0 002.25 2.25z',
  sync: 'M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  log: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  check: 'M4.5 12.75l6 6 9-13.5',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  sparkle: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
};

function timeAgo(s) {
  if (!s) return '—';
  const d = Math.floor((Date.now() - new Date(s.includes('Z') ? s : s + 'Z')) / 1000);
  if (d < 60) return 'Hozirgina';
  if (d < 3600) return `${Math.floor(d / 60)} daqiqa oldin`;
  if (d < 86400) return `${Math.floor(d / 3600)} soat oldin`;
  return `${Math.floor(d / 86400)} kun oldin`;
}

function StatTile({ label, value, icon, color, glow }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] p-4 hover:border-emerald-500/20 transition-all duration-300">
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${glow}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1.5 tabular-nums">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <I d={icon} c="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}

export default function FaceIdPage({ user }) {
  const { t } = useTranslation();
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);
  const targetSchoolId = user?.schoolId || 2; // direktor uchun o'z maktabi

  const [terminals, setTerminals] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('terminals'); // 'terminals' | 'events' | 'sync'
  
  // Modals
  const [selectedTerminal, setSelectedTerminal] = useState(null); // for TerminalManager
  const [quickCameraTerminal, setQuickCameraTerminal] = useState(null); // quick live modal
  const [showWizard, setShowWizard] = useState(false);
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    direction: 'ENTRANCE',
    brand: 'Hikvision',
    model: '',
    serialNumber: '',
    macAddress: '',
    ipAddress: '',
    port: 443,
    useHttps: true,
    deviceUsername: 'admin',
    devicePassword: '',
    notes: ''
  });
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Live pass events state (for Events tab)
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventDirection, setEventDirection] = useState('ALL');
  const [eventSearch, setEventSearch] = useState('');

  // Batch sync state
  const [syncTargetTerm, setSyncTargetTerm] = useState('all');
  const [syncTargetClass, setSyncTargetClass] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Door unlock in progress
  const [unlockingId, setUnlockingId] = useState(null);

  // Load terminals and classes
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [termRes, classRes] = await Promise.all([
        api.get(`/api/terminals?schoolId=${targetSchoolId}`),
        api.get(`/api/classes?schoolId=${targetSchoolId}`).catch(() => [])
      ]);
      setTerminals(Array.isArray(termRes) ? termRes : []);
      setClasses(Array.isArray(classRes) ? classRes : []);
    } catch (e) {
      console.error('Face ID load error:', e);
    } finally {
      setLoading(false);
    }
  }, [targetSchoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load pass events when switching to events tab
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await api.get(`/api/attendance/school/${targetSchoolId}?date=${eventDate}`);
      setEvents(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Events load error:', e);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [targetSchoolId, eventDate]);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents();
    }
  }, [activeTab, loadEvents]);

  // Overview calculations
  const stats = useMemo(() => {
    const total = terminals.length;
    const online = terminals.filter(t => t.status === 'ONLINE').length;
    const offline = terminals.filter(t => t.status === 'OFFLINE').length;
    const entrance = terminals.filter(t => t.direction === 'ENTRANCE').length;
    const exit = terminals.filter(t => t.direction === 'EXIT').length;
    const totalFaces = terminals.reduce((sum, t) => sum + (t.registeredFaces || t.userCount || 0), 0);
    return { total, online, offline, entrance, exit, totalFaces };
  }, [terminals]);

  // Test connection button
  const handleTestConnection = async () => {
    if (!formData.ipAddress) return;
    setTestingConn(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/terminals/test-connection', {
        ipAddress: formData.ipAddress,
        port: formData.port,
        useHttps: formData.useHttps,
        deviceUsername: formData.deviceUsername,
        devicePassword: formData.devicePassword,
        terminalId: editingTerminal?.id
      });
      setTestResult(res);
      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          model: res.model || prev.model,
          serialNumber: res.serialNumber || prev.serialNumber,
          macAddress: res.macAddress || prev.macAddress,
          firmwareVersion: res.firmwareVersion || prev.firmwareVersion
        }));
      }
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    } finally {
      setTestingConn(false);
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setEditingTerminal(null);
    setFormData({
      name: '',
      direction: 'ENTRANCE',
      brand: 'Hikvision',
      model: '',
      serialNumber: '',
      macAddress: '',
      ipAddress: '',
      port: 443,
      useHttps: true,
      deviceUsername: 'admin',
      devicePassword: '',
      notes: ''
    });
    setTestResult(null);
    setShowAddEdit(true);
  };

  // Open Edit modal
  const openEditModal = (t) => {
    setEditingTerminal(t);
    setFormData({
      name: t.name || '',
      direction: t.direction || 'ENTRANCE',
      brand: t.brand || 'Hikvision',
      model: t.model || '',
      serialNumber: t.serialNumber || '',
      macAddress: t.macAddress || '',
      ipAddress: t.ipAddress || '',
      port: t.port || (t.useHttps ? 443 : 80),
      useHttps: t.useHttps !== false,
      deviceUsername: t.deviceUsername || 'admin',
      devicePassword: '',
      notes: t.notes || ''
    });
    setTestResult(null);
    setShowAddEdit(true);
  };

  // Save Terminal
  const handleSaveTerminal = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ipAddress) return;
    try {
      if (editingTerminal) {
        await api.put(`/api/terminals/${editingTerminal.id}`, formData);
      } else {
        await api.post('/api/terminals', {
          ...formData,
          schoolId: targetSchoolId
        });
      }
      setShowAddEdit(false);
      loadData();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Xatolik yuz berdi');
    }
  };

  // Delete terminal
  const handleDeleteTerminal = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/api/terminals/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Xatolik yuz berdi');
    }
  };

  // Remote door unlock
  const handleUnlockDoor = async (termId) => {
    setUnlockingId(termId);
    try {
      await api.post(`/api/terminals/${termId}/door`, { cmd: 'open' });
      alert('Eshik muvaffaqiyatli ochildi!');
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Eshikni ochishda xatolik');
    } finally {
      setUnlockingId(null);
    }
  };

  // Batch face sync
  const handleSyncFaces = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const payload = {
        schoolId: targetSchoolId,
        terminalId: syncTargetTerm
      };
      if (syncTargetClass) {
        payload.classId = syncTargetClass;
      }
      const res = await api.post('/api/terminals/sync-all', payload);
      setSyncResult(res);
      loadData();
    } catch (e) {
      setSyncResult({ error: e.response?.data?.error || e.message || 'Sinxronizatsiya xatosi' });
    } finally {
      setSyncing(false);
    }
  };

  // Filtered pass events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (eventDirection !== 'ALL') {
        const d = ev.type === 'CHECK_IN' || ev.type === 'IN' ? 'IN' : 'OUT';
        if (d !== eventDirection) return false;
      }
      if (eventSearch.trim()) {
        const q = eventSearch.toLowerCase();
        const name = (ev.studentName || '').toLowerCase();
        const fid = (ev.faceId || '').toLowerCase();
        if (!name.includes(q) && !fid.includes(q)) return false;
      }
      return true;
    });
  }, [events, eventDirection, eventSearch]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
            <I d={ICONS.faceId} c="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Face ID Boshqaruvi</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PRO 5.0
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Maktab Face ID terminallari, jonli kamera stream, o'tishlar va yuzlarni to'liq boshqarish
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold hover:border-cyan-400/50 hover:bg-cyan-500/25 transition-all flex items-center gap-2 shadow-sm"
          >
            <I d={ICONS.sparkle} c="w-4 h-4 text-cyan-400" />
            <span>Face ID Ulash Ustasi</span>
          </button>

          <button
            type="button"
            onClick={() => { setShowSyncModal(true); setSyncResult(null); }}
            className="px-3.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:text-white text-xs font-semibold hover:bg-purple-500/20 transition-all flex items-center gap-2 shadow-sm"
          >
            <I d={ICONS.sync} c="w-4 h-4 text-purple-400" />
            <span>Ommaviy Yuz Yuklash</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Terminal Qo'shish</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-[#0d1a14] border border-emerald-500/[0.1] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
            title="Yangilash"
          >
            <I d={ICONS.refresh} c={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile
          label="Jami Face ID"
          value={stats.total}
          icon={ICONS.faceId}
          color="bg-emerald-500/10 text-emerald-400"
          glow="bg-emerald-500/20"
        />
        <StatTile
          label="Online"
          value={stats.online}
          icon={ICONS.online}
          color="bg-teal-500/10 text-teal-300"
          glow="bg-teal-500/20"
        />
        <StatTile
          label="Offline"
          value={stats.offline}
          icon={ICONS.offline}
          color="bg-red-500/10 text-red-400"
          glow="bg-red-500/20"
        />
        <StatTile
          label="Kirish (IN)"
          value={stats.entrance}
          icon={ICONS.in}
          color="bg-cyan-500/10 text-cyan-400"
          glow="bg-cyan-500/20"
        />
        <StatTile
          label="Chiqish (OUT)"
          value={stats.exit}
          icon={ICONS.out}
          color="bg-amber-500/10 text-amber-400"
          glow="bg-amber-500/20"
        />
        <StatTile
          label="Yuklangan Yuzlar"
          value={stats.totalFaces}
          icon={ICONS.users}
          color="bg-purple-500/10 text-purple-400"
          glow="bg-purple-500/20"
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-emerald-500/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('terminals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'terminals'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <I d={ICONS.faceId} c="w-4 h-4" />
          <span>Terminallar ({terminals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'events'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <I d={ICONS.log} c="w-4 h-4" />
          <span>Jonli Voqealar</span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'sync'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <I d={ICONS.sync} c="w-4 h-4" />
          <span>Sinflar va Yuzlar</span>
        </button>
      </div>

      {/* Tab 1: TERMINALS GRID */}
      {activeTab === 'terminals' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : terminals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400">
                <I d={ICONS.faceId} c="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Face ID terminallar topilmadi</h3>
              <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
                Maktabga birorta Face ID terminali ulanmagan. Yangi terminal ulash uchun quyidagi tugmani bosing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/25 transition-all"
                >
                  Face ID Ulash Ustasi
                </button>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition-all"
                >
                  + Terminal Qo'shish
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {terminals.map(term => {
                const isOnline = term.status === 'ONLINE';
                const isEntrance = term.direction === 'ENTRANCE';
                return (
                  <div
                    key={term.id}
                    className={`relative overflow-hidden rounded-2xl bg-[#0d1a14] border transition-all duration-300 p-5 ${
                      isOnline ? 'border-emerald-500/[0.15] hover:border-emerald-500/35' : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {/* Glow background */}
                    <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-30 ${
                      isOnline ? 'bg-emerald-500/20' : 'bg-red-500/10'
                    }`} />

                    {/* Card Top */}
                    <div className="relative flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                          isOnline
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20'
                            : 'bg-slate-800/80 text-slate-500 border-white/[0.05]'
                        }`}>
                          <I d={ICONS.faceId} c="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white truncate">{term.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono text-emerald-400/90 font-medium">{term.ipAddress}:{term.port || (term.useHttps ? 443 : 80)}</span>
                            {term.model && <span className="text-[11px] text-slate-400">• {term.model}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Direction badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isEntrance
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          <I d={isEntrance ? ICONS.in : ICONS.out} c="w-3 h-3" />
                          <span>{isEntrance ? 'Kirish' : 'Chiqish'}</span>
                        </span>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                          <span>{isOnline ? 'Online' : 'Offline'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Details Grid */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/[0.04] text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Yuklangan Yuzlar</span>
                        <span className="text-sm font-bold text-white mt-0.5 block tabular-nums">
                          {term.registeredFaces || term.userCount || 0} ta
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Seriya Raqami</span>
                        <span className="text-xs font-mono text-slate-300 mt-1 block truncate" title={term.serialNumber || '—'}>
                          {term.serialNumber || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Oxirgi Faollik</span>
                        <span className="text-xs text-slate-300 mt-1 block">
                          {timeAgo(term.lastSeen || term.lastEventAt)}
                        </span>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-1">
                      <div className="flex items-center gap-2">
                        {/* Manage Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedTerminal(term)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                        >
                          <I d={ICONS.settings} c="w-3.5 h-3.5" />
                          <span>Boshqarish</span>
                        </button>

                        {/* Live Camera Shortcut */}
                        <button
                          type="button"
                          onClick={() => setQuickCameraTerminal(term)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all flex items-center gap-1.5"
                          title="Jonli Kamera Ko'rish"
                        >
                          <I d={ICONS.camera} c="w-3.5 h-3.5" />
                          <span>Kamera</span>
                        </button>

                        {/* Door Unlock */}
                        <button
                          type="button"
                          onClick={() => handleUnlockDoor(term.id)}
                          disabled={unlockingId === term.id || !isOnline}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] transition-all flex items-center gap-1.5 disabled:opacity-40"
                          title="Eshikni Masofadan Ochish"
                        >
                          <I d={ICONS.door} c="w-3.5 h-3.5 text-amber-400" />
                          <span>{unlockingId === term.id ? 'Ochilmoqda...' : 'Eshik'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(term)}
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04] transition-all"
                          title="Tahrirlash"
                        >
                          <I d={ICONS.edit} c="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(term)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="O'chirish"
                        >
                          <I d={ICONS.trash} c="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: LIVE PASS EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08]">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
              />

              <div className="flex rounded-xl bg-white/[0.03] p-0.5 border border-white/[0.06] text-xs">
                {['ALL', 'IN', 'OUT'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => setEventDirection(dir)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      eventDirection === dir ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dir === 'ALL' ? 'Barchasi' : dir === 'IN' ? 'Kirish' : 'Chiqish'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-[240px]">
              <div className="relative flex-1">
                <I d={ICONS.search} c="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  placeholder="F.I.SH. yoki Face ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <button
                type="button"
                onClick={loadEvents}
                className="p-2 rounded-xl bg-white/[0.04] text-slate-400 hover:text-emerald-400 transition-all"
                title="Yangilash"
              >
                <I d={ICONS.refresh} c={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Events Table */}
          {eventsLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08]">
              <p className="text-sm text-slate-400">Tanlangan sanada o'tish voqealari topilmadi</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-white/[0.02] border-b border-white/[0.05] text-[11px] text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">O'quvchi</th>
                      <th className="py-3 px-4">Face ID</th>
                      <th className="py-3 px-4">Vaqti</th>
                      <th className="py-3 px-4">Yo'nalish</th>
                      <th className="py-3 px-4">Qurilma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredEvents.map(ev => {
                      const isCheckIn = ev.type === 'CHECK_IN' || ev.type === 'IN';
                      const timeStr = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—';
                      return (
                        <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {ev.studentPhoto ? (
                                <img src={ev.studentPhoto} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/20" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-[11px]">
                                  {ev.studentName?.charAt(0) || 'O'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-200">{ev.studentName || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-400/90">{ev.faceId || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{timeStr}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isCheckIn ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}>
                              <I d={isCheckIn ? ICONS.in : ICONS.out} c="w-2.5 h-2.5" />
                              <span>{isCheckIn ? 'Kirish' : 'Chiqish'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{ev.deviceSerial || 'Face ID'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: FACE SYNC & CLASSES */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Yuzlarni Ommaviy Sinxronlash</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                O'quvchilar rasmlarini barcha yoki tanlangan Face ID terminallariga yuklash
              </p>
            </div>
            <button
              onClick={() => { setShowSyncModal(true); setSyncResult(null); }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/15"
            >
              <I d={ICONS.sync} c="w-4 h-4 text-slate-950" />
              <span>Yangi Sinxronizatsiyani Boshlash</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map(cls => (
              <div key={cls.id} className="p-4 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] hover:border-emerald-500/25 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{cls.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{cls.studentCount || 0} nafar o'quvchi</p>
                  </div>
                  <button
                    onClick={() => {
                      setSyncTargetClass(cls.id);
                      setShowSyncModal(true);
                      setSyncResult(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1"
                  >
                    <I d={ICONS.sync} c="w-3 h-3" />
                    <span>Yuklash</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK CAMERA MODAL */}
      {quickCameraTerminal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setQuickCameraTerminal(null)}>
          <div className="bg-[#0a1410] border border-emerald-500/25 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/15">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <I d={ICONS.camera} c="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{quickCameraTerminal.name} — Jonli Kamera</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{quickCameraTerminal.ipAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUnlockDoor(quickCameraTerminal.id)}
                  disabled={unlockingId === quickCameraTerminal.id}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center gap-1.5"
                >
                  <I d={ICONS.door} c="w-3.5 h-3.5" />
                  <span>{unlockingId === quickCameraTerminal.id ? 'Ochilmoqda...' : 'Eshikni Ochish'}</span>
                </button>
                <button onClick={() => setQuickCameraTerminal(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05]">
                  <I d={ICONS.close} c="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <TerminalLivePlayer terminalId={quickCameraTerminal.id} />
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TERMINAL MODAL */}
      {showAddEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowAddEdit(false)}>
          <div className="bg-[#0a1410] border border-emerald-500/25 rounded-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <I d={ICONS.faceId} c="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingTerminal ? "Terminalni Tahrirlash" : "Yangi Face ID Terminal Qo'shish"}
                  </h3>
                  <p className="text-xs text-slate-400">Hikvision ISAPI / DS-K1T seriyali qurilma parametrlari</p>
                </div>
              </div>
              <button onClick={() => setShowAddEdit(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05]">
                <I d={ICONS.close} c="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Terminal Nomi *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masalan: Kirish 1 (O'ng tomon)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Yo'nalishi</label>
                  <select
                    value={formData.direction}
                    onChange={e => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="ENTRANCE" className="bg-slate-900">KIRISH (Entrance)</option>
                    <option value="EXIT" className="bg-slate-900">CHIQISH (Exit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">IP Manzil *</label>
                  <input
                    type="text"
                    required
                    value={formData.ipAddress}
                    onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="Masalan: 192.168.88.251"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: e.target.value })}
                    placeholder="443 yoki 80"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Login (ISAPI)</label>
                  <input
                    type="text"
                    value={formData.deviceUsername}
                    onChange={e => setFormData({ ...formData, deviceUsername: e.target.value })}
                    placeholder="admin"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Parol {editingTerminal ? "(O'zgartirish uchun kiriting)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={formData.devicePassword}
                    onChange={e => setFormData({ ...formData, devicePassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="DS-K1T673DX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Seriya Raqami</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="DS-K1T673DX2021..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="useHttps"
                  checked={formData.useHttps}
                  onChange={e => setFormData({ ...formData, useHttps: e.target.checked })}
                  className="rounded bg-white/[0.04] border-white/[0.1] text-emerald-500 focus:ring-0"
                />
                <label htmlFor="useHttps" className="text-xs text-slate-300 cursor-pointer">
                  HTTPS protokoli orqali ulanish (Tavsiya etiladi)
                </label>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConn || !formData.ipAddress}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <I d={testingConn ? ICONS.refresh : ICONS.pulse} c={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                    <span>{testingConn ? 'Aloqa tekshirilmoqda...' : 'Aloqani Tekshirish (Test)'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`mt-2 p-3 rounded-xl border text-xs ${
                    testResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'
                  }`}>
                    {testResult.ok ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold flex items-center gap-1.5">
                          <I d={ICONS.check} c="w-3.5 h-3.5" />
                          <span>Terminalga muvaffaqiyatli ulandi!</span>
                        </p>
                        <p className="text-[11px] text-slate-300">Model: {testResult.model} • Seriya: {testResult.serialNumber}</p>
                      </div>
                    ) : (
                      <p className="flex items-center gap-1.5">
                        <I d={ICONS.warning} c="w-3.5 h-3.5" />
                        <span>{testResult.error || 'Ulanish xatosi'}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddEdit(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Bekor Qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all"
                >
                  {editingTerminal ? "O'zgarishlarni Saqlash" : "Terminalni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowSyncModal(false)}>
          <div className="bg-[#0a1410] border border-emerald-500/25 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <I d={ICONS.sync} c="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Yuzlarni Ommaviy Yuklash</h3>
                  <p className="text-xs text-slate-400">O'quvchilar rasmini Face ID xotirasiga kiritish</p>
                </div>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05]">
                <I d={ICONS.close} c="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Qaysi Terminalga Yuklansin?</label>
                <select
                  value={syncTargetTerm}
                  onChange={e => setSyncTargetTerm(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="all" className="bg-slate-900">Barcha terminallarga (Ommaviy)</option>
                  {terminals.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900">{t.name} ({t.ipAddress})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">O'quvchilar guruhi / Sinf</label>
                <select
                  value={syncTargetClass}
                  onChange={e => setSyncTargetClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="" className="bg-slate-900">Maktabdagi barcha o'quvchilar</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name} ({c.studentCount || 0} o'quvchi)</option>
                  ))}
                </select>
              </div>

              {syncResult && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  syncResult.error ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
                  {syncResult.error ? (
                    <p>{syncResult.error}</p>
                  ) : (
                    <div>
                      <p className="font-bold flex items-center gap-1.5 mb-1">
                        <I d={ICONS.check} c="w-4 h-4" />
                        <span>Sinxronizatsiya yakunlandi!</span>
                      </p>
                      <p className="text-slate-300">
                        Muvaffaqiyatli: <span className="font-bold text-emerald-400">{syncResult.successCount ?? syncResult.synced ?? 0}</span> ta yuz
                        {syncResult.failedCount ? ` • Xatolar: ${syncResult.failedCount} ta` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Yopish
                </button>
                <button
                  type="button"
                  onClick={handleSyncFaces}
                  disabled={syncing}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <I d={ICONS.sync} c={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Yuklanmoqda...' : 'Yuklashni Boshlash'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTION WIZARD MODAL */}
      {showWizard && (
        <ConnectionWizardModal
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onConnected={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      )}

      {/* FULL TERMINAL MANAGER (Live Stream, Events, Users, Diagnostics) */}
      {selectedTerminal && (
        <TerminalManager
          terminal={selectedTerminal}
          onClose={() => {
            setSelectedTerminal(null);
            loadData();
          }}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Terminalni o'chirish"
          message={`Haqiqatan ham "${deleteTarget.name}" (${deleteTarget.ipAddress}) Face ID terminalini tizimdan o'chirmoqchimisiz?`}
          confirmLabel="Ha, o'chirish"
          cancelLabel="Bekor qilish"
          onConfirm={handleDeleteTerminal}
          onCancel={() => setDeleteTarget(null)}
          isDanger
        />
      )}
    </div>
  );
}
