import { Bell, Search, ChevronRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { uz, ru, enUS } from 'date-fns/locale'
import { LanguageSwitcher } from './LanguageSwitcher'

const DATE_LOCALES = { uz, ru, en: enUS }

// Har bir yo'l uchun sarlavha va breadcrumb kalitlari (matnlar t() bilan olinadi)
const PAGE_META = {
  '/dashboard':    { labelKey: 'header.labels.dashboard',    crumbKeys: [] },
  '/users':        { labelKey: 'header.labels.users',        crumbKeys: ['header.crumbs.management'] },
  '/regions':      { labelKey: 'header.labels.organizations', crumbKeys: ['header.crumbs.management'] },
  '/schools':      { labelKey: 'header.labels.schools',      crumbKeys: ['header.crumbs.organizations'] },
  '/districts':    { labelKey: 'header.labels.districts',    crumbKeys: ['header.crumbs.organizations'] },
  '/organizations':{ labelKey: 'header.labels.organizations', crumbKeys: [] },
  '/classes':      { labelKey: 'header.labels.classes',      crumbKeys: ['header.crumbs.education'] },
  '/students':     { labelKey: 'header.labels.students',     crumbKeys: ['header.crumbs.education'] },
  '/teachers':     { labelKey: 'header.labels.teachers',     crumbKeys: ['header.crumbs.education'] },
  '/parents':      { labelKey: 'header.labels.parents',      crumbKeys: ['header.crumbs.education'] },
  '/devices':      { labelKey: 'header.labels.devices',      crumbKeys: ['header.crumbs.devices'] },
  '/attendance':   { labelKey: 'header.labels.attendance',   crumbKeys: ['header.crumbs.analysis'] },
  '/reports':      { labelKey: 'header.labels.reports',      crumbKeys: ['header.crumbs.analysis'] },
  '/notifications':{ labelKey: 'header.labels.notifications', crumbKeys: [] },
  '/profile':      { labelKey: 'header.labels.profile',      crumbKeys: ['header.crumbs.settings'] },
  '/telegram':     { labelKey: 'header.labels.telegram',     crumbKeys: [] },
  '/audit':        { labelKey: 'header.labels.audit',        crumbKeys: ['header.crumbs.management'] },
}

export function Header({ onToggleSidebar, sidebarCollapsed }) {
  const { t, i18n } = useTranslation()
  const { user } = useSelector(state => state.auth)
  const { unreadCount } = useSelector(state => state.notifications)
  const location = useLocation()

  const meta = PAGE_META[location.pathname] || { labelKey: 'header.labels.default', crumbKeys: [] }
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase()
  const dateLocale = DATE_LOCALES[i18n.resolvedLanguage] || uz
  const today = format(new Date(), "d MMMM, yyyy", { locale: dateLocale })

  return (
    <header style={{
      height: 60,
      background: 'white',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      flexShrink: 0,
      zIndex: 30,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        {meta.crumbKeys.map((crumbKey, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{t(crumbKey)}</span>
            <ChevronRight style={{ width: 13, height: 13, color: '#CBD5E1' }} />
          </span>
        ))}
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
          {t(meta.labelKey)}
        </h1>
      </div>

      {/* Date */}
      <span style={{
        fontSize: 12.5, color: '#94A3B8', fontWeight: 500,
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        padding: '4px 10px', borderRadius: 7,
        whiteSpace: 'nowrap',
        display: 'none',
      }}
        className="md-show"
      >
        {today}
      </span>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, color: '#94A3B8',
        }} />
        <input
          type="search" placeholder={t('header.searchPlaceholder')}
          style={{
            paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
            border: '1.5px solid #E2E8F0', borderRadius: 8,
            fontSize: 13, color: '#0F172A', background: '#F8FAFC',
            outline: 'none', width: 220, transition: 'all 0.15s',
          }}
          onFocus={e => {
            e.target.style.borderColor = '#4F46E5'
            e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)'
            e.target.style.background = 'white'
          }}
          onBlur={e => {
            e.target.style.borderColor = '#E2E8F0'
            e.target.style.boxShadow = 'none'
            e.target.style.background = '#F8FAFC'
          }}
        />
      </div>

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Notifications */}
      <Link to="/notifications" style={{
        position: 'relative',
        width: 38, height: 38,
        borderRadius: 9,
        background: '#F8FAFC',
        border: '1.5px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#64748B', transition: 'all 0.15s',
        flexShrink: 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.color = '#4F46E5'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
      >
        <Bell style={{ width: 17, height: 17 }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, padding: '0 4px',
            background: '#EF4444', color: 'white',
            fontSize: 10, fontWeight: 700,
            borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: '#E2E8F0' }} />

      {/* User */}
      <Link to="/profile" style={{
        display: 'flex', alignItems: 'center', gap: 9,
        textDecoration: 'none',
        padding: '6px 10px 6px 6px',
        borderRadius: 9, transition: 'background 0.15s',
        flexShrink: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials || 'U'}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
            {user?.first_name || t('header.user')}
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8' }}>
            {user?.is_superuser ? t('nav.roles.superadmin') : t('header.profileLabel')}
          </p>
        </div>
      </Link>
    </header>
  )
}
