import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, DoorOpen, Power, Clock, Trash2, AlertTriangle, Search, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Modal, ConfirmModal } from '../ui/Modal'
import { routersAPI, terminalsAPI } from '../../api/routers'
import { camerasAPI } from '../../api/cameras'

// Face ID terminal / qurilma qidirish / kamera kadri — superadmin panel (asosiy saytdagi
// components/devices/* bilan bir xil funksiya, bu panelning UI kit'i va yorug' mavzusida).

const inputStyle = {
  width: '100%', padding: '8px 11px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const cardStyle = { background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10 }

async function errorMessage(e, fallback) {
  const data = e?.response?.data
  if (data instanceof Blob) {
    try { const j = JSON.parse(await data.text()); if (j?.error) return j.error } catch { /* JSON emas */ }
  }
  return data?.error || data?.detail || e?.message || fallback
}

function InfoCell({ label, value, mono }) {
  return (
    <div style={{ background: 'white', border: '1px solid #F1F5F9', borderRadius: 9, padding: '7px 10px', minWidth: 0 }}>
      <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 12.5, color: '#0F172A', fontFamily: mono ? 'monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ?? '—'}</p>
    </div>
  )
}

function ErrorBox({ text }) {
  if (!text) return null
  return (
    <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 12px' }}>
      <AlertTriangle style={{ width: 15, height: 15, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 12, color: '#991B1B' }}>{text}</p>
    </div>
  )
}

// ─── Terminal: holat va boshqaruv ───
function StatusTab({ terminal, t }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [confirmReboot, setConfirmReboot] = useState(false)
  const [unmatched, setUnmatched] = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const { data } = await terminalsAPI.status(terminal.id); setStatus(data) }
    catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))); setStatus(null) }
    setLoading(false)
    terminalsAPI.unmatchedEvents(terminal.id).then(({ data }) => setUnmatched(data)).catch(() => {})
  }, [terminal.id, t])

  useEffect(() => { load() }, [load])

  const run = async (key, fn, ok) => {
    setBusy(key)
    try { const { data } = await fn(); toast.success(typeof ok === 'function' ? ok(data) : ok) }
    catch (e) { toast.error(await errorMessage(e, t('common.errorGeneric'))) }
    setBusy('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, color: '#64748B', fontSize: 12.5 }}>
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.75s linear infinite' }} />{t('devices.manage.connecting')}
        </div>
      ) : status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <InfoCell label={t('devices.manage.model')} value={status.model} />
          <InfoCell label={t('devices.manage.serial')} value={status.serialNumber} mono />
          <InfoCell label={t('devices.manage.firmware')} value={status.firmwareVersion} />
          <InfoCell label={t('devices.manage.users')} value={status.users} />
          <InfoCell label={t('devices.manage.usersWithFace')} value={status.usersWithFace} />
          <InfoCell label={t('devices.manage.reachableAt')} value={status.reachableAt?.replace('http://', '')} mono />
          <InfoCell label={t('devices.manage.deviceTime')} value={status.deviceTime ? new Date(status.deviceTime).toLocaleString() : null} />
          <InfoCell label={t('devices.manage.timeDrift')} value={status.timeDriftSeconds == null ? null : t('devices.manage.seconds', { count: status.timeDriftSeconds })} />
          <InfoCell label={t('devices.manage.lastEvent')} value={status.lastEventSerial != null ? `#${status.lastEventSerial}` : null} mono />
        </div>
      )}
      <ErrorBox text={error} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" variant="secondary" icon={RefreshCw} loading={loading} onClick={load}>{t('devices.manage.refresh')}</Button>
        <Button size="sm" variant="success" icon={DoorOpen} loading={busy === 'door'} disabled={!!busy}
          onClick={() => run('door', () => terminalsAPI.door(terminal.id), t('devices.manage.doorOpened'))}>{t('devices.manage.openDoor')}</Button>
        <Button size="sm" variant="outline" icon={Clock} loading={busy === 'time'} disabled={!!busy}
          onClick={() => run('time', () => terminalsAPI.syncTime(terminal.id), d => d.status === 'updated' ? t('devices.manage.timeUpdated', { count: d.driftSeconds }) : t('devices.manage.timeUnchanged', { count: d.driftSeconds }))}>{t('devices.manage.syncTime')}</Button>
        <Button size="sm" variant="warning" icon={Power} loading={busy === 'reboot'} disabled={!!busy} onClick={() => setConfirmReboot(true)}>{t('devices.manage.reboot')}</Button>
      </div>
      {unmatched.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle style={{ width: 13, height: 13, color: '#D97706' }} />
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706' }}>{t('devices.manage.unmatchedTitle')}</p>
          </div>
          <p style={{ fontSize: 10.5, color: '#92400E' }}>{t('devices.manage.unmatchedHint')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
            {unmatched.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10.5, background: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 8px' }}>
                <span style={{ fontFamily: 'monospace' }}>{u.employeeNo || '—'}</span>
                <span style={{ color: '#92400E' }}>{u.reason === 'AMBIGUOUS_STUDENT' ? t('devices.manage.unmatchedReasonAmbiguous') : t('devices.manage.unmatchedReasonUnknown')}</span>
                <span style={{ color: '#92400E' }}>{new Date(u.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {confirmReboot && (
        <ConfirmModal isOpen variant="danger" title={t('devices.manage.rebootConfirmTitle')} message={t('devices.manage.rebootConfirmMessage')}
          confirmLabel={t('devices.manage.reboot')}
          onCancel={() => setConfirmReboot(false)}
          onConfirm={() => { setConfirmReboot(false); run('reboot', () => terminalsAPI.reboot(terminal.id), t('devices.manage.rebooting')) }} />
      )}
    </div>
  )
}

// ─── Terminal: qurilmadagi foydalanuvchilar ───
function UsersTab({ terminal, t }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [delTarget, setDelTarget] = useState(null)

  const loadPage = useCallback(async (offset, append) => {
    setLoading(true); setError('')
    try {
      const { data } = await terminalsAPI.users(terminal.id, offset, 30)
      setRows(prev => append ? [...prev, ...data.users] : data.users)
      setTotal(data.total)
    } catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))) }
    setLoading(false)
  }, [terminal.id, t])

  useEffect(() => { loadPage(0, false) }, [loadPage])

  const remove = async () => {
    const emp = delTarget; setDelTarget(null)
    try { await terminalsAPI.deleteUser(terminal.id, emp); loadPage(0, false) }
    catch (e) { toast.error(await errorMessage(e, t('common.errorGeneric'))) }
  }

  const strangers = rows.filter(r => !r.matched).length
  const pill = (bg, color) => ({ fontSize: 10.5, fontWeight: 700, background: bg, color, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12.5, color: '#475569' }}>
          {t('devices.manage.usersTotal', { count: total })}
          {strangers > 0 && <span style={{ color: '#D97706' }}> · {t('devices.manage.strangers', { count: strangers })}</span>}
        </p>
        <Button size="xs" variant="secondary" icon={RefreshCw} loading={loading} onClick={() => loadPage(0, false)} />
      </div>
      <ErrorBox text={error} />
      {rows.length === 0 && !loading ? (
        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#94A3B8', padding: 16 }}>{t('devices.manage.noUsers')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {rows.map(u => (
            <div key={u.employeeNo} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.studentName || u.deviceName || '—'}</p>
                <p style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>{u.employeeNo}</p>
              </div>
              <span style={u.faces > 0 ? pill('#FDF2F8', '#DB2777') : pill('#F1F5F9', '#64748B')}>{u.faces > 0 ? t('devices.manage.hasFace') : t('devices.manage.noFace')}</span>
              <span style={u.matched ? pill('#ECFDF5', '#059669') : pill('#FFFBEB', '#D97706')}>{u.matched ? t('devices.manage.matched') : t('devices.manage.stranger')}</span>
              <button onClick={() => setDelTarget(u.employeeNo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }} title={t('common.delete')}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}
      {rows.length < total && <Button size="sm" variant="ghost" loading={loading} onClick={() => loadPage(rows.length, true)}>{t('devices.manage.loadMore')}</Button>}
      {delTarget && (
        <ConfirmModal isOpen variant="danger" title={t('devices.manage.deleteUserTitle')} message={t('devices.manage.deleteUserMessage', { id: delTarget })}
          confirmLabel={t('common.delete')} onCancel={() => setDelTarget(null)} onConfirm={remove} />
      )}
    </div>
  )
}

