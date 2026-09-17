import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Plus, Edit2, Trash2, Video, MapPin, Wifi, ListVideo } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { camerasAPI } from '../../api/cameras'
import { orgAPI } from '../../api/organizations'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { CameraLivePanel } from '../../components/devices/DeviceManagement'

const STATUS_CFG = {
  ONLINE: { key: 'online', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  OFFLINE: { key: 'offline', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', dot: '#94A3B8' },
  MAINTENANCE: { key: 'maintenance', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
}

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

const formInputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

function CameraCard({ camera, onEdit, onDelete, onEvents, onLive }) {
  const { t } = useTranslation()
  const cfg = STATUS_CFG[camera.status] || STATUS_CFG.OFFLINE
  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Video style={{ width: 20, height: 20, color: cfg.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{camera.name}</p>
            <p style={{ fontSize: 11.5, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camera.schoolName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.color, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            {t(`cameras.cameraStatus.${cfg.key}`)}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(camera)} style={{ padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', color: '#64748B' }} title={t('common.edit')}>
              <Edit2 style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => onDelete(camera)} style={{ padding: '5px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#EF4444' }} title={t('common.delete')}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[
          { icon: MapPin, label: t('cameras.list.card.location'), value: camera.location },
          { icon: Wifi, label: t('cameras.list.card.ipAddress'), value: camera.ipAddress, mono: true },
          { label: t('cameras.list.card.resolution'), value: camera.resolution },
        ].map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
        <button
          onClick={() => onEvents(camera)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1,
            padding: '8px 4px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 9,
            cursor: 'pointer', color: '#7C3AED', fontSize: 12, fontWeight: 600,
          }}>
          <ListVideo style={{ width: 14, height: 14 }} />
          {t('cameras.list.card.eventsBtn')} {camera.eventCount != null ? `(${camera.eventCount})` : ''}
        </button>
        {camera.managed && (
          <button
            onClick={() => onLive(camera)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1,
              padding: '8px 4px', background: '#ECFEFF', border: '1px solid #A5F3FC', borderRadius: 9,
              cursor: 'pointer', color: '#0891B2', fontSize: 12, fontWeight: 600,
            }}>
            <Video style={{ width: 14, height: 14 }} />
            {t('cameras.device.refreshSnapshot')}
          </button>
        )}
      </div>
      {camera.lastError && (
        <p style={{ padding: '0 18px 12px', fontSize: 11.5, color: '#D97706' }}>{camera.lastError}</p>
      )}
    </div>
  )
}

function CameraFormModal({ camera, schools, onClose, onSaved }) {
  const { t } = useTranslation()
  const isEdit = !!camera
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: camera ? {
      schoolId: camera.schoolId, name: camera.name, location: camera.location || '',
      ipAddress: camera.ipAddress || '', resolution: camera.resolution || '',
      status: camera.status || 'OFFLINE', notes: camera.notes || '',
      // Masofadan boshqarish — parol hech qachon qaytarilmaydi, bo'sh yuborilsa backend eskisini saqlaydi
      brand: camera.brand || '', port: camera.port ?? '', rtspPort: camera.rtspPort ?? '',
      streamChannel: camera.streamChannel || '', deviceUsername: camera.deviceUsername || '', devicePassword: '',
    } : { status: 'OFFLINE', brand: '' }
  })
  const brand = watch('brand')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      if (isEdit) {
        await camerasAPI.updateCamera(camera.id, data)
        toast.success(t('cameras.list.toast.updated'))
      } else {
        await camerasAPI.createCamera(data)
        toast.success(t('cameras.list.toast.created'))
      }
      onSaved(); onClose()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.error || err?.detail || t('common.error'))
    } finally { setSaving(false) }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} type="button">{t('common.cancel')}</Button>
      <Button type="submit" form="camera-form" loading={saving}>{isEdit ? t('common.save') : t('common.add')}</Button>
    </>
  )

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? t('cameras.list.formModal.editTitle') : t('cameras.list.formModal.addTitle')} footer={footer}>
      <form id="camera-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('cameras.list.formModal.schoolLabel')}</label>
          <select {...register('schoolId', { required: true })} style={{ ...formInputStyle, appearance: 'none' }}>
            <option value="">{t('cameras.list.formModal.schoolPlaceholder')}</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.schoolId && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4 }}>{t('cameras.list.formModal.schoolRequired')}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.list.formModal.nameLabel')}</label>
          <input {...register('name', { required: true })} placeholder={t('cameras.list.formModal.namePlaceholder')} style={formInputStyle} />
          {errors.name && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4 }}>{t('cameras.list.formModal.nameRequired')}</p>}
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.list.formModal.locationLabel')}</label>
          <input {...register('location')} placeholder={t('cameras.list.formModal.locationPlaceholder')} style={formInputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('cameras.list.formModal.ipLabel')}</label>
            <input {...register('ipAddress')} placeholder={t('cameras.list.formModal.ipPlaceholder')} style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('cameras.list.formModal.resolutionLabel')}</label>
            <input {...register('resolution')} placeholder={t('cameras.list.formModal.resolutionPlaceholder')} style={formInputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.list.formModal.statusLabel')}</label>
          <select {...register('status')} style={{ ...formInputStyle, appearance: 'none' }}>
            <option value="ONLINE">{t('cameras.cameraStatus.online')}</option>
            <option value="OFFLINE">{t('cameras.cameraStatus.offline')}</option>
            <option value="MAINTENANCE">{t('cameras.cameraStatus.maintenance')}</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('cameras.list.formModal.notesLabel')}</label>
          <input {...register('notes')} placeholder={t('cameras.list.formModal.notesPlaceholder')} style={formInputStyle} />
        </div>
        <div style={{ background: '#F0FDFF', border: '1px solid #CFFAFE', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0E7490' }}>{t('cameras.device.sectionTitle')}</p>
            <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{t('cameras.device.sectionHint')}</p>
          </div>
          <div>
            <label style={labelStyle}>{t('cameras.device.brand')}</label>
            <select {...register('brand')} style={{ ...formInputStyle, appearance: 'none' }}>
              <option value="">{t('cameras.device.brandNone')}</option>
              <option value="Hikvision">Hikvision</option>
            </select>
          </div>
          {brand && <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>{t('cameras.device.port')}</label><input {...register('port')} placeholder="80" inputMode="numeric" style={formInputStyle} /></div>
              <div><label style={labelStyle}>{t('cameras.device.rtspPort')}</label><input {...register('rtspPort')} placeholder="554" inputMode="numeric" style={formInputStyle} /></div>
              <div><label style={labelStyle}>{t('cameras.device.channel')}</label><input {...register('streamChannel')} placeholder="101" inputMode="numeric" style={formInputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>{t('cameras.device.username')}</label><input {...register('deviceUsername')} autoComplete="off" style={formInputStyle} /></div>
              <div>
                <label style={labelStyle}>{t('cameras.device.password')}</label>
                <input type="password" {...register('devicePassword')} autoComplete="new-password"
                  placeholder={camera?.hasDevicePassword ? t('cameras.device.passwordKeep') : ''} style={formInputStyle} />
              </div>
            </div>
          </>}
        </div>
      </form>
    </Modal>
  )
}

function EventsModal({ camera, onClose, onChanged }) {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { type: 'MOTION', severity: 'LOW', occurredAt: new Date().toISOString().slice(0, 16) }
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    camerasAPI.getCameraEvents(camera.id)
      .then(({ data }) => setEvents(data))
      .catch(() => toast.error(t('cameras.list.eventsModal.loadError')))
      .finally(() => setLoading(false))
  }, [camera.id, t])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await camerasAPI.createCameraEvent(camera.id, {
        ...data,
        occurredAt: data.occurredAt ? new Date(data.occurredAt).toISOString() : undefined,
      })
      toast.success(t('cameras.list.eventsModal.eventAdded'))
      setShowAdd(false)
      reset({ type: 'MOTION', severity: 'LOW', description: '', occurredAt: new Date().toISOString().slice(0, 16) })
      load()
      onChanged?.()
    } catch (e) {
      toast.error(e.response?.data?.error || t('cameras.list.eventsModal.eventAddError'))
    } finally { setSaving(false) }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} type="button">{t('common.close')}</Button>
      {!showAdd && <Button icon={Plus} onClick={() => setShowAdd(true)}>{t('cameras.list.eventsModal.addBtn')}</Button>}
    </>
  )

  return (
    <Modal isOpen onClose={onClose} title={`${camera.name} — ${t('cameras.list.eventsModal.titleSuffix')}`} size="md" footer={footer}>
      {showAdd && (
        <form id="event-form" onSubmit={handleSubmit(onSubmit)} style={{
          display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18,
          padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowAdd(false)}>{t('cameras.list.eventsModal.cancelBtn')}</Button>
            <Button size="sm" type="submit" loading={saving}>{t('common.save')}</Button>
          </div>
        </form>
      )}
      {loading ? (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
      ) : events.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 13.5 }}>{t('cameras.list.eventsModal.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {events.map(ev => {
            const sc = SEVERITY_CFG[ev.severity] || SEVERITY_CFG.LOW
            return (
              <div key={ev.id} style={{
                padding: '10px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9',
                borderLeft: `3px solid ${sc.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{t(`cameras.eventTypes.${TYPE_KEYS[ev.type] || 'other'}`, { defaultValue: ev.type })}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 999, padding: '2px 8px' }}>{t(`cameras.severity.${SEVERITY_KEYS[ev.severity] || 'low'}`, { defaultValue: ev.severity })}</span>
                </div>
                {ev.description && <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{ev.description}</p>}
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {ev.occurredAt ? new Date(ev.occurredAt).toLocaleString('uz-UZ') : '—'} {ev.resolved ? ` · ${t('cameras.eventStatus.resolved')}` : ` · ${t('cameras.eventStatus.unresolved')}`}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default function CamerasPage() {
  const { t } = useTranslation()
  const [cameras, setCameras] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCamera, setEditCamera] = useState(null)
  const [eventsCamera, setEventsCamera] = useState(null)
  const [deleteCamera, setDeleteCamera] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [liveCamera, setLiveCamera] = useState(null)

  useEffect(() => {
    orgAPI.getSchools({ page_size: 500 }).then(({ data }) => setSchools(data.results || data)).catch(() => {})
  }, [])

  const loadCameras = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await camerasAPI.getCameras()
      setCameras(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(t('cameras.list.loadError'))
    } finally { setLoading(false) }
  }, [t])

  useEffect(() => { loadCameras() }, [loadCameras])

  const handleDelete = async () => {
    if (!deleteCamera) return
    setDeleting(true)
    try {
      await camerasAPI.deleteCamera(deleteCamera.id)
      toast.success(t('cameras.list.toast.deleted'))
      setDeleteCamera(null)
      loadCameras()
    } catch { toast.error(t('cameras.list.toast.deleteError')) }
    finally { setDeleting(false) }
  }

  const filtered = cameras.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(s) || (c.schoolName || '').toLowerCase().includes(s) || (c.ipAddress || '').includes(s)
  })

  const online = cameras.filter(c => c.status === 'ONLINE').length
  const offline = cameras.filter(c => c.status === 'OFFLINE').length
  const maintenance = cameras.filter(c => c.status === 'MAINTENANCE').length

  const selectStyle = {
    padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
    fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', appearance: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('cameras.list.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('cameras.list.subtitle')}</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditCamera(null); setShowForm(true) }}>{t('cameras.list.addBtn')}</Button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#991B1B', fontSize: 13 }}>
          {error} — <button onClick={loadCameras} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontSize: 13 }}>{t('cameras.aiAnalysis.retry')}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: t('common.total'), value: cameras.length, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: t('cameras.cameraStatus.online'), value: online, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: t('cameras.cameraStatus.maintenance'), value: maintenance, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: t('cameras.cameraStatus.offline'), value: offline, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color }}>{value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.75, marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('cameras.list.searchPlaceholder')} style={{ ...selectStyle, flex: 1, minWidth: 220, appearance: 'auto' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">{t('cameras.list.filters.allStatuses')}</option>
          <option value="ONLINE">{t('cameras.cameraStatus.online')}</option>
          <option value="MAINTENANCE">{t('cameras.cameraStatus.maintenance')}</option>
          <option value="OFFLINE">{t('cameras.cameraStatus.offline')}</option>
        </select>
      </div>

      {loading ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={Camera} title={cameras.length === 0 ? t('cameras.list.empty.noneTitle') : t('cameras.list.empty.filteredTitle')}
            description={cameras.length === 0 ? t('cameras.list.empty.noneDescription') : t('cameras.list.empty.filteredDescription')}
            action={cameras.length === 0 ? <Button onClick={() => setShowForm(true)} icon={Plus}>{t('cameras.list.addBtn')}</Button> : null} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(camera => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onEdit={c => { setEditCamera(c); setShowForm(true) }}
              onDelete={c => setDeleteCamera(c)}
              onEvents={c => setEventsCamera(c)}
              onLive={c => setLiveCamera(c)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <CameraFormModal
          camera={editCamera}
          schools={schools}
          onClose={() => { setShowForm(false); setEditCamera(null) }}
          onSaved={loadCameras}
        />
      )}
      {eventsCamera && (
        <EventsModal camera={eventsCamera} onClose={() => setEventsCamera(null)} onChanged={loadCameras} />
      )}
      {liveCamera && (
        <Modal isOpen size="lg" title={liveCamera.name} onClose={() => { setLiveCamera(null); loadCameras() }}>
          <CameraLivePanel camera={liveCamera} t={t} />
        </Modal>
      )}
      {deleteCamera && (
        <ConfirmModal
          isOpen
          title={t('cameras.list.deleteModal.title')}
          message={t('cameras.list.deleteModal.message', { name: deleteCamera.name })}
          confirmLabel={t('common.delete')}
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCamera(null)}
        />
      )}
    </div>
  )
}
