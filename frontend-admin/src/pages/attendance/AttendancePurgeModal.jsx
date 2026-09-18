import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { AlertTriangle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { attendanceAPI } from '../../api/attendance'
import { orgAPI } from '../../api/organizations'

const MODES = ['day', 'week', 'range', 'all']
const today = () => format(new Date(), 'yyyy-MM-dd')

const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
  fontSize: 13.5, color: '#0F172A', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }

/** Tanlangan rejimdan backend so'rov parametrlari (kunlar Toshkent vaqti bo'yicha backendda hisoblanadi). */
function periodParams(mode, date, from, to) {
  if (mode === 'all') return { all: true }
  if (mode === 'day') return { all: false, from: date, to: date }
  if (mode === 'week') {
    const d = new Date(date)
    return {
      all: false,
      from: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }
  }
  return { all: false, from, to }
}

export default function AttendancePurgeModal({ isOpen, onClose, onDone }) {
  const { t } = useTranslation()
  const [schools, setSchools] = useState([])
  const [schoolId, setSchoolId] = useState('')
  const [mode, setMode] = useState('day')
  const [date, setDate] = useState(today())
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [preview, setPreview] = useState(null)
  const [counting, setCounting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    orgAPI.getSchools({ page_size: 1000 })
      .then(r => setSchools(r.data.results || r.data))
      .catch(() => toast.error(t('attendance.purge.schoolsLoadError')))
  }, [isOpen])

  // Tanlov o'zgarsa eski hisob yaroqsiz — tasdiqlash faqat JORIY tanlov uchun hisoblangan son bilan
  useEffect(() => { setPreview(null) }, [schoolId, mode, date, from, to])

  const params = periodParams(mode, date, from, to)
  const errorOf = (e) => e?.response?.data?.error || t('attendance.purge.error')

  const count = async () => {
    if (!schoolId) { toast.error(t('attendance.purge.pickSchool')); return }
    setCounting(true)
    try {
      const { data } = await attendanceAPI.purgePreview({ schoolId, ...params })
      setPreview({ ...data, params })
    } catch (e) {
      toast.error(errorOf(e))
    } finally { setCounting(false) }
  }

  const purge = async () => {
    setDeleting(true)
    try {
      const { data } = await attendanceAPI.purge({ schoolId: Number(schoolId), expectedCount: preview.count, ...preview.params })
      toast.success(t('attendance.purge.done', { count: data.deleted, photos: data.photosDeleted }))
      setPreview(null)
      onDone?.()
      onClose()
    } catch (e) {
      toast.error(errorOf(e))
      setPreview(null)
    } finally { setDeleting(false) }
  }

  const schoolLabel = (s) => [s.name, s.districtName, s.provinceName].filter(Boolean).join(' — ')
  const periodText = params.all
    ? t('attendance.purge.periodAll')
    : params.from === params.to ? params.from : `${params.from} … ${params.to}`

  return (
    <Modal isOpen={isOpen} onClose={() => !deleting && onClose()} title={t('attendance.purge.title')} size="md"
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={deleting}>{t('common.cancel')}</Button>
          {!preview ? (
            <Button variant="primary" size="md" loading={counting} onClick={count}>{t('attendance.purge.countBtn')}</Button>
          ) : (
            <Button variant="danger" size="md" icon={Trash2} loading={deleting} disabled={preview.count === 0} onClick={purge}>
              {t('attendance.purge.confirmBtn', { count: preview.count })}
            </Button>
          )}
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: '#991B1B' }}>{t('attendance.purge.warning')}</p>
        </div>

        <div>
          <label style={labelStyle}>{t('attendance.purge.school')}</label>
          <select value={schoolId} onChange={e => setSchoolId(e.target.value)} style={fieldStyle}>
            <option value="">{t('attendance.purge.pickSchool')}</option>
            {schools.map(s => <option key={s.id} value={s.id}>{schoolLabel(s)}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t('attendance.purge.period')}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MODES.map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${mode === m ? (m === 'all' ? '#DC2626' : '#4F46E5') : '#E2E8F0'}`,
                background: mode === m ? (m === 'all' ? '#FEF2F2' : '#EEF2FF') : 'white',
                color: mode === m ? (m === 'all' ? '#B91C1C' : '#4338CA') : '#334155', fontWeight: mode === m ? 600 : 500,
              }}>{t(`attendance.purge.modes.${m}`)}</button>
            ))}
          </div>
        </div>

        {(mode === 'day' || mode === 'week') && (
          <div>
            <label style={labelStyle}>{mode === 'day' ? t('attendance.purge.date') : t('attendance.purge.weekOf')}</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} style={fieldStyle} />
            {mode === 'week' && <p style={{ fontSize: 11.5, color: '#64748B', margin: '6px 0 0' }}>{periodText}</p>}
          </div>
        )}
        {mode === 'range' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('attendance.purge.from')}</label>
              <input type="date" value={from} max={to || today()} onChange={e => setFrom(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('attendance.purge.to')}</label>
              <input type="date" value={to} min={from} max={today()} onChange={e => setTo(e.target.value)} style={fieldStyle} />
            </div>
          </div>
        )}

        {preview && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: preview.count ? '#FFF7ED' : '#F8FAFC', border: `1px solid ${preview.count ? '#FED7AA' : '#E2E8F0'}` }}>
            <p style={{ margin: 0, fontSize: 13.5, color: '#0F172A', fontWeight: 600 }}>
              {preview.count
                ? t('attendance.purge.previewText', { count: preview.count, photos: preview.photos, school: preview.schoolName, period: periodText })
                : t('attendance.purge.previewEmpty', { school: preview.schoolName, period: periodText })}
            </p>
            {preview.count > 0 && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9A3412' }}>{t('attendance.purge.irreversible')}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
