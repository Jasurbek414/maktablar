import { useState, useEffect, useCallback } from 'react'
import {
  Router, Plus, RefreshCw, Wifi, WifiOff, Loader2, Trash2, ArrowDownCircle,
  ArrowUpCircle, Download, Code2, Copy, Check, AlertTriangle, Key, Pencil, ArrowLeftRight, Search,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { routersAPI } from '../../api/routers'
import { orgAPI } from '../../api/organizations'
import { TerminalManagerModal, DiscoveryPanel } from '../../components/devices/DeviceManagement'
import toast from 'react-hot-toast'

const LOCALE_MAP = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

const STATUS_CFG = {
  ONLINE:  { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  OFFLINE: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', dot: '#94A3B8' },
  ERROR:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
}

function StatusChip({ status, t }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.OFFLINE
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {t(`devices.status.${status}`, { defaultValue: status })}
    </span>
  )
}

function timeAgo(iso, t) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso.includes('Z') ? iso : iso + 'Z')) / 1000)
  if (d < 60) return t('devices.timeAgo.justNow')
  if (d < 3600) return t('devices.timeAgo.minutes', { count: Math.floor(d / 60) })
  if (d < 86400) return t('devices.timeAgo.hours', { count: Math.floor(d / 3600) })
  return t('devices.timeAgo.days', { count: Math.floor(d / 86400) })
}

