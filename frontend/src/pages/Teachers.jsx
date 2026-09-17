import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { Input } from '../components/CrudPage';
import ConfirmModal from '../components/ConfirmModal';
import NotesHistory from '../components/NotesHistory';

const Loader = () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
const GRADE_COLORS = ['', 'bg-red-500/10 text-red-400', 'bg-orange-500/10 text-orange-400', 'bg-amber-500/10 text-amber-400', 'bg-yellow-500/10 text-yellow-400', 'bg-lime-500/10 text-lime-400', 'bg-emerald-500/10 text-emerald-400', 'bg-teal-500/10 text-teal-400', 'bg-cyan-500/10 text-cyan-400', 'bg-blue-500/10 text-blue-400', 'bg-indigo-500/10 text-indigo-400', 'bg-violet-500/10 text-violet-400'];

function TeacherCard({ tch, ownClasses, onOpen, onEdit, onDelete, t }) {
  return (
    <div onClick={() => onOpen(tch)} className="group relative rounded-2xl bg-gradient-to-br from-[#0d1a14] to-[#0a1410] border border-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
              {tch.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">{tch.fullName}</h3>
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">{tch.subject || t('teachers.profile.noSubject')}</p>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e => { e.stopPropagation(); onEdit(tch); }} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(tch.id); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>
            </button>
          </div>
        </div>
        {ownClasses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {ownClasses.map(c => (
              <span key={c.id} className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${GRADE_COLORS[c.grade] || 'bg-slate-500/10 text-slate-400'}`}>{c.name}</span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="py-1.5 px-3 rounded-lg bg-emerald-500/[0.05] text-center">
            <p className="text-xs font-bold text-emerald-400 truncate">{tch.username}</p>
            <p className="text-[8px] text-slate-600 uppercase">{t('teachers.fields.username')}</p>
          </div>
          <div className="py-1.5 px-3 rounded-lg bg-cyan-500/[0.05] text-center">
            <p className="text-xs font-bold text-cyan-400 truncate">{tch.phone || '—'}</p>
            <p className="text-[8px] text-slate-600 uppercase">{t('teachers.fields.phone')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Teachers({ user }) {
  const { t } = useTranslation();
  const [schools, setSchools] = useState([]);
  const [selSchoolId, setSelSchoolId] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [profile, setProfile] = useState(null);
  const canManage = user?.role === 'DIRECTOR' || user?.role === 'MUDIR' || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'REGION_DIRECTOR' || user?.role === 'DISTRICT_DIRECTOR';

  useEffect(() => {
    api.get('/api/schools').then(list => {
      setSchools(list);
      if (list.length === 1) setSelSchoolId(list[0].id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selSchoolId) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/users?role=TEACHER&schoolId=${selSchoolId}`),
      api.get(`/api/classes?schoolId=${selSchoolId}`),
    ]).then(([tchs, cls]) => { setTeachers(tchs); setSchoolClasses(cls); })
      .catch(() => { setTeachers([]); setSchoolClasses([]); })
      .finally(() => setLoading(false));
  }, [selSchoolId]);

  const reload = () => {
    if (!selSchoolId) return;
    api.get(`/api/users?role=TEACHER&schoolId=${selSchoolId}`).then(setTeachers).catch(() => {});
    api.get(`/api/classes?schoolId=${selSchoolId}`).then(setSchoolClasses).catch(() => {});
  };

  const classesFor = (teacherId) => schoolClasses.filter(c => c.teacherId === teacherId);

  const openAdd = () => { setEditing(null); setForm({ fullName: '', username: '', password: '', phone: '', subject: '' }); setFormError(''); setModal(true); };
  const openEdit = (tch) => { setEditing(tch); setForm({ fullName: tch.fullName, username: tch.username, password: '', phone: tch.phone || '', subject: tch.subject || '' }); setFormError(''); setModal(true); };

  const submit = async () => {
    setSaving(true); setFormError('');
    try {
      if (editing) {
        const body = { fullName: form.fullName, phone: form.phone, subject: form.subject };
        if (form.password) body.password = form.password;
        await api.put(`/api/users/${editing.id}`, body);
      } else {
        await api.post('/api/users', { ...form, role: 'TEACHER', schoolId: selSchoolId });
      }
      setModal(false);
      reload();
    } catch {
      setFormError(t('common.errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.del(`/api/users/${deleteId}`); } catch {}
    setDeleteId(null);
    setProfile(null);
    reload();
  };

  const filtered = teachers.filter(tc => !search || tc.fullName?.toLowerCase().includes(search.toLowerCase()) || tc.username?.toLowerCase().includes(search.toLowerCase()));
  const selSchool = schools.find(s => s.id === selSchoolId);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('teachers.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{selSchool ? selSchool.name : t('teachers.subtitle')}</p>
        </div>
        {canManage && selSchoolId && (
          <button onClick={openAdd} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {t('teachers.addBtn')}
          </button>
        )}
      </div>

      {schools.length > 1 && (
        <div className="mb-5">
          <select value={selSchoolId || ''} onChange={e => setSelSchoolId(Number(e.target.value) || null)}
            className="h-11 px-4 rounded-xl bg-[#0a120e] border border-emerald-500/[0.1] text-white text-sm outline-none focus:border-emerald-500/40">
            <option value="">{t('common.selectDots')}</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {selSchoolId && (
        <div className="mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('teachers.searchPlaceholder')}
            className="w-full max-w-sm h-11 px-4 rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] text-white text-sm placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors" />
        </div>
      )}

      {loading ? <Loader /> : !selSchoolId ? (
        <p className="text-sm text-slate-500 py-10 text-center">{t('common.selectDots')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center">{t('teachers.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tc => <TeacherCard key={tc.id} tch={tc} ownClasses={classesFor(tc.id)} onOpen={setProfile} onEdit={openEdit} onDelete={setDeleteId} t={t} />)}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0d1a14] border border-emerald-500/[0.12] p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-5">{editing ? t('teachers.form.editTitle') : t('teachers.form.addTitle')}</h3>
            <Input label={t('teachers.fields.fullName')} value={form.fullName || ''} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            {!editing && <Input label={t('teachers.fields.username')} value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} />}
            <Input label={t('teachers.fields.password')} type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editing ? t('teachers.form.passwordHint') : ''} />
            <Input label={t('teachers.fields.phone')} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label={t('teachers.fields.subject')} value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} />
            {formError && <p className="text-xs text-red-400 mb-3">{formError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={() => setModal(false)} className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-white/[0.03] transition-colors">{t('teachers.form.cancel')}</button>
              <button onClick={submit} disabled={saving} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? t('common.saving') : t('teachers.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} title={t('teachers.deleteConfirm.title')} message={t('teachers.deleteConfirm.message')} />

      {/* Teacher profile panel */}
      {profile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setProfile(null)}>
          <div className="w-full max-w-lg bg-[#0a120e] border-l border-emerald-500/[0.1] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="h-32 bg-gradient-to-br from-emerald-900/40 to-teal-900/20" />
              <button onClick={() => setProfile(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/30 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute -bottom-12 left-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border-4 border-[#0a120e] flex items-center justify-center text-emerald-400 text-3xl font-bold shadow-xl">{profile.fullName?.charAt(0)}</div>
              </div>
            </div>
            <div className="px-6 pt-16 pb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{profile.fullName}</h2>
                {profile.subject && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-semibold">{profile.subject}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{selSchool?.name}</p>

              {/* Stats: rahbarlik qilayotgan sinflar soni + ular ostidagi o'quvchilar */}
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="rounded-xl bg-emerald-500/[0.06] p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">{classesFor(profile.id).length}</p>
                  <p className="text-[9px] text-slate-600 uppercase">{t('teachers.profile.classesCountLabel')}</p>
                </div>
                <div className="rounded-xl bg-cyan-500/[0.06] p-3 text-center">
                  <p className="text-lg font-bold text-cyan-400">{classesFor(profile.id).reduce((s, c) => s + (c.studentCount || 0), 0)}</p>
                  <p className="text-[9px] text-slate-600 uppercase">{t('teachers.profile.studentsCountLabel')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { l: t('teachers.fields.username'), v: profile.username, c: 'text-emerald-400 font-mono text-xs' },
                  { l: t('teachers.profile.phoneLabel'), v: profile.phone || t('teachers.profile.noPhone'), c: 'text-white' },
                  { l: t('teachers.profile.subjectLabel'), v: profile.subject || t('teachers.profile.noSubject'), c: 'text-white' },
                  { l: t('teachers.profile.roleLabel'), v: t('header.roleLabel.TEACHER'), c: 'text-cyan-400' },
                ].map((x, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-emerald-500/[0.06] p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">{x.l}</p>
                    <p className={`text-sm mt-1 ${x.c}`}>{x.v}</p>
                  </div>
                ))}
              </div>

              {/* Rahbarlik qilayotgan sinflar */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" /></svg>
                  {t('teachers.profile.classesTitle')}
                </h3>
                {classesFor(profile.id).length === 0 ? (
                  <p className="text-xs text-slate-600 py-2">{t('teachers.profile.noClasses')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {classesFor(profile.id).map(c => (
                      <div key={c.id} className="rounded-xl bg-white/[0.02] border border-emerald-500/[0.06] p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${GRADE_COLORS[c.grade] || 'bg-slate-500/10 text-slate-400'}`}>{c.name}</span>
                        <p className="text-[10px] text-slate-600 mt-1.5">{c.studentCount || 0} {t('classes.card.studentSuffix')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <NotesHistory personType="TEACHER" personId={profile.id} />
              {canManage && (
                <div className="flex gap-3 mt-8">
                  <button onClick={() => { setProfile(null); openEdit(profile); }} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>{t('common.edit')}
                  </button>
                  <button onClick={() => { setProfile(null); setDeleteId(profile.id); }} className="h-10 px-5 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" /></svg>{t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
