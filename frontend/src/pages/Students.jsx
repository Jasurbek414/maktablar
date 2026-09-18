import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';
import ConfirmModal from '../components/ConfirmModal';
import NotesHistory from '../components/NotesHistory';
import GuardianSection from '../components/GuardianSection';
import { computeAttendanceStats, attendanceSummaryKey } from '../utils/attendanceStats';

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

function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <svg className="w-3 h-3 text-slate-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
          <span className={i === items.length - 1 ? 'text-emerald-400 font-medium' : 'text-slate-600'}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="p-2 rounded-xl border border-emerald-500/[0.1] text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-colors shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
    </button>
  );
}

function NavCard({ icon, title, subtitle, color = 'emerald', onClick, stats }) {
  const colors = { emerald: 'from-emerald-500/20 to-cyan-500/10 text-emerald-400', teal: 'from-teal-500/20 to-emerald-500/10 text-teal-400', cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400' };
  const glows = { emerald: 'from-emerald-500/[0.04]', teal: 'from-teal-500/[0.04]', cyan: 'from-cyan-500/[0.04]' };
  const hoverColor = { emerald: 'text-emerald-300', teal: 'text-teal-300', cyan: 'text-cyan-300' };
  return (
    <button onClick={onClick} className="group text-left w-full rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${glows[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/[0.05] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="relative p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold text-white group-hover:${hoverColor[color]} transition-colors truncate`}>{title}</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>
          </div>
          <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </div>
        {stats && <div className="grid grid-cols-2 gap-1.5">
          {stats.map((s, i) => <div key={i} className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg ${s.bg}`}>
            <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
            <span className="text-[7px] text-slate-600">{s.label}</span>
          </div>)}
        </div>}
      </div>
    </button>
  );
}

