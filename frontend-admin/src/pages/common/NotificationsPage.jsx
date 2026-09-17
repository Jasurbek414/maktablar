import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Check } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '../../components/ui/Button'
import { fetchNotifications, markAsRead, markAllRead } from '../../store/notificationsSlice'
import { notificationsAPI } from '../../api/notifications'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'
import { EmptyState } from '../../components/ui/LoadingSpinner'

const TYPE_CONFIG = {
  check_in:  { emoji: '✅', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  check_out: { emoji: '🏠', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  late:      { emoji: '⏰', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  absent:    { emoji: '❌', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  system:    { emoji: '🔔', bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  device:    { emoji: '🖥️', bg: '#ECFEFF', color: '#0891B2', border: '#A5F3FC' },
}

function groupByDate(items, t) {
  const groups = {}
  ;(items || []).forEach(n => {
    const d = parseISO(n.created_at)
    let key = format(d, 'yyyy-MM-dd')
    let label = isToday(d) ? t('common.today') : isYesterday(d) ? t('notifications.yesterday') : format(d, 'd MMMM', { locale: uz })
    if (!groups[key]) groups[key] = { label, items: [] }
    groups[key].items.push(n)
  })
  return Object.values(groups)
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items, isLoading } = useSelector(s => s.notifications)

  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  const handleMarkRead = async (id) => {
    dispatch(markAsRead(id))
    await notificationsAPI.markRead(id).catch(() => {})
  }

  const handleMarkAllRead = async () => {
    dispatch(markAllRead())
    await notificationsAPI.markAllRead().catch(() => {})
  }

  const unread = (items || []).filter(n => !n.is_read).length
  const groups = groupByDate(items, t)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('notifications.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            {unread > 0 ? <span style={{ color: '#4F46E5', fontWeight: 600 }}>{t('notifications.unreadCount', { count: unread })}</span> : t('notifications.allRead')}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={handleMarkAllRead}>
            {t('notifications.markAllBtn')}
          </Button>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <EmptyState
            icon={Bell}
            title={t('notifications.empty.title')}
            description={t('notifications.empty.description')}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Date label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
                <span style={{ fontSize: 11.5, color: '#CBD5E1' }}>{group.items.length} {t('notifications.itemsCountSuffix')}</span>
              </div>

              {/* Notifications */}
              <div style={{
                background: 'white', border: '1px solid #E2E8F0', borderRadius: 14,
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {group.items.map((n, i) => {
                  const tc = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.system
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '14px 18px',
                        borderBottom: i < group.items.length - 1 ? '1px solid #F8FAFC' : 'none',
                        background: n.is_read ? 'transparent' : 'linear-gradient(90deg, rgba(79,70,229,0.03), transparent)',
                        cursor: n.is_read ? 'default' : 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.background = 'rgba(79,70,229,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'linear-gradient(90deg, rgba(79,70,229,0.03), transparent)' }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: tc.bg, border: `1px solid ${tc.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>
                        {tc.emoji}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{
                            fontSize: 13.5, fontWeight: n.is_read ? 500 : 700,
                            color: n.is_read ? '#475569' : '#0F172A',
                            lineHeight: 1.4, flex: 1,
                          }}>
                            {n.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 11.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                              {format(parseISO(n.created_at), 'HH:mm')}
                            </span>
                            {!n.is_read && (
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#4F46E5', flexShrink: 0,
                                boxShadow: '0 0 0 2px rgba(79,70,229,0.2)',
                              }} />
                            )}
                          </div>
                        </div>
                        {n.message && n.message !== n.title && (
                          <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 3, lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                        )}
                        {n.is_read && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Check style={{ width: 11, height: 11, color: '#CBD5E1' }} />
                            <span style={{ fontSize: 11, color: '#CBD5E1' }}>{t('notifications.readLabel')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
