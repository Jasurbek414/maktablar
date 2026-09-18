import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import TerminalManager from '../components/devices/TerminalManager';
import DiscoveryPanel from '../components/devices/DiscoveryPanel';

// Backend CurrentUserService#canWriteSchoolData bilan bir xil — boshqaruv tugmalarini ko'rsatish uchun
// (asl tekshiruv baribir backendda).
const DEVICE_WRITE_ROLES = ['SUPERADMIN', 'ADMIN', 'REGION_DIRECTOR', 'DISTRICT_DIRECTOR', 'DIRECTOR', 'MUDIR'];

const I = ({ d, c = 'w-5 h-5' }) => (<svg className={c} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>);

const ICONS = {
  router: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  online: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  offline: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  terminals: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25',
  in: 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3',
  out: 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18',
  pulse: 'M9 12h1.5l1.5-4.5 3 9 1.5-4.5H21',
  refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  close: 'M6 18L18 6M6 6l12 12',
  edit: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z',
  swap: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  school: 'M12 14l9-5-9-5-9 5 9 5z',
  wifi: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z',
  download: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
  code: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
  copy: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5',
  check: 'M4.5 12.75l6 6 9-13.5',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
};

function timeAgo(s, t) { if (!s) return '—'; const d = Math.floor((Date.now() - new Date(s.includes('Z') ? s : s+'Z')) / 1000); return d < 60 ? t('devices.timeAgo.justNow') : d < 3600 ? t('devices.timeAgo.minutes', { count: Math.floor(d/60) }) : d < 86400 ? t('devices.timeAgo.hours', { count: Math.floor(d/3600) }) : t('devices.timeAgo.days', { count: Math.floor(d/86400) }); }