function StudentCard({ s, onEdit, onDelete, t }) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {s.photoUrl ? (
              <img src={s.photoUrl} alt={s.fullName} className="w-11 h-11 rounded-full object-cover shrink-0 border border-emerald-500/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                {s.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{s.fullName}</h3>
              <p className="text-[10px] text-slate-600 mt-0.5">{s.birthDate || t('students.card.birthDatePlaceholder')}</p>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="py-1.5 px-3 rounded-lg bg-emerald-500/[0.05] text-center">
            <p className="text-xs font-bold text-emerald-400">{calcAge(s.birthDate) ?? '—'}</p>
            <p className="text-[8px] text-slate-600 uppercase">{t('students.card.age')}</p>
          </div>
          <div className="py-1.5 px-3 rounded-lg bg-cyan-500/[0.05] text-center">
            <p className="text-xs font-bold text-cyan-400 truncate">{s.className || s.schoolName || '—'}</p>
            <p className="text-[8px] text-slate-600 uppercase">{s.className ? t('students.profile.fields.class') : t('stats.schools')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader = () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
const ICONS = { prov: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21', dist: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z', school: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21', cls: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' };
const CLASS_COLORS = ['','bg-red-500/10 text-red-400','bg-orange-500/10 text-orange-400','bg-amber-500/10 text-amber-400','bg-yellow-500/10 text-yellow-400','bg-lime-500/10 text-lime-400','bg-emerald-500/10 text-emerald-400','bg-teal-500/10 text-teal-400','bg-cyan-500/10 text-cyan-400','bg-blue-500/10 text-blue-400','bg-indigo-500/10 text-indigo-400','bg-violet-500/10 text-violet-400'];

export default function Students({ user }) {
  const { t } = useTranslation();
  const [provinces, setProvinces] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selProv, setSelProv] = useState(null);
  const [selDist, setSelDist] = useState(null);
  const [selSchool, setSelSchool] = useState(null);
  const [selClass, setSelClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [view, setView] = useState('card');
  const [profile, setProfile] = useState(null);
  const [profileAttendance, setProfileAttendance] = useState(null);
  const [profileAttendanceEvents, setProfileAttendanceEvents] = useState([]);
  const [profileAttendanceLoading, setProfileAttendanceLoading] = useState(false);
  const [profileLocation, setProfileLocation] = useState(null);
  const [profileLocationLoading, setProfileLocationLoading] = useState(false);
  const [pushingFace, setPushingFace] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [classModal, setClassModal] = useState(null); // 'add' | 'edit' | null
  const [classForm, setClassForm] = useState({});
  const [deleteClassId, setDeleteClassId] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const isAdmin = user?.role === 'ADMIN';
  const isDirector = user?.role === 'DIRECTOR';

  useEffect(() => {
    Promise.all([api.get('/api/provinces'), api.get('/api/districts')]).then(([p, d]) => {
      setProvinces(p); setAllDistricts(d);
      if (isDirector && user?.schoolId) { loadSchoolDirect(); return; }
      if (isAdmin && user?.provinceId) { const my = p.find(x => x.id === user.provinceId); if (my) { pickProv(my, d); return; } }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.id) { setProfileAttendance(null); setProfileAttendanceEvents([]); return; }
    setProfileAttendanceLoading(true);
    api.get(`/api/attendance/student/${profile.id}`)
      .then(events => {
        setProfileAttendance(computeAttendanceStats(events, 30));
        setProfileAttendanceEvents([...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      })
      .catch(() => { setProfileAttendance(null); setProfileAttendanceEvents([]); })
      .finally(() => setProfileAttendanceLoading(false));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || user?.role === 'TEACHER') { setProfileLocation(null); return; }
    setProfileLocationLoading(true);
    api.get(`/api/persons/student/${profile.id}/location`)
      .then(setProfileLocation)
      .catch(() => setProfileLocation(null))
      .finally(() => setProfileLocationLoading(false));
  }, [profile?.id, user?.role]);

  const loadSchoolDirect = async () => {
    try {
      const s = await api.get(`/api/schools/${user.schoolId}`);
      setSelSchool(s);
      const [cls, tchs] = await Promise.all([api.get(`/api/classes?schoolId=${user.schoolId}`), api.get(`/api/users?role=TEACHER&schoolId=${user.schoolId}`)]);
      setClasses(cls); setTeachers(tchs);
    } catch {}
    setLoading(false);
  };

  const pickProv = (p, dists) => { setSelProv(p); setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); setDistricts((dists || allDistricts).filter(d => d.provinceId == p.id)); setLoading(false); };
  const pickDist = async (d) => { setSelDist(d); setSelSchool(null); setSelClass(null); setLoading(true); setSearch(''); try { setSchools(await api.get(`/api/schools?districtId=${d.id}`)); } catch {} setLoading(false); };
  const pickSchool = async (s) => { setSelSchool(s); setSelClass(null); setLoading(true); setSearch(''); try { const [cls, tchs] = await Promise.all([api.get(`/api/classes?schoolId=${s.id}`), api.get(`/api/users?role=TEACHER&schoolId=${s.id}`)]); setClasses(cls); setTeachers(tchs); } catch {} setLoading(false); };
  // MUHIM (2026-09-18 audit, 2026-09-17 jonli tasdiqlangan): avval o'quvchilar FAQAT sinf
  // ichida (classId bo'yicha) yuklanardi — "sinfsiz" (classId=null, masalan boshqa maktabdan
  // ko'chirilgan) o'quvchi hech qaysi sinf ichida ko'rinmasdi, garchi maktab kartasidagi
  // "jami o'quvchilar" soni to'g'ri hisoblansa ham ("jami 3 ta, ro'yxatda 1 ta" holati).
  // c.id === null bo'lsa "Sinfga biriktirilmagan" psevdo-sinf — schoolId bo'yicha yuklab,
  // classId bo'sh bo'lganlarni mijoz tomonida filtrlaydi.
  const pickClass = async (c) => {
    setSelClass(c); setLoading(true); setSearch('');
    try {
      if (c.id == null) {
        const schoolId = selSchool?.id || user?.schoolId;
        const all = await api.get(`/api/students?schoolId=${schoolId}`);
        setStudents(all.filter(s => s.classId == null));
      } else {
        setStudents(await api.get(`/api/students?classId=${c.id}`));
      }
    } catch {}
    setLoading(false);
  };

  const goProvs = () => { setSelProv(null); setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); };
  const goDists = () => { setSelDist(null); setSelSchool(null); setSelClass(null); setSearch(''); };
  const goSchools = () => { setSelSchool(null); setSelClass(null); setSearch(''); };
  const goClasses = () => { setSelClass(null); setSearch(''); };

  const openAdd = () => { setEditing(null); setForm({ schoolId: selSchool?.id, classId: selClass?.id }); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setModal(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/api/students/${editing.id}`, form);
      else await api.post('/api/students', form);
      setModal(false); if (selClass) await pickClass(selClass); else if (selSchool) await pickSchool(selSchool);
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => {
    try { await api.del(`/api/students/${id}`); setDeleteId(null); if (selClass) await pickClass(selClass); else if (selSchool) await pickSchool(selSchool); } catch (e) { alert(e.message); }
  };

  /* ── Excel orqali ko'plab o'quvchi qo'shish ── */
  const openImport = () => { setImportFile(null); setImportResult(null); setImportModal(true); };
  const downloadTemplate = async () => {
    try {
      const blob = await api.getBlob('/api/students/import-template');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'oquvchilar_shablon.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
  };
  const doImport = async () => {
    if (!importFile) { alert(t('students.import.noFileSelected')); return; }
    setImporting(true); setImportResult(null);
    try {
      const schoolId = selSchool?.id || user?.schoolId;
      const res = await api.importStudents(importFile, schoolId, selClass?.id ?? null);
      setImportResult(res);
      if (selClass) await pickClass(selClass); else if (selSchool) await pickSchool(selSchool);
    } catch (e) { alert(e.message); }
    setImporting(false);
  };

  // O'quvchining rasmini uning maktabidagi Face ID terminallariga yuboradi — /api/v1/students
  // ostidagi mavjud backend endpointini ishlatadi (V1StudentController#pushFace), asosiy sayt
  // (DIRECTOR/MUDIR) uchun alohida shu funksiyaga tugma yo'q edi.
  const pushFace = async (studentId) => {
    setPushingFace(true); setPushResult(null);
    try {
      const res = await api.post(`/api/v1/students/${studentId}/push-face/`, {});
      setPushResult({ ok: true, text: res.message || t('students.profile.pushSuccess') });
    } catch (e) { setPushResult({ ok: false, text: e.message || t('students.profile.pushFailed') }); }
    setPushingFace(false);
  };

  /* ── Class CRUD ── */
  const saveClass = async () => {
    try {
      const data = { ...classForm, name: classForm.name || `${classForm.grade}-${classForm.section}` };
      if (classModal === 'edit') await api.put(`/api/classes/${classForm.id}`, data);
      else await api.post('/api/classes', data);
      setClassModal(null);
      if (selSchool) { setClasses(await api.get(`/api/classes?schoolId=${selSchool.id}`)); }
    } catch (e) { alert(e.message); }
  };
  const removeClass = async (id) => {
    try { await api.del(`/api/classes/${id}`); setDeleteClassId(null);
      if (selSchool) { setClasses(await api.get(`/api/classes?schoolId=${selSchool.id}`)); }
    } catch (e) { alert(e.message); }
  };
  useEffect(() => { if (classForm.grade && classForm.section) setClassForm(f => ({...f, name: `${f.grade}-${f.section}`})); }, [classForm.grade, classForm.section]);

  const selectCls = "w-full h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors";
  const inputCls2 = "w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors";
  const renderClassModal = () => classModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setClassModal(null)}>
      <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-5">{classModal === 'edit' ? t('students.classModal.editTitle') : t('students.classModal.newTitle')}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="text-xs font-semibold text-slate-400 uppercase">{t('students.classModal.gradeLabel')}</label>
            <select className={selectCls + ' mt-1.5'} value={classForm.grade||''} onChange={e => setClassForm({...classForm, grade: e.target.value})}><option value="">{t('common.select')}</option>{[1,2,3,4,5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{t('classes.modal.gradeOption', { grade: g })}</option>)}</select>
          </div>
          <div><label className="text-xs font-semibold text-slate-400 uppercase">{t('students.classModal.sectionLabel')}</label>
            <select className={selectCls + ' mt-1.5'} value={classForm.section||''} onChange={e => setClassForm({...classForm, section: e.target.value})}><option value="">{t('common.select')}</option>{['A','B','C','D','E','F','G','H'].map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        </div>
        <div className="mb-4"><label className="text-xs font-semibold text-slate-400 uppercase">{t('students.classModal.nameLabel')}</label>
          <input className={inputCls2 + ' mt-1.5'} value={classForm.name||''} onChange={e => setClassForm({...classForm, name: e.target.value})} placeholder={t('students.classModal.namePlaceholder')} />
        </div>
        <div className="mb-4"><label className="text-xs font-semibold text-slate-400 uppercase">{t('students.classModal.teacherLabel')}</label>
          <select className={selectCls + ' mt-1.5'} value={classForm.teacherId||''} onChange={e => setClassForm({...classForm, teacherId: e.target.value ? Number(e.target.value) : null})}>
            <option value="">{t('students.classModal.teacherNotSelected')}</option>
            {teachers.map(t2 => <option key={t2.id} value={t2.id}>{t2.fullName}</option>)}
          </select>
          {!teachers.length && <p className="text-[10px] text-slate-500 mt-1">{t('students.classModal.noTeachersHint')}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setClassModal(null)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>
          <button onClick={saveClass} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">{t('common.save')}</button>
        </div>
      </div>
    </div>
  );

  const filtered = students.filter(s => s.fullName?.toLowerCase().includes(search.toLowerCase()));

  /* 1. Viloyat */
  if (!selProv && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-xl font-bold text-white">{t('students.title')}</h1><p className="text-sm text-slate-500 mt-0.5">{t('students.selectProvinceSubtitle')}</p></div>
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
        {provinces.map(p => <NavCard key={p.id} icon={ICONS.prov} title={p.name} subtitle={t('schools.studentsSuffix', { count: p.studentCount||0 })} onClick={() => pickProv(p)} stats={[{value:p.districtCount,label:t('stats.districts'),color:'text-emerald-400',bg:'bg-emerald-500/[0.06]'},{value:p.schoolCount||0,label:t('stats.schools'),color:'text-cyan-400',bg:'bg-cyan-500/[0.06]'}]} />)}
      </div>}
    </div>);
  }

  /* 2. Tuman */
  if (!selDist && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">{!isAdmin && <BackBtn onClick={goProvs} />}<div><h1 className="text-xl font-bold text-white">{selProv.name}</h1><Breadcrumb items={[t('students.title'), selProv.name]} /></div></div>
      {loading ? <Loader /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-3">
        {districts.map(d => <NavCard key={d.id} icon={ICONS.dist} color="teal" title={d.name} subtitle={t('schools.studentsSuffix', { count: d.studentCount||0 })} onClick={() => pickDist(d)} stats={[{value:d.schoolCount||0,label:t('stats.schools'),color:'text-teal-400',bg:'bg-teal-500/[0.06]'},{value:d.studentCount||0,label:t('stats.students'),color:'text-amber-400',bg:'bg-amber-500/[0.06]'}]} />)}
        {!districts.length && <p className="col-span-full text-center text-slate-600 py-12">{t('students.districtNotFound')}</p>}
      </div>}
    </div>);
  }

  /* 3. Maktab */
  if (!selSchool && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6"><BackBtn onClick={goDists} /><div><h1 className="text-xl font-bold text-white">{selDist.name}</h1><Breadcrumb items={[t('students.title'), selProv.name, selDist.name]} /></div></div>
      {loading ? <Loader /> : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'0.75rem'}}>
        {schools.map(s => (
          <div key={s.id} className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden cursor-pointer" onClick={() => pickSchool(s)}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={ICONS.school} /></svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">{s.name}</h3>
                    <p className="text-[10px] text-slate-600 mt-0.5">{s.directorName ? t('students.school.directorPrefix', { name: s.directorName }) : s.districtName}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-700 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-cyan-500/[0.06]">
                  <svg className="w-3 h-3 text-cyan-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                  <div><p className="text-xs font-bold text-cyan-400">{s.classCount||0}</p><p className="text-[7px] text-slate-600 leading-tight">{t('students.school.classLabel')}</p></div>
                </div>
                <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/[0.06]">
                  <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  <div><p className="text-xs font-bold text-amber-400">{s.studentCount||0}</p><p className="text-[7px] text-slate-600 leading-tight">{t('stats.students')}</p></div>
                </div>
                <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-500/[0.06]">
                  <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div><p className="text-xs font-bold text-emerald-400">0%</p><p className="text-[7px] text-slate-600 leading-tight">{t('sidebar.attendance')}</p></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!schools.length && <p className="col-span-full text-center text-slate-600 py-12">{t('students.schoolNotFound')}</p>}
      </div>}
    </div>);
  }

  /* ── Class Card Component ── */
  const ClassCard = ({ c, onClick }) => (
    <div className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/25 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4 cursor-pointer" onClick={() => onClick(c)}>
        <div className="flex items-center justify-between mb-3">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${CLASS_COLORS[c.grade]||'bg-slate-500/10 text-slate-400'}`}>{c.name}</div>
          <div className="flex items-center gap-1">
            <button onClick={e => { e.stopPropagation(); setClassForm({id:c.id,name:c.name,grade:c.grade,section:c.section,schoolId:c.schoolId,teacherId:c.teacherId}); setClassModal('edit'); }} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
            <button onClick={e => { e.stopPropagation(); setDeleteClassId(c.id); }} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg></button>
            <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 transition-colors ml-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-amber-500/[0.06]">
            <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            <div><p className="text-xs font-bold text-amber-400">{c.studentCount||0}</p><p className="text-[7px] text-slate-600">{t('stats.students')}</p></div>
          </div>
          <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-500/[0.06]">
            <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div><p className="text-xs font-bold text-emerald-400">0%</p><p className="text-[7px] text-slate-600">{t('sidebar.attendance')}</p></div>
          </div>
        </div>
        {c.teacherName && <div className="flex items-center gap-1.5 mb-1.5 py-1 px-2 rounded-lg bg-violet-500/[0.06]"><svg className="w-3 h-3 text-violet-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg><span className="text-[9px] text-violet-300 truncate">{c.teacherName}</span></div>}
        {!c.teacherName && <div className="flex items-center gap-1.5 mb-1.5 py-1 px-2 rounded-lg bg-slate-500/[0.04]"><svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg><span className="text-[9px] text-slate-600">{t('students.class.noTeacher')}</span></div>}
        {c.grade && <div className="flex items-center justify-between"><span className="text-[9px] text-slate-600">{t('students.class.gradeSection', { grade: c.grade, section: c.section })}</span><span className="relative flex h-1.5 w-1.5"><span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span></div>}
      </div>
    </div>
  );

  /* 4. Sinf tanlash */
  if (!selClass && !isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><BackBtn onClick={goSchools} /><div><h1 className="text-xl font-bold text-white">{selSchool?.name}</h1><Breadcrumb items={[t('students.title'), selProv?.name, selDist?.name, selSchool?.name].filter(Boolean)} /></div></div>
        <button onClick={() => { setClassForm({schoolId:selSchool?.id,grade:'',section:'',name:''}); setClassModal('add'); }} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>{t('students.addClassBtn')}
        </button>
      </div>
      {loading ? <Loader /> : classes.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
          {classes.map(c => <ClassCard key={c.id} c={c} onClick={pickClass} />)}
        </div>
      ) : (<div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-12 text-center"><p className="text-slate-600 text-sm">{t('students.noClasses')}</p><button onClick={() => { setClassForm({schoolId:selSchool?.id,grade:'',section:'',name:''}); setClassModal('add'); }} className="mt-3 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">+ {t('students.addClassBtn')}</button></div>)}
      {!loading && (
        <button onClick={() => pickClass({ id: null, name: t('students.unassignedClass') })} className="mt-3 w-full text-left px-4 py-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 hover:border-amber-500/30 transition-colors text-[13px] text-amber-300">
          {t('students.unassignedClassHint')}
        </button>
      )}
      {renderClassModal()}
      <ConfirmModal open={!!deleteClassId} onCancel={() => setDeleteClassId(null)} onConfirm={() => removeClass(deleteClassId)} />
    </div>);
  }

  /* Director uchun sinf tanlash */
  if (!selClass && isDirector) {
    return (<div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-white">{selSchool?.name || t('students.title')}</h1><p className="text-sm text-slate-500">{t('students.selectClassSubtitle')}</p></div>
        <button onClick={() => { setClassForm({schoolId:selSchool?.id||user?.schoolId,grade:'',section:'',name:''}); setClassModal('add'); }} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>{t('students.addClassBtn')}
        </button>
      </div>
      {loading ? <Loader /> : classes.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'0.75rem'}}>
          {classes.map(c => <ClassCard key={c.id} c={c} onClick={pickClass} />)}
        </div>
      ) : (<div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] py-12 text-center"><p className="text-slate-600 text-sm">{t('students.noClasses')}</p><button onClick={() => { setClassForm({schoolId:selSchool?.id||user?.schoolId,grade:'',section:'',name:''}); setClassModal('add'); }} className="mt-3 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">+ {t('students.addClassBtn')}</button></div>)}
      {!loading && (
        <button onClick={() => pickClass({ id: null, name: t('students.unassignedClass') })} className="mt-3 w-full text-left px-4 py-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 hover:border-amber-500/30 transition-colors text-[13px] text-amber-300">
          {t('students.unassignedClassHint')}
        </button>
      )}
      {renderClassModal()}
      <ConfirmModal open={!!deleteClassId} onCancel={() => setDeleteClassId(null)} onConfirm={() => removeClass(deleteClassId)} />
    </div>);
  }

  /* 5. O'quvchilar */
  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <BackBtn onClick={goClasses} />
          <div>
            <h1 className="text-xl font-bold text-white">{selClass?.name} — {selSchool?.name || t('stats.schools')}</h1>
            <Breadcrumb items={isDirector ? [t('students.title'), selSchool?.name, selClass?.name] : [t('students.title'), selProv?.name, selDist?.name, selSchool?.name, selClass?.name].filter(Boolean)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-emerald-500/[0.1] overflow-hidden">
            <button onClick={() => setView('card')} className={`px-3 py-1.5 text-xs transition-colors ${view==='card' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-xs transition-colors ${view==='table' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>
            </button>
          </div>
          <span className="text-sm text-slate-500">{t('students.count', { count: filtered.length })}</span>
          <button onClick={openImport} className="h-10 px-4 rounded-xl border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {t('students.importBtn')}
          </button>
          <button onClick={openAdd} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {t('common.add')}
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('students.searchPlaceholder')}
          className="w-full max-w-xs h-10 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.08] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      {loading ? <Loader /> : view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
          {filtered.map(s => <div key={s.id} onClick={() => { setProfile(s); setPushResult(null); }} className="cursor-pointer"><StudentCard s={s} onEdit={openEdit} onDelete={setDeleteId} t={t} /></div>)}
          {!filtered.length && <p className="col-span-full text-center text-slate-600 py-12">{t('students.notFound')}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/[0.08] bg-[#0d1a14] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-emerald-500/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('common.number')}</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('students.table.photo')}</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('users.table.fullName')}</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('students.table.faceId')}</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('students.table.school')}</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('students.table.age')}</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('common.actions')}</th>
            </tr></thead>
            <tbody>{filtered.map((s, i) => (
              <tr key={s.id} onClick={() => { setProfile(s); setPushResult(null); }} className="border-b border-emerald-500/[0.04] hover:bg-emerald-500/[0.03] transition-colors cursor-pointer">
                <td className="px-5 py-3 text-slate-600">{i+1}</td>
                <td className="px-5 py-2">{s.photoUrl ? <img src={s.photoUrl} className="w-8 h-8 rounded-full object-cover border border-emerald-500/20" /> : <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">{s.fullName?.charAt(0)}</div>}</td>
                <td className="px-5 py-3 text-white font-medium">{s.fullName}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs font-mono">{s.faceId}</span></td>
                <td className="px-5 py-3 text-slate-400 text-xs">{s.schoolName}</td>
                <td className="px-5 py-3 text-center"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">{calcAge(s.birthDate) ?? '—'}</span></td>
                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mr-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Student Profile Panel */}
      {profile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setProfile(null)}>
          <div className="w-full max-w-lg bg-[#0a120e] border-l border-emerald-500/[0.1] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="h-32 bg-gradient-to-br from-emerald-900/40 to-teal-900/20" />
              <button onClick={() => setProfile(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute -bottom-12 left-6">
                {profile.photoUrl ? <img src={profile.photoUrl} className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0a120e] shadow-xl" /> : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border-4 border-[#0a120e] flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-xl">{profile.fullName?.charAt(0)}</div>}
              </div>
            </div>
            <div className="px-6 pt-16 pb-6">
              <h2 className="text-xl font-bold text-white">{profile.fullName}</h2>
              <p className="text-sm text-slate-500 mt-1">{selSchool?.name || profile.schoolName}</p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  {l:t('students.profile.fields.birthDate'),v:profile.birthDate || '—',c:'text-white'},
                  {l:t('students.profile.fields.class'),v:profile.className || selClass?.name || '—',c:'text-amber-400 font-semibold'},
                  {l:t('students.profile.fields.faceId'),v:profile.faceId,c:'text-emerald-400 font-mono text-xs'},
                  {l:t('students.profile.fields.idNumber'),v:`#${profile.id}`,c:'text-cyan-400 font-mono'},
                  {l:t('students.profile.fields.school'),v:profile.schoolName,c:'text-white'},
                  {l:t('students.profile.fields.status'),v:t('students.profile.fields.statusActive'),c:'text-emerald-400',dot:true},
                ].map((x,i) => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-emerald-500/[0.06] p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">{x.l}</p>
                    <div className="flex items-center gap-1.5 mt-1">{x.dot && <span className={`w-2 h-2 rounded-full ${x.c.includes('emerald')?'bg-emerald-400':'bg-slate-600'}`} />}<p className={`text-sm ${x.c}`}>{x.v}</p></div>
                  </div>
                ))}
              </div>

              {/* Kamera-Reja (2026-09-18): faqat DIRECTOR/MUDIR/admin ko'radi — backend TEACHER'ni
                  403 bilan rad etadi, shu sabab client ham TEACHER uchun so'rovni umuman yubormaydi. */}
              {user?.role !== 'TEACHER' && (
                <div className="mt-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/15 p-3">
                  <p className="text-[10px] text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {t('students.profile.location.title')}
                  </p>
                  {profileLocationLoading ? (
                    <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : profileLocation?.seen ? (
                    <>
                      <p className="text-sm text-white mt-1.5">{profileLocation.roomName ? `${profileLocation.roomNumber} — ${profileLocation.roomName}` : t('students.profile.location.unknownRoom')}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t('students.profile.location.seenAt', { time: new Date(profileLocation.seenAt).toLocaleString(), device: profileLocation.deviceName || '—' })}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1.5">{t('students.profile.location.neverSeen')}</p>
                  )}
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>{t('students.profile.attendanceStatsTitle')}</h3>
                {profileAttendanceLoading ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {v:String(profileAttendance?.presentDays ?? 0),l:t('students.profile.stats.present'),c:'text-emerald-400',bg:'bg-emerald-500/[0.06]'},
                        {v:String(profileAttendance?.absentDays ?? 0),l:t('students.profile.stats.absent'),c:'text-red-400',bg:'bg-red-500/[0.06]'},
                        {v:`${profileAttendance?.percent ?? 0}%`,l:t('students.profile.stats.percent'),c:'text-amber-400',bg:'bg-amber-500/[0.06]'}
                      ].map((x,i) => (
                        <div key={i} className={`rounded-xl ${x.bg} p-3 text-center`}><p className={`text-lg font-bold ${x.c}`}>{x.v}</p><p className="text-[9px] text-slate-600 uppercase">{x.l}</p></div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">{t('students.profile.stats.periodNote', { days: profileAttendance?.periodDays ?? 30 })}</p>
                    {profileAttendance && (
                      <div className="mt-3 py-2.5 px-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10">
                        <p className="text-xs text-emerald-300">{t(`students.profile.aiSummary.${attendanceSummaryKey(profileAttendance)}`, { percent: profileAttendance.percent, days: profileAttendance.presentDays })}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Davomat tarixi — so'nggi haqiqiy IN/OUT hodisalari (ro'yxat, sana bilan) */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t('students.profile.timelineTitle')}
                </h3>
                {profileAttendanceLoading ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : profileAttendanceEvents.length === 0 ? (
                  <p className="text-xs text-slate-600 py-2">{t('students.profile.timelineEmpty')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {profileAttendanceEvents.slice(0, 30).map(ev => {
                      const d = new Date(ev.timestamp);
                      const isIn = ev.type === 'IN';
                      return (
                        <div key={ev.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isIn ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${isIn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                            {isIn ? t('students.profile.eventIn') : t('students.profile.eventOut')}
                          </span>
                          <span className="text-xs text-slate-300">{d.toLocaleDateString()}</span>
                          <span className="text-xs text-slate-600">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <GuardianSection studentId={profile.id} canManage={true} />
              <NotesHistory personType="STUDENT" personId={profile.id} />

              <button onClick={() => pushFace(profile.id)} disabled={!profile.photoUrl || pushingFace}
                className="w-full mt-8 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                title={!profile.photoUrl ? t('students.profile.pushNoPhoto') : ''}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                {pushingFace ? t('students.profile.pushingFace') : t('students.profile.pushFaceBtn')}
              </button>
              {pushResult && <p className={`text-xs mt-2 ${pushResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{pushResult.text}</p>}

              <div className="flex gap-3 mt-3">
                <button onClick={() => { setProfile(null); openEdit(profile); }} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>{t('common.edit')}
                </button>
                <button onClick={() => { setProfile(null); setDeleteId(profile.id); }} className="h-10 px-5 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>{t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('common.edit') : t('students.modal.newTitle')}>
        <Input label={t('students.modal.fullNameLabel')} value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder={t('students.modal.fullNamePlaceholder')} />
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('students.modal.birthDateLabel')}</label>
          <input type="date" value={form.birthDate || ''} onChange={e => setForm({ ...form, birthDate: e.target.value })}
            className="mt-1.5 w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40 transition-colors [color-scheme:dark]" />
        </div>
        {/* Photo Upload */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('students.modal.photoLabel')}</label>
          {form.photoUrl ? (
            <div className="mt-1.5 relative group">
              <img src={form.photoUrl} className="w-full h-40 object-cover rounded-xl border border-emerald-500/20" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <label className={`mt-1.5 flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed bg-white/[0.02] transition-colors ${photoUploading ? 'border-emerald-500/40 cursor-wait' : 'border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer'}`}>
              {photoUploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-emerald-400">{t('students.modal.photoUploading')}</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-emerald-500/40 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  <span className="text-xs text-slate-500">{t('students.modal.photoDropzone')}</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">{t('students.modal.photoHint')}</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={photoUploading} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhotoUploading(true);
                try {
                  const res = await api.upload(file);
                  setForm(f => ({ ...f, photoUrl: res.url }));
                } catch (err) { alert(t('students.modal.photoUploadFailed', { message: err.message })); }
                setPhotoUploading(false);
              }} />
            </label>
          )}
        </div>
        {editing && (
          <div className="mt-2 py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase">{t('students.modal.faceIdAutoLabel')}</p>
            <p className="text-sm font-mono text-emerald-400 mt-0.5">{form.faceId}</p>
          </div>
        )}
        {!editing && (
          <div className="mt-2 py-2 px-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10">
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {t('students.modal.faceIdAutoNotice')}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{t('students.modal.faceIdAutoDesc')}</p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">{t('common.cancel')}</button>
          <button onClick={save} disabled={photoUploading} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">{photoUploading ? t('students.modal.photoUploading') : t('common.save')}</button>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => remove(deleteId)} />

      <Modal open={importModal} onClose={() => { if (!importing) setImportModal(false); }} title={t('students.import.title')}>
        <p className="text-xs text-slate-500 mb-2">{t('students.import.desc')}</p>
        <p className="text-[11px] text-slate-500 mb-4">{t('students.import.photoHint')}</p>
        <button onClick={downloadTemplate} className="w-full mb-4 h-10 rounded-xl border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          {t('students.import.downloadTemplate')}
        </button>
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('students.import.fileLabel')}</label>
          <label className={`mt-1.5 flex items-center justify-center w-full h-11 px-4 rounded-xl border-2 border-dashed bg-white/[0.02] transition-colors text-sm ${importing ? 'border-emerald-500/40 cursor-wait text-slate-500' : 'border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer text-slate-400'}`}>
            {importFile ? importFile.name : t('students.import.filePlaceholder')}
            <input type="file" accept=".xlsx" className="hidden" disabled={importing}
              onChange={e => setImportFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        {selClass?.id && (
          <p className="text-[11px] text-amber-300/80 mb-4">{t('students.import.targetClassNote', { className: selClass.name })}</p>
        )}
        {importResult && (
          <div className="mb-4 rounded-xl bg-white/[0.03] border border-emerald-500/10 p-3 max-h-56 overflow-y-auto">
            <p className="text-xs font-semibold text-white mb-1">{t('students.import.resultTitle')}</p>
            <p className="text-xs text-emerald-400 mb-1">{t('students.import.resultSummary', { total: importResult.total, created: importResult.created, failed: importResult.failed })}</p>
            {importResult.withPhoto > 0 && (
              <p className="text-xs text-cyan-400 mb-2">{t('students.import.photoSummary', { count: importResult.withPhoto })}</p>
            )}
            {importResult.imageNotice && (
              <p className="text-[11px] text-amber-300 mb-2 py-2 px-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">{importResult.imageNotice}</p>
            )}
            {importResult.errors?.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-red-400 uppercase mb-1">{t('students.import.errorsTitle')}</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-[11px] text-red-300">{t('students.import.rowLabel', { row: e.row })}: {e.message}</p>
                ))}
              </div>
            )}
            {importResult.warnings?.length > 0 && (
              <div>
                <p className="text-[10px] text-amber-400 uppercase mb-1">{t('students.import.warningsTitle')}</p>
                {importResult.warnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-300">{t('students.import.rowLabel', { row: w.row })}: {w.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={() => setImportModal(false)} disabled={importing} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors disabled:opacity-50">
            {importResult ? t('students.import.doneBtn') : t('students.import.closeBtn')}
          </button>
          {!importResult && (
            <button onClick={doImport} disabled={importing || !importFile} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
              {importing ? t('students.import.importing') : t('students.import.submitBtn')}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
