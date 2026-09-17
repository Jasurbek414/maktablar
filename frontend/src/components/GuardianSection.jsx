import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

// O'quvchi profilida ota-ona/vasiylar ro'yxati — Telegram bot orqali bog'langanlik
// holati bilan birga. Backend: /api/students/{id}/guardians (Student<->Guardian
// ManyToMany, GuardianController/V1StudentController bilan bir xil jadval).
export default function GuardianSection({ studentId, canManage }) {
  const { t } = useTranslation();
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api.get(`/api/students/${studentId}/guardians`)
      .then(setGuardians)
      .catch(() => setGuardians([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  const submit = async () => {
    if (!phone.trim()) return;
    setSaving(true); setError('');
    try {
      const created = await api.post(`/api/students/${studentId}/guardians`, { phone: phone.trim(), name: name.trim() });
      setGuardians(prev => prev.some(g => g.id === created.id) ? prev : [...prev, created]);
      setName(''); setPhone(''); setAddOpen(false);
    } catch {
      setError(t('guardians.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (guardianId) => {
    try {
      await api.del(`/api/students/${studentId}/guardians/${guardianId}`);
      setGuardians(prev => prev.filter(g => g.id !== guardianId));
    } catch {}
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {t('guardians.title')}
        </h3>
        {canManage && (
          <button onClick={() => setAddOpen(v => !v)} className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            {addOpen ? t('common.cancel') : t('guardians.addBtn')}
          </button>
        )}
      </div>

      {addOpen && (
        <div className="mb-3 p-3 rounded-xl bg-white/[0.02] border border-emerald-500/[0.08]">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('guardians.namePlaceholder')}
              className="h-9 px-3 rounded-lg bg-white/[0.03] border border-emerald-500/[0.1] text-white text-xs placeholder-slate-600 outline-none focus:border-emerald-500/40" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998..."
              className="h-9 px-3 rounded-lg bg-white/[0.03] border border-emerald-500/[0.1] text-white text-xs placeholder-slate-600 outline-none focus:border-emerald-500/40" />
          </div>
          {error && <p className="text-[11px] text-red-400 mb-2">{error}</p>}
          <button onClick={submit} disabled={saving || !phone.trim()} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-medium transition-colors">
            {saving ? t('common.saving') : t('guardians.linkBtn')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : guardians.length === 0 ? (
        <p className="text-xs text-slate-600 py-2">{t('guardians.empty')}</p>
      ) : (
        <div className="space-y-2">
          {guardians.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-white/[0.02] border border-emerald-500/[0.05]">
              <div className="min-w-0">
                <p className="text-xs text-white font-medium truncate">{g.name || t('guardians.unnamed')}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{g.phone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold ${g.telegramLinked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-500'}`}>
                  {g.telegramLinked ? t('guardians.telegramLinked') : t('guardians.telegramNotLinked')}
                </span>
                {canManage && (
                  <button onClick={() => remove(g.id)} className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
