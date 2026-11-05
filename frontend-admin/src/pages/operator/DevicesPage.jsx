import { useState, useEffect, useCallback } from 'react'
import { Monitor, Plus, RefreshCw, Download, Wifi, WifiOff, Loader2, XCircle, Edit2, Trash2, History } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { StatusBadge } from '../../components/ui/Badge'
import { devicesAPI } from '../../api/devices'
import { orgAPI } from '../../api/organizations'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  online:  { label: 'Online',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  offline: { label: 'Offline', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', dot: '#94A3B8' },
  syncing: { label: 'Sinxron', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', dot: '#7C3AED' },
  error:   { label: 'Xatolik', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  unknown: { label: 'Noma\'lum', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', dot: '#CBD5E1' },
}

const actionBtnStyle = (color = '#64748B', bg = '#F8FAFC', border = '#E2E8F0') => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 4, padding: '8px 4px', flex: 1,
  background: bg, border: `1px solid ${border}`, borderRadius: 9,
  cursor: 'pointer', color, fontSize: 11, fontWeight: 600,
  transition: 'all 0.15s',
})

function DeviceCard({ device, onSync, onPullLogs, onRefresh, onEdit, onDelete, onLogs, syncing, pulling }) {
  const cfg = STATUS_CFG[device.status] || STATUS_CFG.unknown

  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Monitor style={{ width: 20, height: 20, color: cfg.color }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{device.name}</p>
            <p style={{ fontSize: 11.5, color: '#94A3B8' }}>{device.brand_display} • {device.ip_address}:{device.port}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.color, borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            {cfg.label}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(device)} style={{ padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', color: '#64748B' }}
              title="Tahrirlash">
              <Edit2 style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => onDelete(device)} style={{ padding: '5px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', cursor: 'pointer', color: '#EF4444' }}
              title="O'chirish">
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[
          { label: 'Maktab', value: device.school_name },
          { label: 'Joylashuv', value: device.location },
          { label: 'Seriya', value: device.serial_number, mono: true },
          { label: 'Oxirgi faollik', value: device.last_seen ? new Date(device.last_seen).toLocaleString('uz-UZ') : null },
        ].map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
        <button
          onClick={() => onRefresh(device.id)} disabled={syncing || pulling}
          style={actionBtnStyle('#64748B', '#F8FAFC', '#E2E8F0')}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Holat
        </button>
        <button
          onClick={() => onSync(device.id)} disabled={syncing || pulling}
          style={actionBtnStyle('#4F46E5', '#EEF2FF', '#C7D2FE')}
        >
          {syncing ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 14, height: 14 }} />}
          Yuklash
        </button>
        <button
          onClick={() => onPullLogs(device.id)} disabled={syncing || pulling}
          style={actionBtnStyle('#059669', '#ECFDF5', '#A7F3D0')}
        >
          {pulling ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <RefreshCw style={{ width: 14, height: 14 }} />}
          Log olish
        </button>
        <button
          onClick={() => onLogs(device)} disabled={syncing || pulling}
          style={actionBtnStyle('#64748B', '#F8FAFC', '#E2E8F0')}
        >
          <History style={{ width: 14, height: 14 }} />
          Tarix
        </button>
      </div>
    </div>
  )
}

