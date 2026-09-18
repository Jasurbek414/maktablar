import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';
import ConfirmModal from '../components/ConfirmModal';

export const NOTIF_PREF_KEY = 'notifPrefs';
export const NOTIF_TYPES = [
  { value: 'ATTENDANCE' },
  { value: 'DEVICE_STATUS' },
  { value: 'SYSTEM' },
  { value: 'ALERT' },
  { value: 'USER_ACTION' },
];

export function getNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_PREF_KEY);
    if (!raw) return NOTIF_TYPES.map(t => t.value);
    return JSON.parse(raw);
  } catch { return NOTIF_TYPES.map(t => t.value); }
}

const TAB_ICONS = {
  profile: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  password: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  school: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21',
  notifications: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  cameras: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
};
const CAMERA_MANAGER_ROLES = ['SUPERADMIN', 'ADMIN', 'REGION_DIRECTOR', 'DISTRICT_DIRECTOR', 'DIRECTOR', 'MUDIR'];
const SCOPE_ROLES = ['SUPERADMIN', 'ADMIN', 'REGION_DIRECTOR', 'DISTRICT_DIRECTOR'];

function Card({ title, desc, children }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.08] p-7 mb-5">
      {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
      {desc && <p className="text-xs text-slate-500 mt-1 mb-6">{desc}</p>}
      {title && !desc && <div className="mb-6" />}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-600' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function Settings({ user, onUserUpdate }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(() => {
    const requested = localStorage.getItem('settingsTab');
    if (requested) localStorage.removeItem('settingsTab');
    return requested || 'profile';
  });
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgOk, setPasswordMsgOk] = useState(false);

  const [school, setSchool] = useState(null);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ address: '', phone: '', schoolNumber: '', foundedYear: '' });
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolMsg, setSchoolMsg] = useState('');
  const [schoolMsgOk, setSchoolMsgOk] = useState(false);
  const canEditSchool = user?.role === 'DIRECTOR' || user?.role === 'MUDIR';

  const [prefs, setPrefs] = useState(getNotifPrefs());

  const canManageCameras = CAMERA_MANAGER_ROLES.includes(user?.role);
  const canPickCameraSchool = SCOPE_ROLES.includes(user?.role);
  const TAB_IDS = ['profile', 'password', 'school', 'notifications', ...(canManageCameras ? ['cameras'] : [])];

  const [camSchools, setCamSchools] = useState([]);
  const [camSchoolId, setCamSchoolId] = useState(user?.schoolId || '');
  const [rooms, setRooms] = useState([]);
  const [roomEditing, setRoomEditing] = useState(null);
  const [roomForm, setRoomForm] = useState({ number: '', name: '' });
  const [savingRoom, setSavingRoom] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState(null);

  const [cams, setCams] = useState([]);
  const [camEditing, setCamEditing] = useState(null);
  const [camForm, setCamForm] = useState({});
  const [savingCam, setSavingCam] = useState(false);
  const [deleteCamId, setDeleteCamId] = useState(null);

  useEffect(() => {
    if (canManageCameras && canPickCameraSchool) {
      api.get('/api/schools').then(setCamSchools).catch(() => setCamSchools([]));
    }
  }, [canManageCameras, canPickCameraSchool]);

  const loadRoomsAndCams = useCallback(() => {
    if (!camSchoolId) { setRooms([]); setCams([]); return; }
    api.get(`/api/rooms?schoolId=${camSchoolId}`).then(setRooms).catch(() => setRooms([]));
    api.get(`/api/cameras?schoolId=${camSchoolId}`).then(setCams).catch(() => setCams([]));
  }, [camSchoolId]);

  useEffect(() => { if (tab === 'cameras') loadRoomsAndCams(); }, [tab, camSchoolId, loadRoomsAndCams]);

  const openRoomAdd = () => { setRoomEditing(null); setRoomForm({ number: '', name: '' }); };
  const openRoomEdit = (r) => { setRoomEditing(r); setRoomForm({ number: r.number, name: r.name }); };
  const saveRoom = async () => {
    if (!roomForm.number?.trim() || !roomForm.name?.trim()) { alert(t('cameras.rooms.numberRequired')); return; }
    setSavingRoom(true);
    try {
      if (roomEditing) await api.put(`/api/rooms/${roomEditing.id}`, roomForm);
      else await api.post('/api/rooms', { ...roomForm, schoolId: camSchoolId });
      setRoomEditing(null);
      setRoomForm({ number: '', name: '' });
      loadRoomsAndCams();
    } catch (e) { alert(e.message || t('cameras.rooms.saveError')); }
    setSavingRoom(false);
  };
  const removeRoom = async (id) => {
    try { await api.del(`/api/rooms/${id}`); setDeleteRoomId(null); loadRoomsAndCams(); } catch (e) { alert(e.message || t('cameras.rooms.deleteError')); }
  };

  const openCamAdd = () => { setCamEditing(null); setCamForm({ name: '', roomId: '', ipAddress: '', resolution: '', status: 'OFFLINE', notes: '' }); };
  const openCamEdit = (c) => { setCamEditing(c); setCamForm({ ...c }); };
  const saveCam = async () => {
    if (!camForm.name?.trim()) { alert(t('cameras.modal.nameRequired')); return; }
    setSavingCam(true);
    try {
      if (camEditing) await api.put(`/api/cameras/${camEditing.id}`, camForm);
      else await api.post('/api/cameras', { ...camForm, schoolId: camSchoolId });
      setCamEditing(null);
      setCamForm({ name: '', roomId: '', ipAddress: '', resolution: '', status: 'OFFLINE', notes: '' });
      loadRoomsAndCams();
    } catch (e) { alert(e.message || t('cameras.modal.saveError')); }
    setSavingCam(false);
  };
  const removeCam = async (id) => {
    try { await api.del(`/api/cameras/${id}`); setDeleteCamId(null); loadRoomsAndCams(); } catch (e) { alert(e.message || t('cameras.modal.deleteError')); }
  };

  const loadSchool = () => {
    if (!user?.schoolId) return;
    setSchoolLoading(true);
    api.get(`/api/schools/${user.schoolId}`).then(s => {
      setSchool(s);
      setSchoolForm({
        address: s.address || '', phone: s.phone || '',
        schoolNumber: s.schoolNumber || '', foundedYear: s.foundedYear || '',
      });
    }).catch(() => setSchool(null)).finally(() => setSchoolLoading(false));
  };

  useEffect(() => { loadSchool(); }, [user?.schoolId]);

  const saveSchoolProfile = async () => {
    setSavingSchool(true); setSchoolMsg(''); setSchoolMsgOk(false);
    try {
      await api.patch(`/api/schools/${user.schoolId}/profile`, schoolForm);
      setSchoolMsg(t('settings.school.savedMsg')); setSchoolMsgOk(true);
      loadSchool();
      setTimeout(() => setSchoolMsg(''), 3000);
    } catch (e) { setSchoolMsg(e.message || t('settings.profile.errorMsg')); }
    setSavingSchool(false);
  };

  const saveProfile = async () => {
    setSavingProfile(true); setProfileMsg('');
    try {
      const updated = await api.patch('/api/auth/me', { fullName, phone });
      setProfileMsg(t('settings.profile.savedMsg'));
      const nextUser = { ...user, fullName: updated.fullName, phone: updated.phone };
      if (onUserUpdate) onUserUpdate(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e) { setProfileMsg(e.message || t('settings.profile.errorMsg')); }
    setSavingProfile(false);
  };

  const savePassword = async () => {
    setPasswordMsg(''); setPasswordMsgOk(false);
    if (!oldPassword || !newPassword) { setPasswordMsg(t('settings.password.fillAllFields')); return; }
    if (newPassword !== newPassword2) { setPasswordMsg(t('settings.password.mismatch')); return; }
    if (newPassword.length < 6) { setPasswordMsg(t('settings.password.tooShort')); return; }
    setSavingPassword(true);
    try {
      await api.post('/api/auth/change-password', { oldPassword, newPassword });
      setPasswordMsg(t('settings.password.changedMsg')); setPasswordMsgOk(true);
      setOldPassword(''); setNewPassword(''); setNewPassword2('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (e) { setPasswordMsg(e.message || t('settings.password.wrongOldMsg')); }
    setSavingPassword(false);
  };

  const togglePref = (type) => {
    const next = prefs.includes(type) ? prefs.filter(t => t !== type) : [...prefs, type];
    setPrefs(next);
    localStorage.setItem(NOTIF_PREF_KEY, JSON.stringify(next));
  };

  const initials = (user?.fullName || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* ── Chap panel: profil karta + vertikal navigatsiya ── */}
        <div className="lg:sticky lg:top-0 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.08] p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <h2 className="text-base font-semibold text-white mt-4">{user?.fullName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{user?.username}</p>
            <span className="inline-block mt-3 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
              {t(`settings.roleLabels.${user?.role}`, { defaultValue: user?.role })}
            </span>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.08] overflow-hidden">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-left transition-colors border-l-2 ${tab === id ? 'text-emerald-400 bg-emerald-500/[0.06] border-emerald-500' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'}`}>
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={TAB_ICONS[id]} />
                </svg>
                {t(`settings.tabs.${id}`)}
              </button>
            ))}
          </div>
        </div>

        {/* ── O'ng panel: tanlangan bo'lim mazmuni ── */}
        <div className="min-w-0">
          {tab === 'profile' && (
            <Card title={t('settings.profile.title')} desc={t('settings.profile.desc')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                <Input label={t('settings.profile.fullNameLabel')} value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('settings.profile.fullNamePlaceholder')} />
                <Input label={t('settings.profile.usernameLabel')} value={user?.username || ''} disabled className="opacity-60" />
                <Input label={t('settings.profile.phoneLabel')} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998..." />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={saveProfile} disabled={savingProfile}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {savingProfile ? t('common.saving') : t('common.save')}
                </button>
                {profileMsg && <span className="text-sm text-emerald-400">{profileMsg}</span>}
              </div>
            </Card>
          )}

          {tab === 'password' && (
            <Card title={t('settings.password.title')} desc={t('settings.password.desc')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                <Input label={t('settings.password.oldLabel')} type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" />
                <div />
                <Input label={t('settings.password.newLabel')} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.password.newPlaceholder')} />
                <Input label={t('settings.password.confirmLabel')} type="password" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={savePassword} disabled={savingPassword}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {savingPassword ? t('common.saving') : t('settings.password.updateBtn')}
                </button>
                {passwordMsg && <span className={`text-sm ${passwordMsgOk ? 'text-emerald-400' : 'text-red-400'}`}>{passwordMsg}</span>}
              </div>
            </Card>
          )}

          {tab === 'school' && (
            <Card title={t('settings.school.title')} desc={canEditSchool ? t('settings.school.editDesc') : undefined}>
              {!user?.schoolId ? (
                <p className="text-sm text-slate-500">{t('settings.school.notAssigned')}</p>
              ) : schoolLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : school ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                      [t('settings.school.fields.name'), school.name],
                      [t('settings.school.fields.province'), school.provinceName || '—'],
                      [t('settings.school.fields.district'), school.districtName],
                      [t('settings.school.fields.director'), school.directorName || '—'],
                      [t('settings.school.fields.studentCount'), school.studentCount],
                      [t('settings.school.fields.classCount'), school.classCount],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.02] border border-emerald-500/[0.05]">
                        <span className="text-sm text-slate-500">{label}</span>
                        <span className="text-sm font-medium text-white">{val}</span>
                      </div>
                    ))}
                  </div>

                  {canEditSchool ? (
                    <>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('settings.school.contactSectionTitle')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                        <Input label={t('settings.school.fields.address')} value={schoolForm.address} onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))} placeholder={t('settings.school.addressPlaceholder')} />
                        <Input label={t('settings.school.fields.phone')} value={schoolForm.phone} onChange={e => setSchoolForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998..." />
                        <Input label={t('settings.school.fields.schoolNumber')} value={schoolForm.schoolNumber} onChange={e => setSchoolForm(f => ({ ...f, schoolNumber: e.target.value }))} placeholder="56" />
                        <Input label={t('settings.school.fields.foundedYear')} type="number" value={schoolForm.foundedYear} onChange={e => setSchoolForm(f => ({ ...f, foundedYear: e.target.value }))} placeholder="2005" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={saveSchoolProfile} disabled={savingSchool}
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                          {savingSchool ? t('common.saving') : t('common.save')}
                        </button>
                        {schoolMsg && <span className={`text-sm ${schoolMsgOk ? 'text-emerald-400' : 'text-red-400'}`}>{schoolMsg}</span>}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        [t('settings.school.fields.address'), school.address || '—'],
                        [t('settings.school.fields.phone'), school.phone || '—'],
                        [t('settings.school.fields.schoolNumber'), school.schoolNumber || '—'],
                        [t('settings.school.fields.foundedYear'), school.foundedYear || '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.02] border border-emerald-500/[0.05]">
                          <span className="text-sm text-slate-500">{label}</span>
                          <span className="text-sm font-medium text-white">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">{t('settings.school.loadError')}</p>
              )}
            </Card>
          )}

          {tab === 'notifications' && (
            <Card title={t('settings.notifications.title')} desc={t('settings.notifications.desc')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NOTIF_TYPES.map(nt => (
                  <div key={nt.value} className="flex items-center justify-between gap-3 py-3.5 px-4 rounded-xl bg-white/[0.02] border border-emerald-500/[0.05]">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 font-medium">{t(`settings.notifTypes.${nt.value}.label`)}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">{t(`settings.notifTypes.${nt.value}.desc`)}</p>
                    </div>
                    <Toggle checked={prefs.includes(nt.value)} onChange={() => togglePref(nt.value)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'cameras' && canManageCameras && (
            <>
              {canPickCameraSchool && (
                <Card>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.modal.schoolLabel')}</label>
                  <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors"
                    value={camSchoolId} onChange={e => setCamSchoolId(e.target.value)}>
                    <option value="">{t('common.selectDots')}</option>
                    {camSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Card>
              )}

              {!camSchoolId ? (
                <Card><p className="text-sm text-slate-500">{t('settings.school.notAssigned')}</p></Card>
              ) : (
                <>
                  {/* Xonalar */}
                  <Card title={t('cameras.rooms.title')}>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/[0.1] mb-5">
                      <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">{roomEditing ? t('cameras.rooms.editTitle') : t('cameras.rooms.addTitle')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Input label={t('cameras.rooms.numberLabel')} value={roomForm.number || ''} onChange={e => setRoomForm({ ...roomForm, number: e.target.value })} placeholder={t('cameras.rooms.numberPlaceholder')} />
                        <Input label={t('cameras.rooms.nameLabel')} value={roomForm.name || ''} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder={t('cameras.rooms.namePlaceholder')} />
                      </div>
                      <div className="flex gap-2">
                        {roomEditing && <button onClick={openRoomAdd} className="h-9 px-3 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>}
                        <button onClick={saveRoom} disabled={savingRoom} className="h-9 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors">
                          {savingRoom ? t('common.saving') : roomEditing ? t('common.save') : t('cameras.rooms.addBtn')}
                        </button>
                      </div>
                    </div>
                    {rooms.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-4">{t('cameras.rooms.empty')}</p>
                    ) : (
                      <div className="space-y-2">
                        {rooms.map(r => (
                          <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-bold shrink-0">{r.number}</span>
                              <p className="text-sm text-white truncate">{r.name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-slate-600">{t('cameras.rooms.cameraCount', { count: r.cameraCount || 0 })}</span>
                              <button onClick={() => openRoomEdit(r)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                              </button>
                              <button onClick={() => setDeleteRoomId(r.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Kameralar */}
                  <Card title={t('cameras.title')} desc={t('settings.cameras.desc')}>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-emerald-500/[0.1] mb-5">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">{camEditing ? t('cameras.modal.editTitle') : t('cameras.modal.newTitle')}</p>
                      <Input label={t('cameras.modal.nameLabel')} value={camForm.name || ''} onChange={e => setCamForm({ ...camForm, name: e.target.value })} placeholder={t('cameras.modal.namePlaceholder')} />
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.rooms.roomLabel')}</label>
                        <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors"
                          value={camForm.roomId || ''} onChange={e => setCamForm({ ...camForm, roomId: e.target.value })}>
                          <option value="">{t('cameras.rooms.noRoom')}</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.number} — {r.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                        <Input label={t('cameras.modal.ipLabel')} value={camForm.ipAddress || ''} onChange={e => setCamForm({ ...camForm, ipAddress: e.target.value })} placeholder={t('cameras.modal.ipPlaceholder')} />
                        <Input label={t('cameras.modal.resolutionLabel')} value={camForm.resolution || ''} onChange={e => setCamForm({ ...camForm, resolution: e.target.value })} placeholder={t('cameras.modal.resolutionPlaceholder')} />
                      </div>
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.modal.statusLabel')}</label>
                        <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors"
                          value={camForm.status || 'OFFLINE'} onChange={e => setCamForm({ ...camForm, status: e.target.value })}>
                          <option value="ONLINE">{t('cameras.status.ONLINE')}</option>
                          <option value="OFFLINE">{t('cameras.status.OFFLINE')}</option>
                          <option value="MAINTENANCE">{t('cameras.status.MAINTENANCE')}</option>
                        </select>
                      </div>
                      <Input label={t('cameras.modal.notesLabel')} value={camForm.notes || ''} onChange={e => setCamForm({ ...camForm, notes: e.target.value })} placeholder={t('common.optional')} />
                      {/* Masofadan boshqarish (ixtiyoriy) — brend+IP+login kiritilsa holat avtomatik kuzatiladi va snapshot ko'rinadi */}
                      <div className="mb-4 rounded-xl border border-cyan-500/[0.12] bg-cyan-500/[0.03] p-3">
                        <p className="text-[11px] font-semibold text-cyan-300">{t('cameras.device.sectionTitle')}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 mb-3">{t('cameras.device.sectionHint')}</p>
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('cameras.device.brand')}</label>
                          <select className="mt-1.5 w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors"
                            value={camForm.brand || ''} onChange={e => setCamForm({ ...camForm, brand: e.target.value })}>
                            <option value="">{t('cameras.device.brandNone')}</option>
                            <option value="Hikvision">Hikvision</option>
                          </select>
                        </div>
                        {camForm.brand && <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                            <Input label={t('cameras.device.port')} value={camForm.port ?? ''} onChange={e => setCamForm({ ...camForm, port: e.target.value })} placeholder="80" inputMode="numeric" />
                            <Input label={t('cameras.device.rtspPort')} value={camForm.rtspPort ?? ''} onChange={e => setCamForm({ ...camForm, rtspPort: e.target.value })} placeholder="554" inputMode="numeric" />
                            <Input label={t('cameras.device.channel')} value={camForm.streamChannel || ''} onChange={e => setCamForm({ ...camForm, streamChannel: e.target.value })} placeholder="101" inputMode="numeric" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                            <Input label={t('cameras.device.username')} value={camForm.deviceUsername || ''} onChange={e => setCamForm({ ...camForm, deviceUsername: e.target.value })} autoComplete="off" />
                            <Input label={t('cameras.device.password')} type="password" value={camForm.devicePassword || ''} onChange={e => setCamForm({ ...camForm, devicePassword: e.target.value })} autoComplete="new-password"
                              placeholder={camEditing?.hasDevicePassword ? t('cameras.device.passwordKeep') : ''} />
                          </div>
                          {/* Har qanday Hikvision kamera ulanadi (masofadan boshqarish/snapshot uchun) — lekin
                              faqat shu belgi yoqilgan kameralar "odam qayerda" (yuz tanish) oqimiga qo'shiladi,
                              chunki eski/oddiy modellarda bu funksiya qurilmaning o'zida yo'q. */}
                          <label className="flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                            <input type="checkbox" checked={!!camForm.supportsFaceRecognition}
                              onChange={e => setCamForm({ ...camForm, supportsFaceRecognition: e.target.checked })}
                              className="w-4 h-4 rounded accent-cyan-500" />
                            <span className="text-xs text-slate-300">{t('cameras.device.supportsFaceRecognition')}</span>
                          </label>
                          <p className="text-[10px] text-slate-500 mt-1">{t('cameras.device.supportsFaceRecognitionHint')}</p>
                        </>}
                      </div>
                      <div className="flex gap-2">
                        {camEditing && <button onClick={openCamAdd} className="h-9 px-3 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>}
                        <button onClick={saveCam} disabled={savingCam} className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors">
                          {savingCam ? t('common.saving') : camEditing ? t('common.save') : t('cameras.addBtn')}
                        </button>
                      </div>
                    </div>
                    {cams.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-4">{t('cameras.empty.noneAdded')}</p>
                    ) : (
                      <div className="space-y-2">
                        {cams.map(c => (
                          <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-600 truncate">
                                {c.roomId ? `${c.roomNumber} — ${c.roomName}` : t('cameras.rooms.noRoom')} · <span className="font-mono">{c.ipAddress || '—'}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => openCamEdit(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                              </button>
                              <button onClick={() => setDeleteCamId(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}

              <ConfirmModal open={!!deleteRoomId} onCancel={() => setDeleteRoomId(null)} onConfirm={() => removeRoom(deleteRoomId)} title={t('cameras.rooms.deleteConfirm.title')} message={t('cameras.rooms.deleteConfirm.message')} />
              <ConfirmModal open={!!deleteCamId} onCancel={() => setDeleteCamId(null)} onConfirm={() => removeCam(deleteCamId)} title={t('cameras.deleteConfirm.title')} message={t('cameras.deleteConfirm.message')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