const SB = ({ status, t }) => {
  const map = { ONLINE: [t('devices.status.ONLINE'),'text-emerald-400','bg-emerald-500/10','bg-emerald-400'], OFFLINE: [t('devices.status.OFFLINE'),'text-red-400','bg-red-500/10','bg-red-400'], ERROR: [t('devices.status.ERROR'),'text-amber-400','bg-amber-500/10','bg-amber-400'] };
  const c = map[status] || [t('devices.status.unknown'),'text-slate-400','bg-slate-500/10','bg-slate-400'];
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c[2]} ${c[1]}`}><span className={`w-1.5 h-1.5 rounded-full ${c[3]} ${status==='ONLINE'?'animate-pulse':''}`}/>{c[0]}</span>;
};

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

function ConnectionPanel({ router, t }) {
  const [script, setScript] = useState(null);
  const [showScript, setShowScript] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const toggleScript = async () => {
    if (showScript) { setShowScript(false); return; }
    if (script) { setShowScript(true); return; }
    setScriptLoading(true); setError('');
    try {
      const res = await api.get(`/api/routers/${router.id}/wg-script`);
      setScript(res.script);
      setShowScript(true);
    } catch { setError(t('devices.network.loadError')); }
    setScriptLoading(false);
  };

  const downloadConf = async () => {
    setDownloading(true); setError('');
    try {
      const res = await api.get(`/api/routers/${router.id}/wg-config`);
      const blob = new Blob([res.config], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(router.name || 'router').replace(/\s+/g, '-')}.conf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setError(t('devices.network.loadError')); }
    setDownloading(false);
  };

  const serverConfigured = !!router.wgServerConfigured;

  return (
    <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2"><I d={ICONS.wifi} c="w-4 h-4 text-blue-400"/><p className="text-[12px] font-semibold text-blue-400">{t('devices.network.title')}</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/20 px-3 py-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider">{t('devices.network.vpnIp')}</p>
          <p className="text-[12px] text-blue-300 font-mono truncate">{router.vpnIp || '—'}</p>
        </div>
        <div className="rounded-lg bg-black/20 px-3 py-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider">{t('devices.network.lanSubnet')}</p>
          <p className="text-[12px] text-blue-300 font-mono truncate">{router.lanSubnet || '—'} <span className="text-slate-600">→ {router.mappedSubnet || '—'}</span></p>
        </div>
        <div className="rounded-lg bg-black/20 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">{t('devices.network.publicKey')}</p>
            <p className="text-[12px] text-blue-300 font-mono truncate">{router.wgPublicKey || '—'}</p>
          </div>
          {router.wgPublicKey && <button onClick={()=>copy(router.wgPublicKey)} className="p-1 rounded text-slate-500 hover:text-blue-300 shrink-0" title={t('devices.network.copyBtn')}><I d={copied?ICONS.check:ICONS.copy} c="w-3.5 h-3.5"/></button>}
        </div>
      </div>

      {!serverConfigured && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-3 py-2.5">
          <I d={ICONS.warning} c="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-[11px] font-semibold text-amber-400">{t('devices.network.serverNotConfiguredTitle')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('devices.network.serverNotConfiguredNote')}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-black/20 px-3 py-3 space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-300">{t('devices.network.setupTitle')}</p>
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
          <li>{t('devices.network.step1')}</li>
          <li>{t('devices.network.step2')}</li>
          <li>{t('devices.network.step3')}</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={toggleScript} disabled={scriptLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50">
          <I d={ICONS.code} c="w-3.5 h-3.5"/>{showScript ? t('devices.network.hideScriptBtn') : t('devices.network.showScriptBtn')}
        </button>
        <button onClick={downloadConf} disabled={downloading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all disabled:opacity-50" title={t('devices.network.note')}>
          <I d={ICONS.download} c="w-3.5 h-3.5"/>{t('devices.network.downloadConfBtn')}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {showScript && script && (
        <div className="relative">
          <pre className="text-[10px] text-slate-300 bg-black/40 border border-white/[0.06] rounded-lg p-3 pr-9 overflow-x-auto whitespace-pre-wrap font-mono">{script}</pre>
          <button onClick={()=>copy(script)} className="absolute top-2 right-2 p-1.5 rounded text-slate-500 hover:text-blue-300 hover:bg-white/[0.05]" title={t('devices.network.copyBtn')}>
            <I d={copied?ICONS.check:ICONS.copy} c="w-3.5 h-3.5"/>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Devices({ user }) {
  const { t } = useTranslation();
  const [routers, setRouters] = useState([]);
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
  const [termForm, setTermForm] = useState({ name: '', direction: 'ENTRANCE', roomId: '', serialNumber: '', brand: '', model: '', macAddress: '', ipAddress: '', port: '', useHttps: false, deviceUsername: '', devicePassword: '', notes: '' });
  const [schoolRooms, setSchoolRooms] = useState([]);
  const [delTarget, setDelTarget] = useState(null);
  const [assignForm, setAssignForm] = useState(null);
  const [assignSchoolId, setAssignSchoolId] = useState('');
  const [editRouterOpen, setEditRouterOpen] = useState(false);
  const [editRouterForm, setEditRouterForm] = useState({ name: '', vpnIp: '', lanSubnet: '', notes: '', routerAdminUsername: '', routerAdminPassword: '' });
  const [lanHosts, setLanHosts] = useState(null);
  const [lanHostsLoading, setLanHostsLoading] = useState(false);
  const [lanHostsError, setLanHostsError] = useState('');
  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [manageTerminal, setManageTerminal] = useState(null);
  const [showCreateCreds, setShowCreateCreds] = useState(false);
  const [credForm, setCredForm] = useState({ schoolId: '', name: '', vpnIp: '', lanSubnet: '' });
  const [credProv, setCredProv] = useState('');
  const [credDist, setCredDist] = useState('');
  const [createdCreds, setCreatedCreds] = useState(null);

  const isAdmin = ['SUPERADMIN','ADMIN'].includes(user?.role);
  const canWriteDevices = DEVICE_WRITE_ROLES.includes(user?.role);

  const load = useCallback(async () => {
    try {
      const params = selSchool ? `?schoolId=${selSchool}` : selDist ? `?districtId=${selDist}` : selProv ? `?provinceId=${selProv}` : '';
      const [rts, ov] = await Promise.all([api.get('/api/routers' + params), api.get('/api/routers/overview')]);
      setRouters(rts); setOverview(ov);
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

  const filtered = routers.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.name||'').toLowerCase().includes(s) || (r.schoolName||'').toLowerCase().includes(s) || (r.vpnIp||'').includes(s);
  });

  // Maktab bo'yicha guruhlash va Viloyat → Tuman → Maktab tartibida saralash
  const grouped = {};
  filtered.forEach(r => {
    const key = r.schoolName || (r.schoolId ? t('devices.group.schoolFallback', { id: r.schoolId }) : t('devices.group.unassigned'));
    if (!grouped[key]) grouped[key] = { schoolName: key, provinceName: r.provinceName || '', districtName: r.districtName || '', routers: [] };
    grouped[key].routers.push(r);
  });
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (a.provinceName !== b.provinceName) return (a.provinceName || '').localeCompare(b.provinceName || '', 'uz');
    if (a.districtName !== b.districtName) return (a.districtName || '').localeCompare(b.districtName || '', 'uz');
    return (a.schoolName || '').localeCompare(b.schoolName || '', 'uz');
  });

  const resetTermForm = () => setTermForm({ name: '', direction: 'ENTRANCE', roomId: '', serialNumber: '', brand: '', model: '', macAddress: '', ipAddress: '', port: '', useHttps: false, deviceUsername: '', devicePassword: '', notes: '' });

  const startAddTerminal = () => { setEditingTerminalId(null); resetTermForm(); setShowTermForm(true); setLanHosts(null); setLanHostsError(''); };
  // Qidiruvda topilgan qurilmadan: forma to'ldirilib ochiladi, foydalanuvchi nom/yo'nalishni tekshirib saqlaydi
  const startAddDiscovered = (prefill) => {
    setEditingTerminalId(null);
    setTermForm({ name: '', direction: 'ENTRANCE', roomId: '', serialNumber: '', brand: '', model: '', macAddress: '', ipAddress: '', port: '', useHttps: false, deviceUsername: '', devicePassword: '', notes: '', ...prefill });
    setShowTermForm(true);
    setLanHosts(null); setLanHostsError('');
  };
  // Terminal formasi ochilganda routerning maktabidagi xonalar yuklanadi ("oxirgi ko'ringan joy" uchun).
  useEffect(() => {
    if (!showTermForm || !detail?.schoolId) { setSchoolRooms([]); return; }
    api.get(`/api/rooms?schoolId=${detail.schoolId}`).then(setSchoolRooms).catch(() => setSchoolRooms([]));
  }, [showTermForm, detail?.schoolId]);

  const toggleTermForm = () => { if (showTermForm) { setShowTermForm(false); setEditingTerminalId(null); } else { startAddTerminal(); } };
  const startEditTerminal = (term) => {
    setEditingTerminalId(term.id);
    // devicePassword doim bo'sh boshlanadi — backend uni hech qachon qaytarmaydi (faqat
    // hasDevicePassword bayrog'i); bo'sh qoldirilsa eski parol saqlanadi (RouterController).
    setTermForm({ name: term.name||'', direction: term.direction||'ENTRANCE', roomId: term.roomId ?? '', serialNumber: term.serialNumber||'', brand: term.brand||'', model: term.model||'', macAddress: term.macAddress||'', ipAddress: term.ipAddress||'', port: term.port||'', useHttps: !!term.useHttps, deviceUsername: term.deviceUsername||'', devicePassword: '', notes: term.notes||'' });
    setShowTermForm(true);
    setLanHosts(null); setLanHostsError('');
  };

  // Routerning o'z ARP/DHCP jadvalidan haqiqiy ulangan qurilmalarni yuklaydi — "Terminal qo'shish"
  // formasidagi IP maydonini qo'lda kiritish o'rniga tanlab qo'yish uchun.
  const loadLanHosts = async () => {
    if (!detail) return;
    setLanHostsLoading(true); setLanHostsError('');
    try {
      const res = await api.get(`/api/routers/${detail.id}/lan-hosts`);
      setLanHosts(res.hosts || []);
    } catch (e) {
      setLanHosts(null);
      setLanHostsError(e.response?.data?.error || e.message || t('common.errorOccurred'));
    }
    setLanHostsLoading(false);
  };

  const saveTerminal = async () => {
    if (!detail || !termForm.name) return;
    try {
      if (editingTerminalId) {
        await api.put(`/api/routers/terminals/${editingTerminalId}`, termForm);
      } else {
        await api.post(`/api/routers/${detail.id}/terminals`, termForm);
      }
      const updated = await api.get(`/api/routers/${detail.id}`);
      setDetail(updated); setShowTermForm(false); setEditingTerminalId(null);
      resetTermForm();
      load();
    } catch (e) { alert(e.response?.data?.error || e.message || t('common.errorOccurred')); }
  };

  const openEditRouter = () => {
    if (!detail) return;
    // routerAdminPassword doim bo'sh boshlanadi — backend uni hech qachon qaytarmaydi (faqat
    // hasRouterAdminPassword bayrog'i); bo'sh qoldirilsa eski parol saqlanadi (RouterController).
    setEditRouterForm({ name: detail.name||'', vpnIp: detail.vpnIp||'', lanSubnet: detail.lanSubnet||'', notes: detail.notes||'', routerAdminUsername: detail.routerAdminUsername||'', routerAdminPassword: '' });
    setEditRouterOpen(true);
  };

  const submitEditRouter = async () => {
    if (!detail) return;
    try {
      const updated = await api.put(`/api/routers/${detail.id}`, editRouterForm);
      setDetail(updated); setEditRouterOpen(false);
      load();
    } catch (e) { alert(e.response?.data?.error || e.message || t('common.errorOccurred')); }
  };

  const delTerminal = async (tid) => {
    try {
      await api.del(`/api/routers/terminals/${tid}`);
      const updated = await api.get(`/api/routers/${detail.id}`);
      setDetail(updated); load();
    } catch (e) { alert(e.response?.data?.error || e.message || t('common.errorOccurred')); }
  };

  const delRouter = async () => {
    if (!delTarget) return;
    try {
      await api.del(`/api/routers/${delTarget}`);
      setDelTarget(null); setDetail(null); load();
    } catch (e) { alert(e.response?.data?.error || e.message || t('common.errorOccurred')); }
  };

  const submitAssign = async () => {
    if (!assignForm || !assignSchoolId) return;
    try {
      await api.put(`/api/routers/${assignForm.id}/assign-school`, { schoolId: assignSchoolId });
      setAssignForm(null); setAssignSchoolId('');
      if (detail && detail.id === assignForm.id) {
          const updated = await api.get(`/api/routers/${detail.id}`);
          setDetail(updated);
      }
      load();
    } catch (e) { alert(e.response?.data?.error || e.message || t('common.errorOccurred')); }
  };

  const submitCreateCreds = async () => {
    if (!credForm.schoolId) return alert(t('devices.creds.fillAll'));
    try {
      const res = await api.post('/api/routers/create-key', credForm);
      setCreatedCreds(res);
      setCredForm({ schoolId: '', name: '', vpnIp: '', lanSubnet: '' });
      load();
    } catch(e) { alert(e.response?.data?.error || t('common.errorOccurred')); }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (<div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <I d={ICONS.router} c="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('devices.pageTitle')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('devices.pageSubtitle')}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {isAdmin && <button onClick={()=>{setShowCreateCreds(true);setCreatedCreds(null)}} className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all">{t('devices.createKeyBtn')}</button>}
        <button onClick={load} className="p-2.5 rounded-xl bg-[#0d1a14] border border-emerald-500/[0.08] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-all" title={t('common.refresh') || ''}><I d={ICONS.refresh} c="w-4 h-4"/></button>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <StatTile label={t('devices.stats.miniPc')} value={overview.totalRouters||0} icon={ICONS.router} color="bg-blue-500/10 text-blue-400" glow="bg-blue-500/20" />
      <StatTile label={t('devices.stats.online')} value={overview.onlineRouters||0} icon={ICONS.online} color="bg-emerald-500/10 text-emerald-400" glow="bg-emerald-500/20" />
      <StatTile label={t('devices.stats.offline')} value={overview.offlineRouters||0} icon={ICONS.offline} color="bg-red-500/10 text-red-400" glow="bg-red-500/20" />
      <StatTile label={t('devices.stats.totalTerminals')} value={overview.totalTerminals||0} icon={ICONS.terminals} color="bg-purple-500/10 text-purple-400" glow="bg-purple-500/20" />
      <StatTile label={t('devices.stats.entrance')} value={overview.entranceTerminals||0} icon={ICONS.in} color="bg-cyan-500/10 text-cyan-400" glow="bg-cyan-500/20" />
      <StatTile label={t('devices.stats.exit')} value={overview.exitTerminals||0} icon={ICONS.out} color="bg-orange-500/10 text-orange-400" glow="bg-orange-500/20" />
      <StatTile label={t('devices.stats.terminalsOnline')} value={overview.onlineTerminals||0} icon={ICONS.pulse} color="bg-teal-500/10 text-teal-400" glow="bg-teal-500/20" />
    </div>

    {/* Filters */}
    {isAdmin && <div className="flex flex-wrap gap-3 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08] p-3">
      <select value={selProv} onChange={e => { setSelProv(e.target.value); setSelDist(''); setSelSchool(''); }} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">{t('devices.filters.allProvinces')}</option>
        {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={selDist} onChange={e => { setSelDist(e.target.value); setSelSchool(''); }} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">{t('devices.filters.allDistricts')}</option>
        {filteredDists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={selSchool} onChange={e => setSelSchool(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 focus:border-emerald-500/30 focus:outline-none">
        <option value="">{t('devices.filters.allSchools')}</option>
        {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="relative flex-1 min-w-[200px]">
        <I d={ICONS.search} c="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('common.searchPlaceholder')} className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-slate-300 placeholder-slate-600 focus:border-emerald-500/30 focus:outline-none"/>
      </div>
    </div>}

    {/* Router list grouped by school — sorted: Viloyat → Tuman → Maktab */}
    {sortedGroups.length === 0 ? (
      <div className="flex flex-col items-center py-24 rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.08]">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.06] flex items-center justify-center mb-4"><I d={ICONS.router} c="w-7 h-7 text-slate-700"/></div>
        <p className="text-slate-400 font-medium">{t('devices.empty.title')}</p>
        <p className="text-xs text-slate-600 mt-1">{t('devices.empty.sub')}</p>
      </div>
    ) : sortedGroups.map((g, gi) => (
      <div key={gi} className="space-y-3">
        {/* School header */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><I d={ICONS.school} c="w-4 h-4 text-emerald-400"/></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{g.schoolName}</p>
            <p className="text-[10px] text-slate-600">{[g.provinceName, g.districtName].filter(Boolean).join(' / ')}</p>
          </div>
          <span className="ml-auto text-[11px] text-slate-600 shrink-0">{t('devices.group.count', { count: g.routers.length })}</span>
        </div>

        {/* Routers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pl-[42px]">
          {g.routers.map(r => (
            <div key={r.id} onClick={() => setDetail(r)}
              className={`group relative overflow-hidden rounded-2xl bg-[#0d1a14] border p-5 cursor-pointer shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 ${r.status==='ONLINE' ? 'border-emerald-500/[0.1] hover:border-emerald-500/25' : 'border-emerald-500/[0.06] hover:border-emerald-500/15'}`}>
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${r.status==='ONLINE' ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`} />
              <div className="relative flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.status==='ONLINE'?'bg-emerald-500/15 text-emerald-400':'bg-slate-800/60 text-slate-500'}`}>
                    <I d={ICONS.router}/>
                  </div>
                  <div className="min-w-0"><p className="text-[14px] font-semibold text-slate-200 truncate">{r.name}</p><p className="text-[11px] text-slate-500 font-mono truncate">VPN: {r.vpnIp || '—'}</p></div>
                </div>
                <SB status={r.status} t={t}/>
              </div>
              {/* Terminal summary */}
              <div className="relative grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><div className="flex items-center justify-center gap-1 text-cyan-400/70"><I d={ICONS.in} c="w-2.5 h-2.5"/><p className="text-[9px] text-slate-600">{t('devices.card.entrance')}</p></div><p className="text-sm font-bold text-cyan-400">{r.entranceTerminals||0}</p></div>
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><div className="flex items-center justify-center gap-1 text-orange-400/70"><I d={ICONS.out} c="w-2.5 h-2.5"/><p className="text-[9px] text-slate-600">{t('devices.card.exit')}</p></div><p className="text-sm font-bold text-orange-400">{r.exitTerminals||0}</p></div>
                <div className="rounded-lg bg-white/[0.02] px-2 py-1.5 text-center"><p className="text-[9px] text-slate-600">{t('devices.card.total')}</p><p className="text-sm font-bold text-slate-300">{r.faceTerminalCount||0}</p></div>
              </div>
              <div className="relative flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
                <p className="text-[10px] text-slate-600">{t('devices.card.heartbeat', { time: timeAgo(r.lastHeartbeat, t) })}</p>
                <button onClick={e=>{e.stopPropagation();setDelTarget(r.id)}} className="p-1 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><I d={ICONS.trash} c="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}

    {/* Detail modal */}
    {detail && <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={()=>setDetail(null)}>
      <div className="bg-[#0d1a14] border border-emerald-500/[0.12] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] sticky top-0 bg-[#0d1a14]/95 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${detail.status==='ONLINE'?'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20':'bg-slate-800/60 text-slate-500 ring-1 ring-white/[0.06]'}`}><I d={ICONS.router}/></div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-white truncate">{detail.name}</h3>
              <p className="text-[11px] text-slate-500 truncate">{detail.schoolName ? `${detail.schoolName} • ${detail.districtName} • ${detail.provinceName}` : <span className="text-amber-400">{t('devices.detail.notAssigned')}</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && <button onClick={openEditRouter} className="p-2 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-white/[0.05]" title={t('devices.edit.editRouterBtn')}><I d={ICONS.edit} c="w-4 h-4"/></button>}
            {isAdmin && <button onClick={()=>{setAssignForm(detail);setAssignSchoolId(detail.schoolId||'')}} className="p-2 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-white/[0.05]" title={t('devices.assign.title')}><I d={ICONS.swap} c="w-4 h-4"/></button>}
            <button onClick={()=>setDetail(null)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05]"><I d={ICONS.close} c="w-5 h-5"/></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3"><SB status={detail.status} t={t}/><span className="text-[11px] text-slate-600">{t('devices.detail.vpnIpLabel')}: <span className="text-slate-400 font-mono">{detail.vpnIp||'—'}</span></span></div>
            <span className="text-[10px] text-slate-700">{t('devices.card.heartbeat', { time: timeAgo(detail.lastHeartbeat, t) })}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[[t('devices.detail.terminalsStat'),(detail.terminals||[]).length,'text-purple-400 bg-purple-500/10'],[t('devices.detail.entranceStat'),detail.entranceTerminals||0,'text-cyan-400 bg-cyan-500/10'],[t('devices.detail.exitStat'),detail.exitTerminals||0,'text-orange-400 bg-orange-500/10'],[t('devices.detail.facesStat'),(detail.terminals||[]).reduce((s,t2)=>s+(t2.registeredFaces||0),0),'text-pink-400 bg-pink-500/10']].map(([l,v,c],i) => (
              <div key={i} className={`rounded-xl p-3 ${c.split(' ').slice(1).join(' ')} border border-white/[0.03]`}><p className="text-[9px] text-slate-600 uppercase tracking-wider">{l}</p><p className={`text-lg font-bold mt-1 tabular-nums ${c.split(' ')[0]}`}>{v}</p></div>
            ))}
          </div>

          {/* Face ID Terminals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200">{t('devices.detail.terminalsTitle')}</h4>
              <button onClick={toggleTermForm} className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">{t('devices.detail.addTerminalBtn')}</button>
            </div>

            {showTermForm && <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-3 space-y-3">
              <p className="text-[11px] font-semibold text-slate-400">{editingTerminalId ? t('devices.form.editTerminalTitle') : t('devices.form.newTerminalTitle')}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <input value={termForm.name} onChange={e=>setTermForm({...termForm,name:e.target.value})} placeholder={t('devices.form.name')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <select value={termForm.direction} onChange={e=>setTermForm({...termForm,direction:e.target.value})} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white focus:outline-none">
                  <option value="ENTRANCE">{t('devices.form.entranceOption')}</option><option value="EXIT">{t('devices.form.exitOption')}</option>
                </select>
                <select value={termForm.roomId ?? ''} onChange={e=>setTermForm({...termForm,roomId:e.target.value})} title={t('devices.form.roomHint')} className="col-span-2 px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white focus:outline-none">
                  <option value="">{t('devices.form.noRoom')}</option>
                  {schoolRooms.map(r => <option key={r.id} value={r.id}>{r.number} — {r.name}</option>)}
                </select>
                <input value={termForm.brand} onChange={e=>setTermForm({...termForm,brand:e.target.value})} placeholder={t('devices.form.brand')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <input value={termForm.model} onChange={e=>setTermForm({...termForm,model:e.target.value})} placeholder={t('devices.form.model')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <input value={termForm.serialNumber} onChange={e=>setTermForm({...termForm,serialNumber:e.target.value})} placeholder={t('devices.form.serial')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-amber-500/20 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"/>
                <input value={termForm.macAddress} onChange={e=>setTermForm({...termForm,macAddress:e.target.value})} placeholder={t('devices.form.mac')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <div className="relative">
                  <div className="flex gap-1.5">
                    <input value={termForm.ipAddress} onChange={e=>setTermForm({...termForm,ipAddress:e.target.value})} placeholder={t('devices.form.ip')} className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                    <button type="button" onClick={loadLanHosts} disabled={lanHostsLoading} title={t('devices.form.ipDiscoverBtn')} className="px-2.5 rounded-lg text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-50 shrink-0">
                      <I d={lanHostsLoading ? ICONS.refresh : ICONS.search} c={`w-4 h-4 ${lanHostsLoading?'animate-spin':''}`}/>
                    </button>
                  </div>
                  {(lanHosts || lanHostsError) && (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-[#0f1f18] border border-white/[0.08] shadow-xl">
                      {lanHostsError ? (
                        <p className="px-3 py-2 text-[11px] text-red-400">{lanHostsError}</p>
                      ) : lanHosts.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-500">{t('devices.form.ipDiscoverEmpty')}</p>
                      ) : lanHosts.map(h => (
                        <button type="button" key={h.ipAddress}
                          onClick={()=>{ setTermForm({...termForm, ipAddress: h.ipAddress, macAddress: termForm.macAddress || h.macAddress || ''}); setLanHosts(null); }}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors">
                          <span className="min-w-0">
                            <span className="block text-[12px] font-mono text-emerald-300">{h.ipAddress}</span>
                            <span className="block text-[10px] text-slate-600 truncate">{h.hostName || h.macAddress || ''}</span>
                          </span>
                          {h.registeredTerminalId && <span className="text-[9px] text-amber-500/80 shrink-0">{t('devices.form.ipDiscoverRegistered')}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input value={termForm.port} onChange={e=>setTermForm({...termForm,port:e.target.value})} placeholder={t('devices.form.port')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <input value={termForm.deviceUsername} onChange={e=>setTermForm({...termForm,deviceUsername:e.target.value})} placeholder={t('devices.form.deviceUsername')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
                <input type="password" value={termForm.devicePassword} onChange={e=>setTermForm({...termForm,devicePassword:e.target.value})} placeholder={editingTerminalId ? `${t('devices.form.devicePassword')} — ${t('devices.form.devicePasswordEditHint')}` : t('devices.form.devicePassword')} className="px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={termForm.useHttps} onChange={e=>setTermForm({...termForm,useHttps:e.target.checked})} />
                {t('devices.form.useHttps')}
              </label>
              <input value={termForm.notes} onChange={e=>setTermForm({...termForm,notes:e.target.value})} placeholder={t('devices.form.notes')} className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/[0.06] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"/>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{setShowTermForm(false);setEditingTerminalId(null);}} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300">{t('common.cancel')}</button>
                <button onClick={saveTerminal} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">{editingTerminalId ? t('common.update') : t('common.save')}</button>
              </div>
            </div>}

            {(detail.terminals||[]).length === 0 ? (
              <div className="text-center py-6 rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06]"><p className="text-xs text-slate-600">{t('devices.form.noTerminals')}</p></div>
            ) : (
              <div className="space-y-2">
                {(detail.terminals||[]).map(t2 => (
                  <div key={t2.id} className="rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all group">
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t2.direction==='ENTRANCE'?'bg-cyan-500/10 text-cyan-400':'bg-orange-500/10 text-orange-400'}`}>
                        <I d={t2.direction==='ENTRANCE'?ICONS.in:ICONS.out} c="w-4.5 h-4.5"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="text-[13px] font-semibold text-white truncate">{t2.name}</p><SB status={t2.status} t={t}/></div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-600">
                          {t2.brand && <span className="text-slate-500">{t2.brand}</span>}
                          {t2.model && <span>{t2.model}</span>}
                          {t2.serialNumber && <span className="text-amber-500/80 font-mono">SN: {t2.serialNumber}</span>}
                        </div>
                      </div>
                      <div className="text-right mr-1 shrink-0">
                        <p className="text-[10px] text-slate-600">IP: <span className="text-slate-400 font-mono">{t2.ipAddress||'—'}</span></p>
                        {t2.macAddress && <p className="text-[10px] text-slate-700">MAC: {t2.macAddress}</p>}
                        {t2.registeredFaces>0 && <p className="text-[10px] text-pink-400">{t2.registeredFaces} yuz</p>}
                      </div>
                      <button onClick={()=>setManageTerminal(t2)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 shrink-0">{t('devices.detail.manageBtn')}</button>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={()=>startEditTerminal(t2)} className="p-1.5 rounded text-slate-700 hover:text-emerald-400"><I d={ICONS.edit} c="w-3.5 h-3.5"/></button>
                        <button onClick={()=>delTerminal(t2.id)} className="p-1.5 rounded text-slate-700 hover:text-red-400"><I d={ICONS.close} c="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    {t2.lastError && <div className="px-4 pb-2 flex items-start gap-1.5"><I d={ICONS.warning} c="w-3 h-3 text-amber-400 shrink-0 mt-0.5"/><p className="text-[10px] text-amber-400/90">{t2.lastError}</p></div>}
                    {t2.notes && <div className="px-4 pb-2"><p className="text-[10px] text-slate-600 italic">💬 {t2.notes}</p></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mikrotik connection setup */}
          <ConnectionPanel router={detail} t={t} />

          {/* Router ortidagi Face ID / kameralarni qidirish */}
          <DiscoveryPanel router={detail} canWrite={canWriteDevices} t={t} onAddTerminal={startAddDiscovered} />
        </div>
      </div>
    </div>}

    {manageTerminal && <TerminalManager terminal={manageTerminal} canWrite={canWriteDevices} t={t} onClose={()=>setManageTerminal(null)} />}

    {/* Assign Modal */}
    {assignForm && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={()=>setAssignForm(null)}>
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 space-y-4 animate-slide-up" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{t('devices.assign.title')}</h3>
        <p className="text-xs text-slate-400">{t('devices.assign.deviceLabel')} <span className="font-semibold text-white">{assignForm.name}</span></p>
        <div className="space-y-3">
          <select value={assignSchoolId} onChange={e=>setAssignSchoolId(e.target.value)} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none">
            <option value="">{t('devices.assign.selectSchool')}</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.districtName} - {s.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={()=>setAssignForm(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t('common.cancel')}</button>
          <button onClick={submitAssign} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20">{t('common.save')}</button>
        </div>
      </div>
    </div>}

    {/* Edit Router Modal */}
    {editRouterOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={()=>setEditRouterOpen(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 space-y-4 animate-slide-up" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{t('devices.edit.title')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.nameLabel')}</label>
            <input value={editRouterForm.name} onChange={e=>setEditRouterForm({...editRouterForm,name:e.target.value})} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500/40 focus:outline-none"/>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.vpnIpLabel')}</label>
            <input value={editRouterForm.vpnIp} onChange={e=>setEditRouterForm({...editRouterForm,vpnIp:e.target.value})} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-emerald-500/40 focus:outline-none"/>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.lanSubnetLabel')}</label>
            <input value={editRouterForm.lanSubnet} onChange={e=>setEditRouterForm({...editRouterForm,lanSubnet:e.target.value})} placeholder="192.168.88.0/24" className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none"/>
            <p className="text-[10px] text-slate-600 mt-1">{t('devices.edit.lanSubnetHint')}</p>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.notesLabel')}</label>
            <input value={editRouterForm.notes} onChange={e=>setEditRouterForm({...editRouterForm,notes:e.target.value})} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500/40 focus:outline-none"/>
          </div>
          <div className="border-t border-white/[0.04] pt-3 space-y-3">
            <p className="text-[10px] text-slate-600">{t('devices.edit.routerAdminNote')}</p>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.routerAdminUsernameLabel')}</label>
              <input value={editRouterForm.routerAdminUsername} onChange={e=>setEditRouterForm({...editRouterForm,routerAdminUsername:e.target.value})} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500/40 focus:outline-none"/>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">{t('devices.edit.routerAdminPasswordLabel')}</label>
              <input type="password" value={editRouterForm.routerAdminPassword} onChange={e=>setEditRouterForm({...editRouterForm,routerAdminPassword:e.target.value})} placeholder={detail?.hasRouterAdminPassword ? t('devices.edit.routerAdminPasswordEditHint') : ''} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none"/>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={()=>setEditRouterOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t('common.cancel')}</button>
          <button onClick={submitEditRouter} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20">{t('common.update')}</button>
        </div>
      </div>
    </div>}
    {/* Create Credentials Modal */}
    {showCreateCreds && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={()=>setShowCreateCreds(false)}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 space-y-4 animate-slide-up" onClick={e=>e.stopPropagation()}>
        {!createdCreds ? <>
          <h3 className="text-lg font-bold text-white">{t('devices.creds.title')}</h3>
          <p className="text-xs text-slate-400">{t('devices.creds.subtitle')}</p>
          <div className="space-y-3">
            <select value={credProv} onChange={e=>{setCredProv(e.target.value);setCredDist('');setCredForm({...credForm,schoolId:''})}} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none">
              <option value="">{t('devices.creds.selectProvince')}</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={credDist} onChange={e=>{setCredDist(e.target.value);setCredForm({...credForm,schoolId:''})}} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none" disabled={!credProv}>
              <option value="">{t('devices.creds.selectDistrict')}</option>
              {districts.filter(d=>d.provinceId?.toString()===credProv).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={credForm.schoolId} onChange={e=>setCredForm({...credForm,schoolId:e.target.value})} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none" disabled={!credDist}>
              <option value="">{t('devices.creds.selectSchool')}</option>
              {schools.filter(s=>s.districtId?.toString()===credDist).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="border-t border-white/[0.04] pt-3"></div>
            <input value={credForm.name} onChange={e=>setCredForm({...credForm,name:e.target.value})} placeholder={t('devices.creds.namePlaceholder')} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none placeholder-slate-600"/>
            <input value={credForm.vpnIp} onChange={e=>setCredForm({...credForm,vpnIp:e.target.value})} placeholder={t('devices.creds.vpnIpPlaceholder')} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:border-emerald-500/40 focus:outline-none placeholder-slate-600"/>
            <input value={credForm.lanSubnet} onChange={e=>setCredForm({...credForm,lanSubnet:e.target.value})} placeholder={t('devices.creds.lanSubnetPlaceholder')} className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm font-mono focus:border-emerald-500/40 focus:outline-none placeholder-slate-600"/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={()=>setShowCreateCreds(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t('common.cancel')}</button>
            <button onClick={submitCreateCreds} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20">{t('devices.creds.createBtn')}</button>
          </div>
        </> : <>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><I d={ICONS.online} c="w-4 h-4 text-emerald-400"/></div>
            <h3 className="text-lg font-bold text-emerald-400">{t('devices.creds.createdTitle')}</h3>
          </div>
          <p className="text-xs text-slate-400">{t('devices.creds.createdSubtitle')}</p>
          <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4 space-y-3 font-mono text-sm">
            <div><span className="text-[10px] text-slate-600 uppercase block tracking-wider">{t('devices.creds.school')}</span><span className="text-white">{createdCreds.schoolName}</span></div>
            <div><span className="text-[10px] text-slate-600 uppercase block tracking-wider">{t('devices.creds.apiKey')}</span><span className="text-cyan-400 font-bold select-all break-all">{createdCreds.apiKey}</span></div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={()=>{setShowCreateCreds(false);setCredProv('');setCredDist('')}} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20">{t('common.close')}</button>
          </div>
        </>}
      </div>
    </div>}

    {/* Delete confirm */}
    <ConfirmModal
      open={!!delTarget}
      onCancel={()=>setDelTarget(null)}
      onConfirm={delRouter}
      title={t('devices.deleteConfirm.title')}
      message={t('devices.deleteConfirm.message')}
    />
  </div>);
}
