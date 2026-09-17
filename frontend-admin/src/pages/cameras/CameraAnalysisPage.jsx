import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Plus, Filter } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { camerasAPI } from '../../api/cameras'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const TYPE_KEYS = {
  MOTION: 'motion',
  PERSON_DETECTED: 'personDetected',
  CROWD: 'crowd',
  UNAUTHORIZED_ACCESS: 'unauthorizedAccess',
  EQUIPMENT_ISSUE: 'equipmentIssue',
  OTHER: 'other',
}
const SEVERITY_KEYS = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }
const SEVERITY_CFG = {
  LOW: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  MEDIUM: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  HIGH: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const cardStyle = { background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const selectStyle = { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', appearance: 'none' }
const formInputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box' }
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

function KpiCard({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
      <p style={{ fontSize: 26, fontWeight: 800, color }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.75, marginTop: 2 }}>{label}</p>
    </div>
  )
}

function AddEventModal({ cameras, defaultCameraId, onClose, onSaved }) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { cameraId: defaultCameraId || '', type: 'MOTION', severity: 'LOW', occurredAt: new Date().toISOString().slice(0, 16) }
  })
  const [saving, setSaving] = useState(false)

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const { cameraId, ...rest } = data
      await camerasAPI.createCameraEvent(cameraId, {
        ...rest,
        occurredAt: rest.occurredAt ? new Date(rest.occurredAt).toISOString() : undefined,
      })
      toast.success(t('cameras.analysis.toast.eventAdded'))
      onSaved(); onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || t('cameras.analysis.toast.eventAddError'))
    } finally { setSaving(false) }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} type="button">{t('common.cancel')}</Button>
      <Button type="submit" form="add-event-form" loading={saving}>{t('common.save')}</Button>
    </>
  )

  return (
    <Modal isOpen onClose={onClose} title={t('cameras.analysis.addModal.title')} footer={footer}>
      <form id="add-event-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('cameras.analysis.addModal.cameraLabel')}</label>
          <select {...register('cameraId', { required: true })} style={{ ...formInputStyle, appearance: 'none' }}>
            <option value="">{t('cameras.analysis.addModal.cameraPlaceholder')}</option>
            {cameras.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schoolName})</option>)}
          </select>
          {errors.cameraId && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4 }}>{t('cameras.analysis.addModal.cameraRequired')}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('cameras.analysis.addModal.typeLabel')}</label>
            <select {...register('type')} style={{ ...formInputStyle, appearance: 'none' }}>
              {Object.entries(TYPE_KEYS).map(([k, key]) => <option key={k} value={k}>{t(`cameras.eventTypes.${key}`)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('cameras.analysis.addModal.severityLabel')}</label>
            <select {...register('severity')} style={{ ...formInputStyle, appearance: 'none' }}>
              {Object.entries(SEVERITY_KEYS).map(([k, key]) => <option key={k} value={k}>{t(`cameras.severity.${key}`)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.analysis.addModal.occurredAtLabel')}</label>
          <input type="datetime-local" {...register('occurredAt')} style={formInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.analysis.addModal.descriptionLabel')}</label>
          <input {...register('description')} placeholder={t('cameras.analysis.addModal.descriptionPlaceholder')} style={formInputStyle} />
        </div>
      </form>
    </Modal>
  )
}

export default function CameraAnalysisPage() {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const [fCamera, setFCamera] = useState('')
  const [fType, setFType] = useState('')
  const [fSeverity, setFSeverity] = useState('')
  const [fResolved, setFResolved] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')

  useEffect(() => {
    camerasAPI.getCameras().then(({ data }) => setCameras(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (fCamera) params.cameraId = fCamera
      if (fType) params.type = fType
      if (fSeverity) params.severity = fSeverity
      if (fResolved) params.resolved = fResolved
      if (fFrom) params.from = new Date(fFrom).toISOString()
      if (fTo) params.to = new Date(fTo).toISOString()
      const { data } = await camerasAPI.getAllEvents(params)
      setEvents(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(t('cameras.analysis.loadError'))
    } finally { setLoading(false) }
  }, [fCamera, fType, fSeverity, fResolved, fFrom, fTo, t])

  useEffect(() => { load() }, [load])

  const toggleResolved = async (ev) => {
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, resolved: !e.resolved } : e))
    try {
      await camerasAPI.updateCameraEvent(ev.id, { resolved: !ev.resolved })
    } catch (e2) {
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, resolved: ev.resolved } : e))
      toast.error(t('cameras.analysis.updateError'))
    }
  }

  const unresolvedCount = events.filter(e => !e.resolved).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('cameras.analysis.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('cameras.analysis.subtitle')}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowAdd(true)}>{t('cameras.analysis.addEventBtn')}</Button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#991B1B', fontSize: 13 }}>
          {error} — <button onClick={load} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontSize: 13 }}>{t('cameras.aiAnalysis.retry')}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label={t('cameras.analysis.kpi.total')} value={events.length} color="#0F172A" bg="#F8FAFC" border="#E2E8F0" />
        <KpiCard label={t('cameras.analysis.kpi.unresolved')} value={unresolvedCount} color="#DC2626" bg="#FEF2F2" border="#FECACA" />
        <KpiCard label={t('cameras.analysis.kpi.resolved')} value={events.length - unresolvedCount} color="#059669" bg="#ECFDF5" border="#A7F3D0" />
        <KpiCard label={t('cameras.analysis.kpi.highSeverity')} value={events.filter(e => e.severity === 'HIGH').length} color="#D97706" bg="#FFFBEB" border="#FDE68A" />
      </div>

      <div style={{ ...cardStyle, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Filter style={{ width: 15, height: 15, color: '#94A3B8', flexShrink: 0 }} />
        <select value={fCamera} onChange={e => setFCamera(e.target.value)} style={selectStyle}>
          <option value="">{t('cameras.analysis.filters.allCameras')}</option>
          {cameras.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schoolName})</option>)}
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)} style={selectStyle}>
          <option value="">{t('cameras.analysis.filters.allTypes')}</option>
          {Object.entries(TYPE_KEYS).map(([k, key]) => <option key={k} value={k}>{t(`cameras.eventTypes.${key}`)}</option>)}
        </select>
        <select value={fSeverity} onChange={e => setFSeverity(e.target.value)} style={selectStyle}>
          <option value="">{t('cameras.analysis.filters.allSeverities')}</option>
          {Object.entries(SEVERITY_KEYS).map(([k, key]) => <option key={k} value={k}>{t(`cameras.severity.${key}`)}</option>)}
        </select>
        <select value={fResolved} onChange={e => setFResolved(e.target.value)} style={selectStyle}>
          <option value="">{t('cameras.analysis.filters.allStatuses')}</option>
          <option value="false">{t('cameras.eventStatus.unresolved')}</option>
          <option value="true">{t('cameras.eventStatus.resolved')}</option>
        </select>
        <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={{ ...selectStyle, appearance: 'auto' }} />
        <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={{ ...selectStyle, appearance: 'auto' }} />
      </div>

      {loading ? (
        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
      ) : events.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={BarChart3} title={t('cameras.analysis.empty.title')}
            description={t('cameras.analysis.empty.description')}
            action={<Button onClick={() => setShowAdd(true)} icon={Plus}>{t('cameras.analysis.addEventBtn')}</Button>} />
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          {events.map((ev, i) => {
            const sc = SEVERITY_CFG[ev.severity] || SEVERITY_CFG.LOW
            return (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', borderLeft: `3px solid ${sc.color}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
                  {t(`cameras.severity.${SEVERITY_KEYS[ev.severity] || 'low'}`, { defaultValue: ev.severity })}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t(`cameras.eventTypes.${TYPE_KEYS[ev.type] || 'other'}`, { defaultValue: ev.type })}{ev.description ? <span style={{ color: '#64748B', fontWeight: 400 }}> — {ev.description}</span> : null}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '2px 0 0' }}>{ev.cameraName} · {ev.schoolName}{ev.reportedByName ? ` · ${ev.reportedByName}` : ''}</p>
                </div>
                <span style={{ fontSize: 11.5, color: '#94A3B8', flexShrink: 0, fontFamily: 'monospace' }}>
                  {ev.occurredAt ? new Date(ev.occurredAt).toLocaleString('uz-UZ') : '—'}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!ev.resolved} onChange={() => toggleResolved(ev)} style={{ width: 14, height: 14, accentColor: '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: ev.resolved ? '#059669' : '#94A3B8' }}>{ev.resolved ? t('cameras.eventStatus.resolved') : t('cameras.eventStatus.unresolved')}</span>
                </label>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddEventModal cameras={cameras} defaultCameraId={fCamera} onClose={() => setShowAdd(false)} onSaved={load} />
      )}
    </div>
  )
}
