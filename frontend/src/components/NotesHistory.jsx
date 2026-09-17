import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

// Xodim (direktor/mudir/o'qituvchi) tomonidan qo'lda yozilgan izohlar TARIXI —
// append-only ro'yxat (har biri sana+muallif bilan), AI EMAS.
export default function NotesHistory({ personType, personId }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!personId) return;
    setLoading(true);
    api.get(`/api/notes?personType=${personType}&personId=${personId}`)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [personType, personId]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.post('/api/notes', { personType, personId, text: trimmed });
      setNotes(prev => [created, ...prev]);
      setText('');
    } catch {
      setError(t('notes.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
        {t('notes.title')}
      </h3>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('notes.placeholder')}
        rows={2}
        className="w-full rounded-xl bg-white/[0.03] border border-emerald-500/[0.1] p-3 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-emerald-500/40"
      />
      <div className="flex justify-end mt-2 mb-1">
        <button
          onClick={submit}
          disabled={saving || !text.trim()}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
        >
          {saving ? t('common.saving') : t('notes.add')}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-600 py-3">{t('notes.empty')}</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mt-2">
          {notes.map(n => (
            <div key={n.id} className="py-2.5 px-3 rounded-lg bg-white/[0.02] border border-emerald-500/[0.05]">
              <p className="text-xs text-white whitespace-pre-wrap">{n.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-emerald-400/80">{n.authorName || t('notes.unknownAuthor')}</span>
                <span className="text-[10px] text-slate-600">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