function SyncLogsModal({ device, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    devicesAPI.getSyncLogs(device.id)
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Tarix yuklanmadi'))
      .finally(() => setLoading(false))
  }, [device.id])

  const statusCfg = {
    success: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    failed:  { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    pending: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
    running: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  }
  const typeCfg = {
    push: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
    pull: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  }

  const chip = (cfg, text) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: cfg?.bg || '#F8FAFC', color: cfg?.color || '#64748B', border: `1px solid ${cfg?.border || '#E2E8F0'}` }}>
      {text}
    </span>
  )

  return (
    <Modal isOpen onClose={onClose} title={`${device.name} — Sinxronizatsiya tarixi`} size="md">
      {loading ? (
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
      ) : logs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0' }}>Tarix topilmadi</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {logs.map(log => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              background: '#F8FAFC', border: '1px solid #F1F5F9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {chip(typeCfg[log.sync_type], log.sync_type_display || log.sync_type)}
                {chip(statusCfg[log.status], log.status_display || log.status)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{log.total_records} yozuv</p>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>
                  {log.started_at ? new Date(log.started_at).toLocaleString('uz-UZ') : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

const formInputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

function DeviceFormModal({ device, schools, onClose, onSaved }) {
  const isEdit = !!device
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: device ? {
      school: device.school, name: device.name, brand: device.brand,
      model: device.model || '', serial_number: device.serial_number || '',
      ip_address: device.ip_address, port: device.port,
      username: device.username || 'admin', location: device.location || '',
    } : { port: 80, username: 'admin', brand: 'hikvision' }
  })
  const [saving, setSaving] = useState(false)

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      if (isEdit) {
        if (!data.password) delete data.password
        await devicesAPI.updateDevice(device.id, data)
        toast.success('Qurilma yangilandi')
      } else {
        await devicesAPI.createDevice(data)
        toast.success("Qurilma qo'shildi")
      }
      onSaved(); onClose()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.detail || (typeof err === 'object' ? Object.values(err).flat().join(', ') : 'Xatolik'))
    } finally { setSaving(false) }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} type="button">Bekor qilish</Button>
      <Button type="submit" form="device-form" loading={saving}>{isEdit ? 'Saqlash' : "Qo'shish"}</Button>
    </>
  )

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Qurilmani tahrirlash' : "Yangi qurilma qo'shish"} footer={footer}>
      <form id="device-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Maktab *</label>
          <select {...register('school', { required: true })} style={{ ...formInputStyle, appearance: 'none' }}>
            <option value="">— Maktabni tanlang —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.school && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4 }}>Maktab majburiy</p>}
        </div>
        <div>
          <label style={labelStyle}>Qurilma nomi *</label>
          <input {...register('name', { required: true })} placeholder="Asosiy kirish Face ID" style={formInputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Brend *</label>
            <select {...register('brand')} style={{ ...formInputStyle, appearance: 'none' }}>
              <option value="hikvision">Hikvision</option>
              <option value="dahua">Dahua</option>
              <option value="zkteco">ZKTeco</option>
              <option value="anviz">Anviz</option>
              <option value="other">Boshqa</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input {...register('model')} placeholder="DS-K1T671TM" style={formInputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>IP manzil *</label>
            <input {...register('ip_address', { required: true })} placeholder="192.168.1.100" style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Port</label>
            <input {...register('port')} type="number" style={formInputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Login</label>
            <input {...register('username')} placeholder="admin" style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Parol {isEdit ? "(o'zgartirish uchun)" : '*'}</label>
            <input {...register('password', { required: !isEdit })} type="password" style={formInputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Seriya raqami</label>
          <input {...register('serial_number')} placeholder="DS2024XXXXX" style={formInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Joylashuv</label>
          <input {...register('location')} placeholder="Asosiy kirish, Orqa eshik..." style={formInputStyle} />
        </div>
      </form>
    </Modal>
  )
}

export default function DevicesPage() {
  const [devices, setDevices] = useState([])
  const [schools, setSchools] = useState([])
  const [regions, setRegions] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editDevice, setEditDevice] = useState(null)
  const [logsDevice, setLogsDevice] = useState(null)
  const [deleteDevice, setDeleteDevice] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [syncingIds, setSyncingIds] = useState(new Set())
  const [pullingIds, setPullingIds] = useState(new Set())
  const [filterRegion, setFilterRegion] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterSchool, setFilterSchool] = useState('')

  useEffect(() => {
    orgAPI.getRegions({ page_size: 200 }).then(({ data }) => setRegions(data.results || data)).catch(() => {})
    orgAPI.getSchools({ page_size: 500 }).then(({ data }) => setSchools(data.results || data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (filterRegion) {
      orgAPI.getDistricts({ region: filterRegion, page_size: 200 })
        .then(({ data }) => setDistricts(data.results || data)).catch(() => {})
      setFilterDistrict(''); setFilterSchool('')
    } else {
      setDistricts([]); setFilterDistrict(''); setFilterSchool('')
    }
  }, [filterRegion])

  const filteredSchools = filterDistrict
    ? schools.filter(s => String(s.district) === String(filterDistrict))
    : filterRegion
    ? schools.filter(s => {
        const d = districts.find(d => String(d.id) === String(s.district))
        return d && String(d.region) === String(filterRegion)
      })
    : schools

  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterSchool) params.school = filterSchool
      else if (filterDistrict) {
        const ids = schools.filter(s => String(s.district) === String(filterDistrict)).map(s => s.id)
        if (ids.length) params.school__in = ids.join(',')
      }
      const { data } = await devicesAPI.getDevices(params)
      setDevices(data.results || data)
    } catch { toast.error('Qurilmalar yuklanmadi') }
    finally { setLoading(false) }
  }, [filterSchool, filterDistrict, schools])

  useEffect(() => { loadDevices() }, [loadDevices])

  const handleRefresh = async (id) => {
    try {
      const { data } = await devicesAPI.getDeviceStatus(id)
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: data.status, last_seen: data.online ? new Date().toISOString() : d.last_seen } : d))
      toast.success(`Holat: ${data.status}`)
    } catch { toast.error('Holat olishda xatolik') }
  }

  const handleSync = async (id) => {
    setSyncingIds(prev => new Set(prev).add(id))
    try { await devicesAPI.syncStudents(id); toast.success("O'quvchilar yuklanmoqda...") }
    catch { toast.error('Sinxronizatsiya xatoligi') }
    finally { setSyncingIds(prev => { const s = new Set(prev); s.delete(id); return s }) }
  }

  const handlePullLogs = async (id) => {
    setPullingIds(prev => new Set(prev).add(id))
    try { await devicesAPI.pullLogs(id); toast.success('Loglar olinmoqda...') }
    catch { toast.error('Log olishda xatolik') }
    finally { setPullingIds(prev => { const s = new Set(prev); s.delete(id); return s }) }
  }

  const handleDelete = async () => {
    if (!deleteDevice) return
    setDeleting(true)
    try {
      await devicesAPI.deleteDevice(deleteDevice.id)
      toast.success("Qurilma o'chirildi")
      setDeleteDevice(null)
      loadDevices()
    } catch { toast.error("O'chirishda xatolik") }
    finally { setDeleting(false) }
  }

  const online = devices.filter(d => d.status === 'online').length
  const offline = devices.filter(d => d.status === 'offline').length
  const errors = devices.filter(d => d.status === 'error').length

  const selectStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
    fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', appearance: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Qurilmalar</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Face ID va davomad qurilmalarini boshqarish</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditDevice(null); setShowForm(true) }}>Qurilma qo'shish</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Jami', value: devices.length, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: 'Online', value: online, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Offline', value: offline, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: 'Xatolik', value: errors, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color }}>{value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.75, marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Cascade filters */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtr</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Viloyat', value: filterRegion, onChange: e => setFilterRegion(e.target.value), disabled: false, options: regions.map(r => ({ value: r.id, label: r.name })), placeholder: 'Barcha viloyatlar' },
            { label: 'Tuman', value: filterDistrict, onChange: e => setFilterDistrict(e.target.value), disabled: !filterRegion, options: districts.map(d => ({ value: d.id, label: d.name })), placeholder: 'Barcha tumanlar' },
            { label: 'Maktab', value: filterSchool, onChange: e => setFilterSchool(e.target.value), disabled: false, options: filteredSchools.map(s => ({ value: s.id, label: s.name })), placeholder: 'Barcha maktablar' },
          ].map(({ label, value, onChange, disabled, options, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>{label}</label>
              <select value={value} onChange={onChange} disabled={disabled} style={{ ...selectStyle, opacity: disabled ? 0.5 : 1 }}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Device grid */}
      {loading ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : devices.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={Monitor} title="Qurilmalar topilmadi"
            description="Yangi qurilma qo'shish uchun yuqoridagi tugmani bosing"
            action={<Button onClick={() => setShowForm(true)} icon={Plus}>Qurilma qo'shish</Button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onSync={handleSync}
              onPullLogs={handlePullLogs}
              onRefresh={handleRefresh}
              onEdit={d => { setEditDevice(d); setShowForm(true) }}
              onDelete={d => setDeleteDevice(d)}
              onLogs={d => setLogsDevice(d)}
              syncing={syncingIds.has(device.id)}
              pulling={pullingIds.has(device.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <DeviceFormModal
          device={editDevice}
          schools={schools}
          onClose={() => { setShowForm(false); setEditDevice(null) }}
          onSaved={loadDevices}
        />
      )}
      {logsDevice && <SyncLogsModal device={logsDevice} onClose={() => setLogsDevice(null)} />}
      {deleteDevice && (
        <ConfirmModal
          isOpen
          title="Qurilmani o'chirish"
          message={`"${deleteDevice.name}" qurilmasini o'chirishni tasdiqlaysizmi? Bu amalni bekor qilib bo'lmaydi.`}
          confirmLabel="O'chirish"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteDevice(null)}
        />
      )}
    </div>
  )
}