// ─── Terminal: yuzlarni ommaviy yuklash ───
function FacesTab({ terminal, t }) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  const start = async () => {
    setError('')
    try {
      const { data } = await terminalsAPI.syncFaces(terminal.id)
      setJob(data)
      clearInterval(timer.current)
      timer.current = setInterval(async () => {
        try {
          const { data: j } = await terminalsAPI.syncFacesStatus(terminal.id, data.jobId)
          setJob(j)
          if (j.finished) clearInterval(timer.current)
        } catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))); clearInterval(timer.current) }
      }, 1500)
    } catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))) }
  }

  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>{t('devices.manage.facesHint')}</p>
      <div><Button size="sm" loading={job && !job.finished} onClick={start}>{job && !job.finished ? t('devices.manage.syncRunning') : t('devices.manage.syncAll')}</Button></div>
      <ErrorBox text={error} />
      {job && (
        <div style={{ ...cardStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: '#334155' }}>{t('devices.manage.progress', { done: job.done, total: job.total })}</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>{t('devices.manage.succeeded', { count: job.success })}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#10B981', transition: 'width 0.3s' }} />
          </div>
          {job.abortReason && <p style={{ fontSize: 12, color: '#DC2626' }}>{t('devices.manage.aborted')}: {job.abortReason}</p>}
          {job.finished && !job.abortReason && <p style={{ fontSize: 12, color: '#475569' }}>{t('devices.manage.finished', { ok: job.success, failed: job.failed })}</p>}
          {job.errors?.length > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{t('devices.manage.errorsTitle')}</p>
              {job.errors.map((e, i) => (
                <p key={i} style={{ fontSize: 11.5, background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 7, padding: '5px 8px' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{e.fullName}</span> — <span style={{ color: '#B91C1C' }}>{e.error}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Terminal: voqealarni qayta tiklash ───
function EventsTab({ terminal, t }) {
  const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return toLocal(d) })
  const [to, setTo] = useState(() => toLocal(new Date()))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true); setError(''); setResult(null)
    try { const { data } = await terminalsAPI.backfill(terminal.id, new Date(from).toISOString(), new Date(to).toISOString()); setResult(data) }
    catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))) }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>{t('devices.manage.eventsHint')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ fontSize: 12, color: '#475569' }}>{t('devices.manage.from')}<input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: '#475569' }}>{t('devices.manage.to')}<input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label>
      </div>
      <div><Button size="sm" loading={busy} onClick={run}>{busy ? t('devices.manage.backfillRunning') : t('devices.manage.backfill')}</Button></div>
      <ErrorBox text={error} />
      {result && <p style={{ fontSize: 12.5, color: '#059669' }}>{t('devices.manage.backfillResult', { read: result.read, recorded: result.recorded })}</p>}
    </div>
  )
}