function RouterCard({ router, onOpen, onDelete }) {
  const { t } = useTranslation()
  return (
    <div
      onClick={() => onOpen(router)}
      style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: STATUS_CFG[router.status]?.bg || '#F8FAFC',
            border: `1px solid ${STATUS_CFG[router.status]?.border || '#E2E8F0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Router style={{ width: 20, height: 20, color: STATUS_CFG[router.status]?.color || '#64748B' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{router.name}</p>
            <p style={{ fontSize: 11.5, color: '#94A3B8', fontFamily: 'monospace' }}>VPN: {router.vpnIp || '—'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusChip status={router.status} t={t} />
          <IconButton icon={Trash2} size="xs" variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete(router) }}
            style={{ color: '#94A3B8' }} tooltip={t('common.delete')} />
        </div>
      </div>

      <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8' }}>
        <span>{router.schoolName}</span>
        <span>{timeAgo(router.lastHeartbeat, t)}</span>
      </div>

      <div style={{ padding: '0 18px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { icon: ArrowDownCircle, label: t('devices.card.entrance'), value: router.entranceTerminals || 0, color: '#0891B2' },
          { icon: ArrowUpCircle, label: t('devices.card.exit'), value: router.exitTerminals || 0, color: '#EA580C' },
          { icon: null, label: t('devices.card.total'), value: router.faceTerminalCount || 0, color: '#475569' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: '#F8FAFC', borderRadius: 9, padding: '7px 6px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
              {Icon && <Icon style={{ width: 11, height: 11, color }} />}
              <span style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectionPanel({ router, t, onChanged }) {
  const [script, setScript] = useState(null)
  const [showScript, setShowScript] = useState(false)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pendingTransport, setPendingTransport] = useState(null)
  const [switching, setSwitching] = useState(false)

  const transport = router.transport || 'WIREGUARD'
  const isOvpn = transport === 'OPENVPN'

  // Transport almashganda boshqa transport uchun olingan skript ko'rsatilib qolmasligi kerak
  useEffect(() => { setScript(null); setShowScript(false); setPendingTransport(null) }, [router.id, transport])

  const changeTransport = async () => {
    if (!pendingTransport) return
    setSwitching(true)
    try {
      const { data } = await routersAPI.updateRouter(router.id, { transport: pendingTransport })
      setPendingTransport(null)
      onChanged?.(data)
    } catch { toast.error(t('devices.network.switchError')) }
    setSwitching(false)
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  const toggleScript = async () => {
    if (showScript) { setShowScript(false); return }
    if (script) { setShowScript(true); return }
    setScriptLoading(true)
    try {
      const { data } = await routersAPI.getScript(router.id)
      setScript(data.script)
      setShowScript(true)
    } catch { toast.error(t('devices.network.loadError')) }
    setScriptLoading(false)
  }

  const downloadConf = async () => {
    setDownloading(true)
    try {
      const { data } = await routersAPI.getWgConfig(router.id)
      const blob = new Blob([data.config], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(router.name || 'router').replace(/\s+/g, '-')}.conf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { toast.error(t('devices.network.loadError')) }
    setDownloading(false)
  }

  const serverConfigured = !!router.wgServerConfigured

  return (
    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Wifi style={{ width: 16, height: 16, color: '#1D4ED8' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>{t('devices.network.title')}</p>
      </div>

      <div style={{ background: 'white', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{t('devices.network.transportLabel')}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['WIREGUARD', 'OPENVPN'].map(tp => {
            const active = tp === transport
            return (
              <button key={tp} type="button" disabled={switching}
                onClick={() => !active && setPendingTransport(tp)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: active ? 'default' : 'pointer',
                  border: active ? '1px solid #1D4ED8' : '1px solid #CBD5E1',
                  background: active ? '#1D4ED8' : 'white', color: active ? 'white' : '#334155',
                }}>
                {tp === 'WIREGUARD' ? t('devices.network.transportWireguard') : t('devices.network.transportOpenvpn')}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>{t('devices.network.transportHint')}</p>
        {pendingTransport && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, padding: '10px 12px', marginTop: 8 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706' }}>{t('devices.network.switchConfirmTitle')}</p>
            <p style={{ fontSize: 10.5, color: '#92400E', marginTop: 2 }}>{t('devices.network.switchConfirmNote')}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Button size="sm" loading={switching} onClick={changeTransport}>{t('devices.network.switchConfirmBtn')}</Button>
              <Button size="sm" variant="secondary" disabled={switching} onClick={() => setPendingTransport(null)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'white', borderRadius: 9, padding: '8px 12px' }}>
          <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t('devices.network.vpnIp')}</p>
          <p style={{ fontSize: 12.5, color: '#1D4ED8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{router.vpnIp || '—'}</p>
        </div>
        {isOvpn ? (
          <div style={{ background: 'white', borderRadius: 9, padding: '8px 12px' }}>
            <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t('devices.network.ovpnLogin')}</p>
            <p style={{ fontSize: 12.5, color: '#1D4ED8', fontFamily: 'monospace' }}>router{router.id}</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 9, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t('devices.network.publicKey')}</p>
              <p style={{ fontSize: 12.5, color: '#1D4ED8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{router.wgPublicKey || '—'}</p>
            </div>
            {router.wgPublicKey && (
              <button onClick={() => copy(router.wgPublicKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
                {copied ? <Check style={{ width: 14, height: 14, color: '#059669' }} /> : <Copy style={{ width: 14, height: 14 }} />}
              </button>
            )}
          </div>
        )}
      </div>

      {!serverConfigured && (
        <div style={{ display: 'flex', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
          <AlertTriangle style={{ width: 15, height: 15, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706' }}>{t('devices.network.serverNotConfiguredTitle')}</p>
            <p style={{ fontSize: 10.5, color: '#92400E', marginTop: 2 }}>{t('devices.network.serverNotConfiguredNote')}</p>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 9, padding: '8px 12px', marginBottom: 12 }}>
        <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t('devices.network.lanSubnet')}</p>
        <p style={{ fontSize: 12.5, color: '#1D4ED8', fontFamily: 'monospace' }}>{router.lanSubnet || '—'} <span style={{ color: '#94A3B8' }}>→ {router.mappedSubnet || '—'}</span></p>
      </div>

      <div style={{ background: 'white', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', marginBottom: 6 }}>{t('devices.network.setupTitle')}</p>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#3B5680', lineHeight: 1.5 }}>
          <li>{t('devices.network.step1')}</li>
          <li>{t('devices.network.step2')}</li>
          <li>{t('devices.network.step3')}</li>
        </ol>
        <p style={{ fontSize: 11, color: '#B45309', marginTop: 6 }}>{t('devices.network.ros7Note')}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" icon={Code2} loading={scriptLoading} onClick={toggleScript}>
          {showScript ? t('devices.network.hideScriptBtn') : t('devices.network.showScriptBtn')}
        </Button>
        {!isOvpn && (
          <Button size="sm" variant="secondary" icon={Download} loading={downloading} onClick={downloadConf}>
            {t('devices.network.downloadConfBtn')}
          </Button>
        )}
      </div>

      {showScript && script && (
        <div style={{ position: 'relative', marginTop: 12 }}>
          <pre style={{
            fontSize: 10.5, color: '#334155', background: '#0F172A', borderRadius: 9,
            padding: '12px 36px 12px 12px', overflowX: 'auto', whiteSpace: 'pre-wrap',
            fontFamily: 'monospace', color: '#CBD5E1', margin: 0,
          }}>{script}</pre>
          <button onClick={() => copy(script)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', color: '#CBD5E1' }}>
            {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
          </button>
        </div>
      )}
    </div>
  )
}

const formInputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

function TerminalFormModal({ routerId, terminal, prefill, onClose, onSaved, t }) {
  const isEdit = !!terminal
  // devicePassword doim bo'sh boshlanadi — backend uni qaytarmaydi (hasDevicePassword); tahrirda
  // bo'sh qoldirilsa eski parol saqlanadi (RouterController#updateTerminal).
  const [form, setForm] = useState(terminal
    ? { name: terminal.name || '', direction: terminal.direction || 'ENTRANCE', brand: terminal.brand || '', model: terminal.model || '', serialNumber: terminal.serialNumber || '', macAddress: terminal.macAddress || '', ipAddress: terminal.ipAddress || '', port: terminal.port || '', useHttps: !!terminal.useHttps, deviceUsername: terminal.deviceUsername || '', devicePassword: '', notes: terminal.notes || '' }
    : { name: '', direction: 'ENTRANCE', brand: '', model: '', serialNumber: '', macAddress: '', ipAddress: '', port: '', useHttps: false, deviceUsername: '', devicePassword: '', notes: '', ...(prefill || {}) })
  const [saving, setSaving] = useState(false)
  const [lanHosts, setLanHosts] = useState(null)
  const [lanHostsLoading, setLanHostsLoading] = useState(false)
  const [lanHostsError, setLanHostsError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Routerning o'z ARP/DHCP jadvalidan haqiqiy ulangan qurilmalarni yuklaydi — IP maydonini
  // qo'lda kiritish o'rniga tanlab qo'yish uchun (2026-09-16 so'ralgan).
  const loadLanHosts = async () => {
    setLanHostsLoading(true); setLanHostsError('')
    try {
      const { data } = await routersAPI.getLanHosts(routerId)
      setLanHosts(data.hosts || [])
    } catch (e) {
      setLanHosts(null)
      setLanHostsError(e.response?.data?.error || t('common.errorGeneric'))
    }
    setLanHostsLoading(false)
  }

  const submit = async () => {
    if (!form.name.trim()) { toast.error(t('devices.form.nameRequired')); return }
    setSaving(true)
    try {
      if (isEdit) {
        await routersAPI.updateTerminal(terminal.id, form)
      } else {
        await routersAPI.addTerminal(routerId, form)
      }
      toast.success(t(isEdit ? 'devices.toasts.terminalUpdated' : 'devices.toasts.terminalAdded'))
      onSaved(); onClose()
    } catch { toast.error(t('common.errorGeneric')) }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? t('devices.form.editTerminalTitle') : t('devices.form.newTerminalTitle')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={submit}>{isEdit ? t('common.update') : t('common.save')}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>{t('devices.form.name')}</label>
          <input value={form.name} onChange={set('name')} placeholder={t('devices.form.namePlaceholder')} style={formInputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('devices.form.direction')}</label>
            <select value={form.direction} onChange={set('direction')} style={{ ...formInputStyle, appearance: 'none' }}>
              <option value="ENTRANCE">{t('devices.form.entranceOption')}</option>
              <option value="EXIT">{t('devices.form.exitOption')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('devices.form.brand')}</label>
            <input value={form.brand} onChange={set('brand')} placeholder="Hikvision, ZKTeco..." style={formInputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('devices.form.model')}</label>
            <input value={form.model} onChange={set('model')} style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('devices.form.serial')}</label>
            <input value={form.serialNumber} onChange={set('serialNumber')} style={formInputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>{t('devices.form.ip')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.ipAddress} onChange={set('ipAddress')} placeholder="10.20.0.5" style={formInputStyle} />
              <button type="button" onClick={loadLanHosts} disabled={lanHostsLoading} title={t('devices.form.ipDiscoverBtn')}
                style={{ flexShrink: 0, width: 36, border: '1px solid #E2E8F0', borderRadius: 9, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', opacity: lanHostsLoading ? 0.5 : 1 }}>
                {lanHostsLoading ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Search style={{ width: 15, height: 15 }} />}
              </button>
            </div>
            {(lanHosts || lanHostsError) && (
              <div style={{ position: 'absolute', zIndex: 20, marginTop: 4, width: '100%', maxHeight: 180, overflowY: 'auto', background: 'white', border: '1px solid #E2E8F0', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {lanHostsError ? (
                  <p style={{ padding: '8px 12px', fontSize: 11.5, color: '#DC2626' }}>{lanHostsError}</p>
                ) : lanHosts.length === 0 ? (
                  <p style={{ padding: '8px 12px', fontSize: 11.5, color: '#94A3B8' }}>{t('devices.form.ipDiscoverEmpty')}</p>
                ) : lanHosts.map(h => (
                  <button type="button" key={h.ipAddress}
                    onClick={() => { setForm(f => ({ ...f, ipAddress: h.ipAddress, macAddress: f.macAddress || h.macAddress || '' })); setLanHosts(null) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 12px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', color: '#4F46E5' }}>{h.ipAddress}</span>
                      <span style={{ display: 'block', fontSize: 10, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.hostName || h.macAddress || ''}</span>
                    </span>
                    {h.registeredTerminalId && <span style={{ fontSize: 9, color: '#D97706', flexShrink: 0 }}>{t('devices.form.ipDiscoverRegistered')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>{t('devices.form.port')}</label>
            <input value={form.port} onChange={set('port')} type="number" style={formInputStyle} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.useHttps} onChange={e => setForm(f => ({ ...f, useHttps: e.target.checked }))} />
          {t('devices.form.useHttps')}
        </label>
        <div>
          <label style={labelStyle}>{t('devices.form.mac')}</label>
          <input value={form.macAddress} onChange={set('macAddress')} style={formInputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('devices.form.deviceUsername')}</label>
            <input value={form.deviceUsername} onChange={set('deviceUsername')} autoComplete="off" style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('devices.form.devicePassword')}</label>
            <input type="password" value={form.devicePassword} onChange={set('devicePassword')} autoComplete="new-password"
              placeholder={isEdit && terminal.hasDevicePassword ? t('devices.form.devicePasswordEditHint') : ''} style={formInputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('devices.form.notes')}</label>
          <input value={form.notes} onChange={set('notes')} style={formInputStyle} />
        </div>
      </div>
    </Modal>
  )
}

function RouterDetailModal({ router, schools, onClose, onRefresh }) {
  const { t, i18n } = useTranslation()
  const [detail, setDetail] = useState(router)
  const [loading, setLoading] = useState(false)
  const [showTermForm, setShowTermForm] = useState(false)
  const [editingTerm, setEditingTerm] = useState(null)
  const [showEditRouter, setShowEditRouter] = useState(false)
  const [showAssignSchool, setShowAssignSchool] = useState(false)
  const [manageTerm, setManageTerm] = useState(null)
  const [termPrefill, setTermPrefill] = useState(null)
  const locale = LOCALE_MAP[i18n.language] || 'uz-UZ'

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await routersAPI.getRouter(router.id)
      setDetail(data)
    } catch { toast.error(t('devices.loadError')) }
    setLoading(false)
  }, [router.id, t])

  useEffect(() => { reload() }, [reload])

  const delTerminal = async (terminalId) => {
    try {
      await routersAPI.deleteTerminal(terminalId)
      toast.success(t('devices.toasts.terminalDeleted'))
      reload(); onRefresh()
    } catch { toast.error(t('common.errorGeneric')) }
  }

  return (
    <Modal isOpen onClose={onClose} title={detail.name} size="lg">
      {loading && !detail.terminals ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusChip status={detail.status} t={t} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{detail.schoolName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setShowEditRouter(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontSize: 12, fontWeight: 600 }}>
                <Pencil style={{ width: 13, height: 13 }} />{t('devices.edit.editRouterBtn')}
              </button>
              <button onClick={() => setShowAssignSchool(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontSize: 12, fontWeight: 600 }}>
                <ArrowLeftRight style={{ width: 13, height: 13 }} />{t('devices.assign.title')}
              </button>
              <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{t('devices.card.heartbeat', { time: timeAgo(detail.lastHeartbeat, t) })}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: t('devices.detail.terminalsStat'), value: (detail.terminals || []).length, color: '#7C3AED', bg: '#F5F3FF' },
              { label: t('devices.detail.entranceStat'), value: detail.entranceTerminals || 0, color: '#0891B2', bg: '#ECFEFF' },
              { label: t('devices.detail.exitStat'), value: detail.exitTerminals || 0, color: '#EA580C', bg: '#FFF7ED' },
              { label: t('devices.detail.facesStat'), value: (detail.terminals || []).reduce((s, t2) => s + (t2.registeredFaces || 0), 0), color: '#DB2777', bg: '#FDF2F8' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '8px 10px' }}>
                <p style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: 17, fontWeight: 800, color }}>{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t('devices.detail.terminalsTitle')}</p>
              <Button size="sm" icon={Plus} onClick={() => { setEditingTerm(null); setTermPrefill(null); setShowTermForm(true) }}>{t('devices.detail.addTerminalBtn')}</Button>
            </div>
            {(detail.terminals || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', border: '1px dashed #E2E8F0', borderRadius: 10 }}>
                <p style={{ fontSize: 12.5, color: '#94A3B8' }}>{t('devices.form.noTerminals')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.terminals.map(term => (
                  <div key={term.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: term.direction === 'ENTRANCE' ? '#ECFEFF' : '#FFF7ED',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {term.direction === 'ENTRANCE'
                        ? <ArrowDownCircle style={{ width: 16, height: 16, color: '#0891B2' }} />
                        : <ArrowUpCircle style={{ width: 16, height: 16, color: '#EA580C' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{term.name}</p>
                        <StatusChip status={term.status} t={t} />
                      </div>
                      <p style={{ fontSize: 11, color: '#94A3B8' }}>
                        {[term.brand, term.model, term.serialNumber ? `SN: ${term.serialNumber}` : null, term.ipAddress ? `IP: ${term.ipAddress}` : null].filter(Boolean).join(' • ') || '—'}
                      </p>
                      {term.lastError && (
                        <p style={{ fontSize: 11, color: '#D97706', display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                          <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />{term.lastError}
                        </p>
                      )}
                    </div>
                    <Button size="xs" variant="outline" onClick={() => setManageTerm(term)}>{t('devices.detail.manageBtn')}</Button>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <IconButton icon={Pencil} size="sm" variant="ghost" style={{ color: '#94A3B8' }} onClick={() => { setEditingTerm(term); setShowTermForm(true) }} tooltip={t('common.edit')} />
                      <IconButton icon={Trash2} size="sm" variant="ghost" style={{ color: '#94A3B8' }} onClick={() => delTerminal(term.id)} tooltip={t('common.delete')} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ConnectionPanel router={detail} t={t} onChanged={(updated) => { setDetail(updated); onRefresh() }} />

          <DiscoveryPanel router={detail} t={t}
            onAddTerminal={(prefill) => { setEditingTerm(null); setTermPrefill(prefill); setShowTermForm(true) }} />
        </div>
      )}
      {showTermForm && (
        <TerminalFormModal routerId={router.id} terminal={editingTerm} prefill={termPrefill} t={t}
          onClose={() => { setShowTermForm(false); setEditingTerm(null); setTermPrefill(null) }}
          onSaved={() => { reload(); onRefresh() }} />
      )}
      {manageTerm && <TerminalManagerModal terminal={manageTerm} t={t} onClose={() => { setManageTerm(null); reload() }} />}
      {showEditRouter && (
        <EditRouterModal router={detail} t={t}
          onClose={() => setShowEditRouter(false)}
          onSaved={(updated) => { setDetail(updated); onRefresh() }} />
      )}
      {showAssignSchool && (
        <AssignSchoolModal router={detail} schools={schools} t={t}
          onClose={() => setShowAssignSchool(false)}
          onSaved={() => { reload(); onRefresh() }} />
      )}
    </Modal>
  )
}

function EditRouterModal({ router, onClose, onSaved, t }) {
  const [name, setName] = useState(router.name || '')
  const [vpnIp, setVpnIp] = useState(router.vpnIp || '')
  const [lanSubnet, setLanSubnet] = useState(router.lanSubnet || '')
  const [notes, setNotes] = useState(router.notes || '')
  // routerAdminPassword doim bo'sh boshlanadi — backend uni hech qachon qaytarmaydi (faqat
  // hasRouterAdminPassword bayrog'i); bo'sh qoldirilsa eski parol saqlanadi (RouterController).
  const [routerAdminUsername, setRouterAdminUsername] = useState(router.routerAdminUsername || '')
  const [routerAdminPassword, setRouterAdminPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      const { data } = await routersAPI.updateRouter(router.id, { name, vpnIp, lanSubnet, notes, routerAdminUsername, routerAdminPassword })
      toast.success(t('devices.toasts.routerUpdated'))
      onSaved(data); onClose()
    } catch (e) { toast.error(e.response?.data?.error || t('common.errorGeneric')) }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={t('devices.edit.title')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={submit}>{t('common.update')}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>{t('devices.edit.nameLabel')}</label>
          <input value={name} onChange={e => setName(e.target.value)} style={formInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('devices.edit.vpnIpLabel')}</label>
          <input value={vpnIp} onChange={e => setVpnIp(e.target.value)} style={{ ...formInputStyle, fontFamily: 'monospace' }} />
        </div>
        <div>
          <label style={labelStyle}>{t('devices.edit.lanSubnetLabel')}</label>
          <input value={lanSubnet} onChange={e => setLanSubnet(e.target.value)} placeholder="192.168.88.0/24" style={{ ...formInputStyle, fontFamily: 'monospace' }} />
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{t('devices.edit.lanSubnetHint')}</p>
        </div>
        <div>
          <label style={labelStyle}>{t('devices.edit.notesLabel')}</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} style={formInputStyle} />
        </div>
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, color: '#94A3B8' }}>{t('devices.edit.routerAdminNote')}</p>
          <div>
            <label style={labelStyle}>{t('devices.edit.routerAdminUsernameLabel')}</label>
            <input value={routerAdminUsername} onChange={e => setRouterAdminUsername(e.target.value)} autoComplete="off" style={formInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('devices.edit.routerAdminPasswordLabel')}</label>
            <input type="password" value={routerAdminPassword} onChange={e => setRouterAdminPassword(e.target.value)} autoComplete="new-password"
              placeholder={router.hasRouterAdminPassword ? t('devices.edit.routerAdminPasswordEditHint') : ''} style={formInputStyle} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function AssignSchoolModal({ router, schools, onClose, onSaved, t }) {
  const [schoolId, setSchoolId] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!schoolId) return
    setSaving(true)
    try {
      await routersAPI.assignSchool(router.id, schoolId)
      toast.success(t('devices.toasts.routerReassigned'))
      onSaved(); onClose()
    } catch (e) { toast.error(e.response?.data?.error || t('common.errorGeneric')) }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={t('devices.assign.title')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={submit}>{t('common.save')}</Button>
      </>}>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
        {t('devices.assign.deviceLabel')} <strong>{router.name}</strong>
      </p>
      <select value={schoolId} onChange={e => setSchoolId(e.target.value)} style={{ ...formInputStyle, appearance: 'none' }}>
        <option value="">{t('devices.assign.selectSchool')}</option>
        {(schools || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </Modal>
  )
}

function CreateRouterModal({ schools, regions, districts, onClose, onCreated, t }) {
  const [region, setRegion] = useState('')
  const [district, setDistrict] = useState('')
  const [districtOpts, setDistrictOpts] = useState([])
  const [schoolId, setSchoolId] = useState('')
  const [name, setName] = useState('')
  const [vpnIp, setVpnIp] = useState('')
  const [lanSubnet, setLanSubnet] = useState('')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  useEffect(() => {
    if (!region) { setDistrictOpts([]); setDistrict(''); setSchoolId(''); return }
    orgAPI.getDistricts({ region, page_size: 200 }).then(({ data }) => setDistrictOpts(data.results || data)).catch(() => {})
    setDistrict(''); setSchoolId('')
  }, [region])

  const filteredSchools = district
    ? schools.filter(s => String(s.district) === String(district))
    : []

  const submit = async () => {
    if (!schoolId) { toast.error(t('devices.creds.fillAll')); return }
    setSaving(true)
    try {
      const { data } = await routersAPI.createKey({ schoolId, name: name || undefined, vpnIp: vpnIp || undefined, lanSubnet: lanSubnet || undefined })
      setCreated(data)
      onCreated()
    } catch (e) {
      toast.error(e.response?.data?.error || t('common.errorGeneric'))
    } finally { setSaving(false) }
  }

  if (created) {
    return (
      <Modal isOpen onClose={onClose} title={t('devices.creds.createdTitle')}
        footer={<Button onClick={onClose}>{t('common.close')}</Button>}>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{t('devices.creds.createdSubtitle')}</p>
        <div style={{ background: '#0F172A', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'monospace' }}>
          <div>
            <span style={{ fontSize: 9.5, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>{t('devices.creds.school')}</span>
            <span style={{ color: 'white', fontSize: 13 }}>{created.schoolName}</span>
          </div>
          <div>
            <span style={{ fontSize: 9.5, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>{t('devices.creds.apiKey')}</span>
            <span style={{ color: '#67E8F9', fontSize: 13, fontWeight: 700, wordBreak: 'break-all' }}>{created.apiKey}</span>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title={t('devices.creds.title')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} icon={Key} onClick={submit}>{t('devices.creds.createBtn')}</Button>
      </>}>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>{t('devices.creds.subtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>{t('devices.filters.region')}</label>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...formInputStyle, appearance: 'none' }}>
            <option value="">{t('devices.creds.selectProvince')}</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('devices.filters.district')}</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!region} style={{ ...formInputStyle, appearance: 'none', opacity: region ? 1 : 0.5 }}>
            <option value="">{t('devices.creds.selectDistrict')}</option>
            {districtOpts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('devices.filters.school')}</label>
          <select value={schoolId} onChange={e => setSchoolId(e.target.value)} disabled={!district} style={{ ...formInputStyle, appearance: 'none', opacity: district ? 1 : 0.5 }}>
            <option value="">{t('devices.creds.selectSchool')}</option>
            {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
          <label style={labelStyle}>{t('devices.form.name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('devices.creds.namePlaceholder')} style={formInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('devices.network.vpnIp')}</label>
          <input value={vpnIp} onChange={e => setVpnIp(e.target.value)} placeholder={t('devices.creds.vpnIpPlaceholder')} style={formInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('devices.edit.lanSubnetLabel')}</label>
          <input value={lanSubnet} onChange={e => setLanSubnet(e.target.value)} placeholder={t('devices.creds.lanSubnetPlaceholder')} style={{ ...formInputStyle, fontFamily: 'monospace' }} />
        </div>
      </div>
    </Modal>
  )
}

export default function DevicesPage() {
  const { t } = useTranslation()
  const [routers, setRouters] = useState([])
  const [overview, setOverview] = useState({})
  const [schools, setSchools] = useState([])
  const [regions, setRegions] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [openRouter, setOpenRouter] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filterRegion, setFilterRegion] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterSchool, setFilterSchool] = useState('')

  useEffect(() => {
    orgAPI.getRegions({ page_size: 200 }).then(({ data }) => setRegions(data.results || data)).catch(() => {})
    orgAPI.getSchools({ page_size: 500 }).then(({ data }) => setSchools(data.results || data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (filterRegion) {
      orgAPI.getDistricts({ region: filterRegion, page_size: 200 }).then(({ data }) => setDistricts(data.results || data)).catch(() => {})
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterSchool) params.schoolId = filterSchool
      else if (filterDistrict) params.districtId = filterDistrict
      else if (filterRegion) params.provinceId = filterRegion
      const [rRes, oRes] = await Promise.all([routersAPI.getRouters(params), routersAPI.getOverview()])
      setRouters(rRes.data)
      setOverview(oRes.data)
    } catch { toast.error(t('devices.loadError')) }
    finally { setLoading(false) }
  }, [filterSchool, filterDistrict, filterRegion, t])

  useEffect(() => { load() }, [load])
  useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i) }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await routersAPI.deleteRouter(deleteTarget.id)
      toast.success(t('devices.toasts.deleted'))
      setDeleteTarget(null)
      load()
    } catch { toast.error(t('devices.toasts.deleteError')) }
    finally { setDeleting(false) }
  }

  const selectStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
    fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', appearance: 'none',
  }

  const stats = [
    { label: t('devices.stats.total'), value: overview.totalRouters || 0, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
    { label: t('devices.status.ONLINE'), value: overview.onlineRouters || 0, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: t('devices.status.OFFLINE'), value: overview.offlineRouters || 0, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
    { label: t('devices.stats.terminals'), value: overview.totalTerminals || 0, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    { label: t('devices.stats.terminalsOnline'), value: overview.onlineTerminals || 0, color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('devices.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('devices.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconButton icon={RefreshCw} variant="secondary" onClick={load} tooltip={t('common.refresh')} />
          <Button icon={Plus} onClick={() => setShowCreate(true)}>{t('devices.createKeyBtn')}</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {stats.map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color }}>{value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75, marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('devices.filters.title')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: t('devices.filters.region'), value: filterRegion, onChange: e => setFilterRegion(e.target.value), disabled: false, options: regions.map(r => ({ value: r.id, label: r.name })), placeholder: t('devices.filters.allRegions') },
            { label: t('devices.filters.district'), value: filterDistrict, onChange: e => setFilterDistrict(e.target.value), disabled: !filterRegion, options: districts.map(d => ({ value: d.id, label: d.name })), placeholder: t('devices.filters.allDistricts') },
            { label: t('devices.filters.school'), value: filterSchool, onChange: e => setFilterSchool(e.target.value), disabled: false, options: filteredSchools.map(s => ({ value: s.id, label: s.name })), placeholder: t('devices.filters.allSchools') },
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

      {loading ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : routers.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={Router} title={t('devices.empty.title')}
            description={t('devices.empty.description')}
            action={<Button onClick={() => setShowCreate(true)} icon={Plus}>{t('devices.createKeyBtn')}</Button>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {routers.map(router => (
            <RouterCard key={router.id} router={router} onOpen={setOpenRouter} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateRouterModal schools={schools} regions={regions} districts={districts} t={t}
          onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {openRouter && (
        <RouterDetailModal router={openRouter} schools={schools} onClose={() => setOpenRouter(null)} onRefresh={load} />
      )}
      {deleteTarget && (
        <ConfirmModal isOpen
          title={t('devices.deleteConfirm.title')}
          message={t('devices.deleteConfirm.message', { name: deleteTarget.name })}
          confirmLabel={t('common.delete')}
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
