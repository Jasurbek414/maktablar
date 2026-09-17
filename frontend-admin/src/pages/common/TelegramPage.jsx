import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Bot, Users, BarChart3, CheckCircle, ExternalLink, Copy, Bell, ChevronRight, Terminal, Eye, EyeOff, KeyRound, Inbox, Send, Settings, Info } from 'lucide-react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { usePermissions } from '../../hooks/usePermissions'
import { botConfigAPI } from '../../api/botConfig'
import { botManagementAPI } from '../../api/botManagement'
import { orgAPI } from '../../api/organizations'

const cardStyle = {
  background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

function BotCard({ icon: Icon, gradient, title, description, username, features }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copyUsername = () => {
    if (!username || username.includes('...')) {
      toast.error(t('telegram.tokenNotSet'))
      return
    }
    navigator.clipboard.writeText(`https://t.me/${username}`)
    setCopied(true)
    toast.success(t('telegram.linkCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      {/* Gradient header */}
      <div style={{ height: 6, background: gradient }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <Icon style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.4 }}>{description}</p>
          </div>
        </div>

        {username && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
          }}>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#4F46E5', flex: 1, fontWeight: 600 }}>
              @{username}
            </span>
            <button onClick={copyUsername} title={t('telegram.copyTitle')} style={{
              padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: copied ? '#EEF2FF' : 'white',
              cursor: 'pointer', color: copied ? '#4F46E5' : '#94A3B8', display: 'flex',
            }}>
              <Copy style={{ width: 14, height: 14 }} />
            </button>
            {!username.includes('...') && (
              <a href={`https://t.me/${username}`} target="_blank" rel="noopener noreferrer" title={t('telegram.openInTelegramTitle')}
                style={{ padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#94A3B8', display: 'flex' }}>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <CheckCircle style={{ width: 15, height: 15, color: '#10B981', marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepItem({ number, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: 'white',
      }}>
        {number}
      </div>
      <p style={{ fontSize: 13, color: '#475569', paddingTop: 5, lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

function BotTokenConfig() {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null) // { configured, maskedToken }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    botConfigAPI.getStatus()
      .then(res => setStatus(res.data))
      .catch(() => toast.error(t('telegram.tokenConfig.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const handleSave = () => {
    if (!token.trim()) {
      toast.error(t('telegram.tokenConfig.placeholder'))
      return
    }
    setSaving(true)
    botConfigAPI.update(token.trim())
      .then(() => {
        toast.success(t('telegram.tokenConfig.saved'))
        setToken('')
        loadStatus()
      })
      .catch(() => toast.error(t('telegram.tokenConfig.saveError')))
      .finally(() => setSaving(false))
  }

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ height: 6, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <KeyRound style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{t('telegram.tokenConfig.title')}</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.4 }}>{t('telegram.tokenConfig.description')}</p>
          </div>
        </div>

        {!loading && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
            background: status?.configured ? '#ECFDF5' : '#FEF2F2',
            color: status?.configured ? '#059669' : '#DC2626',
            border: `1px solid ${status?.configured ? '#A7F3D0' : '#FECACA'}`,
          }}>
            {status?.configured
              ? `${t('telegram.tokenConfig.configured')} (${status.maskedToken})`
              : t('telegram.tokenConfig.notConfigured')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={show ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={t('telegram.tokenConfig.placeholder')}
              style={{
                width: '100%', padding: '10px 38px 10px 12px',
                border: '1.5px solid #E2E8F0', borderRadius: 9,
                fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
                background: '#FAFAFA', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#7C3AED'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none' }}
            />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
              {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: saving ? '#C4B5FD' : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              color: 'white', fontSize: 13.5, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {saving ? t('telegram.tokenConfig.saving') : t('telegram.tokenConfig.save')}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 8 }}>{t('telegram.tokenConfig.hint')}</p>
      </div>
    </div>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 4 }}>
      {tabs.map(tb => (
        <button
          key={tb.key}
          onClick={() => onChange(tb.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 700,
            color: active === tb.key ? '#4F46E5' : '#64748B',
            borderBottom: active === tb.key ? '2px solid #4F46E5' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          <tb.icon style={{ width: 15, height: 15 }} />
          {tb.label}
        </button>
      ))}
    </div>
  )
}

function InboxTab() {
  const { t } = useTranslation()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState({})
  const [sending, setSending] = useState({})

  const load = () => {
    setLoading(true)
    botManagementAPI.getInbox()
      .then(res => setThreads(res.data || []))
      .catch(() => toast.error(t('telegram.inbox.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sendReply = (studentId) => {
    const text = (replyText[studentId] || '').trim()
    if (!text) return
    setSending(s => ({ ...s, [studentId]: true }))
    botManagementAPI.replyToStudentThread(studentId, text)
      .then(() => {
        toast.success(t('telegram.inbox.replySent'))
        setReplyText(s => ({ ...s, [studentId]: '' }))
        load()
      })
      .catch(() => toast.error(t('telegram.inbox.replyError')))
      .finally(() => setSending(s => ({ ...s, [studentId]: false })))
  }

  return (
    <div style={cardStyle}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.inbox.title')}</h2>
        <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>{t('telegram.inbox.description')}</p>
      </div>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <p style={{ fontSize: 13, color: '#94A3B8' }}>...</p>}
        {!loading && threads.length === 0 && (
          <p style={{ fontSize: 13, color: '#94A3B8' }}>{t('telegram.inbox.empty')}</p>
        )}
        {threads.map(th => (
          <div key={th.studentId} style={{ border: '1px solid #F1F5F9', borderRadius: 12, padding: '14px 16px', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{th.studentName}</span>
              {th.unreadCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 999, padding: '2px 9px' }}>
                  {t('telegram.inbox.unread', { count: th.unreadCount })}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
              <strong>{th.lastSenderType === 'GUARDIAN' ? '👤' : '🏫'}</strong> {th.lastMessage}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={replyText[th.studentId] || ''}
                onChange={e => setReplyText(s => ({ ...s, [th.studentId]: e.target.value }))}
                placeholder={t('telegram.inbox.replyPlaceholder')}
                style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={() => sendReply(th.studentId)}
                disabled={sending[th.studentId]}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {sending[th.studentId] ? t('telegram.inbox.replySending') : t('telegram.inbox.reply')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BroadcastTab({ showSchoolPicker }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schools, setSchools] = useState([])
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (showSchoolPicker) {
      orgAPI.getSchools({ page_size: 500 }).then(r => setSchools(r.data.results || r.data)).catch(() => {})
    }
    botManagementAPI.getBroadcastHistory()
      .then(res => setHistory(res.data || []))
      .catch(() => toast.error(t('telegram.broadcast.historyLoadError')))
  }, [showSchoolPicker])

  const send = () => {
    if (!text.trim()) {
      toast.error(t('telegram.broadcast.textRequired'))
      return
    }
    setSending(true)
    botManagementAPI.sendBroadcast(text.trim(), schoolId || undefined)
      .then(res => {
        toast.success(t('telegram.broadcast.sentSuccess', { count: res.data.recipientCount }))
        setText('')
        botManagementAPI.getBroadcastHistory().then(r => setHistory(r.data || [])).catch(() => {})
      })
      .catch(() => toast.error(t('telegram.broadcast.sendError')))
      .finally(() => setSending(false))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.broadcast.title')}</h2>
          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>{t('telegram.broadcast.description')}</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {showSchoolPicker && (
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                {t('telegram.broadcast.schoolLabel')}
              </label>
              <select
                value={schoolId}
                onChange={e => setSchoolId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white' }}
              >
                <option value="">{t('telegram.broadcast.schoolAll')}</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('telegram.broadcast.textPlaceholder')}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={send}
            disabled={sending}
            style={{
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: sending ? '#C7D2FE' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: 'white', fontSize: 13.5, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
            }}
          >
            <Send style={{ width: 15, height: 15 }} />
            {sending ? t('telegram.broadcast.sending') : t('telegram.broadcast.send')}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.broadcast.historyTitle')}</h3>
        </div>
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.length === 0 && <p style={{ fontSize: 13, color: '#94A3B8' }}>{t('telegram.broadcast.historyEmpty')}</p>}
          {history.map(h => (
            <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid #F8FAFC', fontSize: 12.5, color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{h.sentByName}</span>
                <span style={{ color: '#94A3B8' }}>{new Date(h.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0 }}>{h.text}</p>
              <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 700 }}>
                {h.schoolName || t('telegram.broadcast.schoolAll')} · {h.recipientCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 13.5, color: '#334155' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: checked ? '#4F46E5' : '#E2E8F0', position: 'relative', transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
}

function SettingsTab() {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dedupInput, setDedupInput] = useState('')
  const [savingDedup, setSavingDedup] = useState(false)

  const load = () => {
    setLoading(true)
    botConfigAPI.getStatus()
      .then(res => { setStatus(res.data); setDedupInput(String(res.data.attendanceDedupMinutes ?? 180)) })
      .catch(() => toast.error(t('telegram.settings.saveError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (key, value) => {
    setStatus(s => ({ ...s, [key]: value })) // optimistik yangilash
    botConfigAPI.updateToggles({ [key]: value })
      .then(() => toast.success(t('telegram.settings.saved')))
      .catch(() => { toast.error(t('telegram.settings.saveError')); load() })
  }

  const saveDedup = () => {
    const minutes = parseInt(dedupInput, 10)
    if (!Number.isFinite(minutes) || minutes < 1) { toast.error(t('telegram.settings.dedupInvalid')); return }
    setSavingDedup(true)
    botConfigAPI.updateToggles({ attendanceDedupMinutes: minutes })
      .then(() => toast.success(t('telegram.settings.saved')))
      .catch(() => { toast.error(t('telegram.settings.saveError')); load() })
      .finally(() => setSavingDedup(false))
  }

  if (loading || !status) return null

  return (
    <div style={cardStyle}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.settings.title')}</h2>
        <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>{t('telegram.settings.description')}</p>
      </div>
      <div style={{ padding: '4px 24px 8px' }}>
        <ToggleRow
          label={t('telegram.settings.broadcastEnabled')}
          checked={!!status.broadcastEnabled}
          onChange={v => toggle('broadcastEnabled', v)}
        />
        <ToggleRow
          label={t('telegram.settings.guardianMessagingEnabled')}
          checked={!!status.guardianMessagingEnabled}
          onChange={v => toggle('guardianMessagingEnabled', v)}
        />
        <ToggleRow
          label={t('telegram.settings.attendanceNotificationsEnabled')}
          checked={!!status.attendanceNotificationsEnabled}
          onChange={v => toggle('attendanceNotificationsEnabled', v)}
        />
        <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13.5, color: '#334155' }}>{t('telegram.settings.dedupMinutesLabel')}</span>
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: 0 }}>{t('telegram.settings.dedupMinutesHint')}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input type="number" min="1" value={dedupInput} onChange={e => setDedupInput(e.target.value)}
              style={{ width: 120, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, outline: 'none' }} />
            <button onClick={saveDedup} disabled={savingDedup}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: savingDedup ? '#C7D2FE' : '#4F46E5', color: 'white', fontSize: 13, fontWeight: 700, cursor: savingDedup ? 'default' : 'pointer' }}>
              {savingDedup ? t('telegram.settings.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TelegramPage() {
  const { t } = useTranslation()
  const { isSuperAdmin, isAdmin, isSchoolDirector, hasRole } = usePermissions()
  const canManageBot = isSuperAdmin || isAdmin || isSchoolDirector || hasRole('mudir')
  const [tab, setTab] = useState('about')
  const parentBotUsername = import.meta.env.VITE_PARENT_BOT_USERNAME || 'davomad_parent_bot'
  const managementBotUsername = import.meta.env.VITE_MANAGEMENT_BOT_USERNAME || 'davomad_management_bot'

  const parentSteps = [
    t('telegram.parentGuide.steps.open', { username: parentBotUsername }),
    t('telegram.parentGuide.steps.start'),
    t('telegram.parentGuide.steps.sharePhone'),
    t('telegram.parentGuide.steps.autoLink'),
    t('telegram.parentGuide.steps.notifications'),
  ]

  const commands = [
    { cmd: '/start', desc: t('telegram.commands.start') },
    { cmd: '/bugungi_hisobot', desc: t('telegram.commands.todayReport') },
    { cmd: '/qurilmalar', desc: t('telegram.commands.devices') },
    { cmd: '/haftalik_trend', desc: t('telegram.commands.weeklyTrend') },
    { cmd: '/statistika', desc: t('telegram.commands.statistics') },
    { cmd: '/yordam', desc: t('telegram.commands.help') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.title')}</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          {t('telegram.subtitle')}
        </p>
      </div>

      {canManageBot && (
        <TabBar
          active={tab}
          onChange={setTab}
          tabs={[
            { key: 'about', icon: Info, label: t('telegram.tabs.about') },
            { key: 'inbox', icon: Inbox, label: t('telegram.tabs.inbox') },
            { key: 'broadcast', icon: Send, label: t('telegram.tabs.broadcast') },
            ...(isSuperAdmin ? [{ key: 'settings', icon: Settings, label: t('telegram.tabs.settings') }] : []),
          ]}
        />
      )}

      {tab === 'inbox' && canManageBot && <InboxTab />}
      {tab === 'broadcast' && canManageBot && <BroadcastTab showSchoolPicker={isSuperAdmin || isAdmin} />}
      {tab === 'settings' && isSuperAdmin && <SettingsTab />}

      {(tab === 'about' || !canManageBot) && (
      <>
      {isSuperAdmin && <BotTokenConfig />}

      {/* Bot cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <BotCard
          icon={Users}
          gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
          title={t('telegram.parentBot.title')}
          description={t('telegram.parentBot.description')}
          username={parentBotUsername}
          features={[
            t('telegram.parentBot.features.arrival'),
            t('telegram.parentBot.features.lateAbsent'),
            t('telegram.parentBot.features.todayStatus'),
            t('telegram.parentBot.features.multiChild'),
            t('telegram.parentBot.features.monthlyStats'),
          ]}
        />
        <BotCard
          icon={BarChart3}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          title={t('telegram.managementBot.title')}
          description={t('telegram.managementBot.description')}
          username={managementBotUsername}
          features={[
            t('telegram.managementBot.features.todayReport'),
            t('telegram.managementBot.features.deviceStatus'),
            t('telegram.managementBot.features.weeklyTrend'),
            t('telegram.managementBot.features.riskAlerts'),
            t('telegram.managementBot.features.schoolStats'),
          ]}
        />
      </div>

      {/* Parent guide */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle style={{ width: 17, height: 17, color: '#2563EB' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.parentGuide.title')}</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{t('telegram.parentGuide.stepsCount', { count: parentSteps.length })}</p>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {parentSteps.map((text, i) => <StepItem key={i} number={i + 1} text={text} />)}
        </div>
        <div style={{ margin: '0 24px 20px', padding: '14px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Bell style={{ width: 16, height: 16, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>{t('telegram.noteTitle')}</p>
              <p style={{ fontSize: 12.5, color: '#B45309', lineHeight: 1.5 }}>
                {t('telegram.noteText')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Management bot commands */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot style={{ width: 17, height: 17, color: '#059669' }} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.managementCommandsTitle')}</h2>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {commands.map(({ cmd, desc }) => (
            <div key={cmd} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: '#F8FAFC', border: '1px solid #F1F5F9',
              borderRadius: 10, transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
            >
              <code style={{
                fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                color: '#4F46E5', background: '#EEF2FF', border: '1px solid #C7D2FE',
                padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
              }}>
                {cmd}
              </code>
              <span style={{ fontSize: 12.5, color: '#475569' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin setup guide */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal style={{ width: 17, height: 17, color: '#7C3AED' }} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('telegram.adminSetup.title')}</h2>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              title: t('telegram.adminSetup.step1.title'),
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    <><a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" style={{ color: '#4F46E5', fontWeight: 600 }}>@BotFather</a> {t('telegram.adminSetup.step1.item1')} <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>/newbot</code> {t('telegram.adminSetup.step1.item1b')}</>,
                    t('telegram.adminSetup.step1.item2'),
                    <span>{t('telegram.adminSetup.step1.item3a')} <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>.env</code> {t('telegram.adminSetup.step1.item3b')}</span>,
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <ChevronRight style={{ width: 14, height: 14, color: '#94A3B8', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: t('telegram.adminSetup.step2.title'),
              content: (
                <pre style={{
                  background: '#0F172A', color: '#4ADE80',
                  padding: '14px 16px', borderRadius: 10, fontSize: 12.5,
                  fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{`PARENT_BOT_TOKEN=1234567890:AAF...
MANAGEMENT_BOT_TOKEN=9876543210:BBG...
BOT_SECRET=your-shared-secret-key`}
                </pre>
              ),
            },
            {
              title: t('telegram.adminSetup.step3.title'),
              content: (
                <pre style={{
                  background: '#0F172A', color: '#4ADE80',
                  padding: '14px 16px', borderRadius: 10, fontSize: 12.5,
                  fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{`# ${t('telegram.adminSetup.step3.viaDocker')}
docker-compose up -d parent-bot management-bot

# ${t('telegram.adminSetup.step3.orDirect')}
cd bot && python parent_bot.py
cd bot && python management_bot.py`}
                </pre>
              ),
            },
          ].map(({ title, content }) => (
            <div key={title} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{title}</p>
              {content}
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