export function TerminalManagerModal({ terminal, onClose, t }) {
  const [tab, setTab] = useState('status')
  const supported = (terminal.brand || '').trim().toLowerCase() === 'hikvision'
  const tabs = [['status', t('devices.manage.tabStatus')], ['users', t('devices.manage.tabUsers')], ['faces', t('devices.manage.tabFaces')], ['events', t('devices.manage.tabEvents')]]

  return (
    <Modal isOpen onClose={onClose} size="lg" title={`${terminal.name} — ${[terminal.brand, terminal.model, terminal.ipAddress].filter(Boolean).join(' · ')}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {terminal.lastError && (
          <div style={{ display: 'flex', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, padding: '9px 12px' }}>
            <AlertTriangle style={{ width: 15, height: 15, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706' }}>{t('devices.manage.lastError')}</p>
              <p style={{ fontSize: 11.5, color: '#92400E', marginTop: 2 }}>{terminal.lastError}</p>
            </div>
          </div>
        )}
        {!supported ? (
          <p style={{ fontSize: 13, color: '#64748B' }}>{t('devices.manage.unsupported')}</p>
        ) : <>
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: tab === id ? 'white' : 'transparent', color: tab === id ? '#4F46E5' : '#64748B',
                boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{label}</button>
            ))}
          </div>
          {tab === 'status' && <StatusTab terminal={terminal} t={t} />}
          {tab === 'users' && <UsersTab terminal={terminal} t={t} />}
          {tab === 'faces' && <FacesTab terminal={terminal} t={t} />}
          {tab === 'events' && <EventsTab terminal={terminal} t={t} />}
        </>}
      </div>
    </Modal>
  )
}

// ─── Router ortidagi qurilmalarni qidirish ───
const CATEGORY_COLORS = {
  faceTerminal: ['#F5F3FF', '#7C3AED'], camera: ['#ECFEFF', '#0891B2'], recorder: ['#EFF6FF', '#2563EB'],
  router: ['#F1F5F9', '#475569'], unknown: ['#F8FAFC', '#64748B'],
}

export function DiscoveryPanel({ router, t, onAddTerminal }) {
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [camDraft, setCamDraft] = useState(null)
  const [savingCam, setSavingCam] = useState(false)

  const scan = async () => {
    setScanning(true); setError(''); setResult(null)
    try { const { data } = await routersAPI.discover(router.id, creds.username ? creds : {}); setResult(data) }
    catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))) }
    setScanning(false)
  }

  const addTerminal = (d) => onAddTerminal({
    name: d.model ? `${d.model} (${d.lanIp})` : d.lanIp,
    brand: d.vendor === 'hikvision' ? 'Hikvision' : '',
    model: d.model || '', serialNumber: d.serialNumber || '', ipAddress: d.lanIp,
    port: d.httpsOnly ? 443 : (d.openPorts.includes(80) ? 80 : ''),
    useHttps: !!d.httpsOnly,
    deviceUsername: creds.username || '', devicePassword: creds.password || '',
  })

  const saveCamera = async () => {
    if (!camDraft?.name?.trim()) return
    setSavingCam(true)
    try {
      const d = camDraft.device
      await camerasAPI.createCamera({
        name: camDraft.name.trim(), schoolId: router.schoolId, ipAddress: d.lanIp,
        brand: d.vendor === 'hikvision' ? 'Hikvision' : null, model: d.model, serialNumber: d.serialNumber,
        port: d.httpsOnly ? 443 : (d.openPorts.includes(80) ? 80 : null), useHttps: !!d.httpsOnly,
        rtspPort: d.openPorts.includes(554) ? 554 : null, streamChannel: '101',
        deviceUsername: creds.username || null, devicePassword: creds.password || null, status: 'OFFLINE',
      })
      toast.success(t('cameras.list.toast.created'))
      setCamDraft(null)
      scan()
    } catch (e) { toast.error(await errorMessage(e, t('common.errorGeneric'))) }
    setSavingCam(false)
  }

  return (
    <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search style={{ width: 16, height: 16, color: '#7C3AED' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6D28D9' }}>{t('devices.discovery.title')}</p>
      </div>
      <p style={{ fontSize: 12, color: '#6B5B8A' }}>{t('devices.discovery.hint')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
        <input value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} placeholder={t('devices.discovery.username')} style={inputStyle} autoComplete="off" />
        <input type="password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} placeholder={t('devices.discovery.password')} style={inputStyle} autoComplete="new-password" />
        <Button size="md" loading={scanning} onClick={scan} style={{ background: '#7C3AED' }}>{scanning ? t('devices.discovery.scanning') : t('devices.discovery.scanBtn')}</Button>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8' }}>{t('devices.discovery.loginHint')}</p>
      <ErrorBox text={error} />
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 12, color: '#475569' }}>
            {t('devices.discovery.found', { count: result.devices.length })} · <span style={{ fontFamily: 'monospace' }}>{result.lanSubnet}</span>
            {!result.routerOnline && <span style={{ color: '#D97706' }}> · {t('devices.discovery.routerOffline')}</span>}
            {result.timedOut && <span style={{ color: '#D97706' }}> · {t('devices.discovery.timedOut')}</span>}
          </p>
          {result.devices.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 12.5, color: '#94A3B8', padding: 12 }}>{t('devices.discovery.none')}</p>
          ) : result.devices.map(d => {
            const [bg, color] = CATEGORY_COLORS[d.category] || CATEGORY_COLORS.unknown
            const registered = d.registeredTerminalId || d.registeredCameraId
            return (
              <div key={d.lanIp} style={{ background: 'white', border: '1px solid #EDE9FE', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#0F172A', minWidth: 110 }}>{d.lanIp}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, background: bg, color, borderRadius: 999, padding: '2px 8px' }}>{t(`devices.discovery.category.${d.category}`)}</span>
                  <span style={{ fontSize: 12, color: '#475569', textTransform: 'capitalize' }}>{d.vendor}</span>
                  {d.model && <span style={{ fontSize: 12, color: '#64748B' }}>{d.model}</span>}
                  <span style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>{d.openPorts.join(', ')}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {registered ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', borderRadius: 7, padding: '3px 8px' }}>{t('devices.discovery.registered')}</span>
                    ) : d.category !== 'router' && <>
                      <Button size="xs" variant="outline" onClick={() => addTerminal(d)}>{t('devices.discovery.addTerminal')}</Button>
                      <Button size="xs" variant="secondary" onClick={() => setCamDraft({ device: d, name: d.model ? `${d.model} (${d.lanIp})` : d.lanIp })}>{t('devices.discovery.addCamera')}</Button>
                    </>}
                  </div>
                </div>
                {d.loginError && <p style={{ fontSize: 11, color: '#D97706', marginTop: 5 }}>{d.loginError}</p>}
                {camDraft?.device.lanIp === d.lanIp && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input value={camDraft.name} onChange={e => setCamDraft({ ...camDraft, name: e.target.value })} placeholder={t('devices.discovery.cameraName')} style={{ ...inputStyle, flex: 1 }} />
                    <Button size="sm" loading={savingCam} disabled={!camDraft.name.trim()} onClick={saveCamera}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCamDraft(null)}>{t('common.cancel')}</Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Kamera: joriy kadr, tekshirish, RTSP ───
export function CameraLivePanel({ camera, t }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [takenAt, setTakenAt] = useState(null)
  const [stream, setStream] = useState(null)
  const [checking, setChecking] = useState(false)
  const current = useRef(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await camerasAPI.getSnapshot(camera.id)
      const next = URL.createObjectURL(data)
      if (current.current) URL.revokeObjectURL(current.current)
      current.current = next
      setUrl(next); setTakenAt(new Date())
    } catch (e) { setError(await errorMessage(e, t('common.errorGeneric'))) }
    setLoading(false)
  }, [camera.id, t])

  useEffect(() => { load(); return () => { if (current.current) URL.revokeObjectURL(current.current) } }, [load])

  const check = async () => {
    setChecking(true)
    try { const { data } = await camerasAPI.check(camera.id); toast.success(t('cameras.device.checkOk', { model: data.model || '—' })) }
    catch (e) { toast.error(await errorMessage(e, t('common.errorGeneric'))) }
    setChecking(false)
  }
  const loadStream = async () => {
    try { const { data } = await camerasAPI.getStream(camera.id); setStream(data) }
    catch (e) { toast.error(await errorMessage(e, t('common.errorGeneric'))) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#0F172A', borderRadius: 12, overflow: 'hidden' }}>
        {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        {!url && (loading
          ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 style={{ width: 22, height: 22, color: '#CBD5E1', animation: 'spin 0.75s linear infinite' }} /></div>
          : error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', color: '#FCA5A5', fontSize: 12.5 }}>{error}</div>)}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
          <span style={{ fontSize: 11, color: '#E2E8F0' }}>{takenAt ? t('cameras.device.snapshotAt', { time: takenAt.toLocaleTimeString() }) : ''}</span>
          <Button size="xs" variant="secondary" loading={loading} onClick={load}>{t('cameras.device.refreshSnapshot')}</Button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#475569' }}>{[camera.brand, camera.model].filter(Boolean).join(' ') || '—'}{camera.serialNumber ? ` · SN: ${camera.serialNumber}` : ''}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button size="xs" variant="success" loading={checking} onClick={check}>{t('cameras.device.checkBtn')}</Button>
          <Button size="xs" variant="secondary" onClick={loadStream}>{t('cameras.device.rtspBtn')}</Button>
        </div>
      </div>
      {camera.lastError && <p style={{ fontSize: 12, color: '#D97706' }}>{camera.lastError}</p>}
      {stream && (
        <div style={{ ...cardStyle, padding: 10 }}>
          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>{t('cameras.device.rtspHint')}</p>
          <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#0F172A', wordBreak: 'break-all', userSelect: 'all' }}>{stream.lanRtspUrl}</p>
        </div>
      )}
    </div>
  )
}
