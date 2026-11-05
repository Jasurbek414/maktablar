import { Bell, Search, ChevronRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

const PAGE_META = {
  '/dashboard':    { label: 'Dashboard',           breadcrumb: [] },
  '/users':        { label: 'Foydalanuvchilar',    breadcrumb: ['Boshqaruv'] },
  '/regions':      { label: 'Tashkilotlar',        breadcrumb: ['Boshqaruv'] },
  '/schools':      { label: 'Maktablar',           breadcrumb: ['Tashkilotlar'] },
  '/districts':    { label: 'Tumanlar',            breadcrumb: ['Tashkilotlar'] },
  '/organizations':{ label: 'Tashkilotlar',        breadcrumb: [] },
  '/classes':      { label: 'Sinflar',             breadcrumb: ["Ta'lim"] },
  '/students':     { label: "O'quvchilar",         breadcrumb: ["Ta'lim"] },
  '/teachers':     { label: "O'qituvchilar",       breadcrumb: ["Ta'lim"] },
  '/parents':      { label: 'Ota-onalar',          breadcrumb: ["Ta'lim"] },
  '/devices':      { label: 'Face ID Qurilmalar',  breadcrumb: ['Qurilmalar'] },
  '/attendance':   { label: 'Davomad',             breadcrumb: ['Tahlil'] },
  '/reports':      { label: 'Hisobotlar',          breadcrumb: ['Tahlil'] },
  '/notifications':{ label: 'Bildirishnomalar',   breadcrumb: [] },
  '/profile':      { label: 'Profil',             breadcrumb: ['Sozlamalar'] },
  '/telegram':     { label: 'Telegram Bot',        breadcrumb: [] },
  '/audit':        { label: 'Audit Loglari',       breadcrumb: ['Boshqaruv'] },
}

export function Header({ onToggleSidebar, sidebarCollapsed }) {
  const { user } = useSelector(state => state.auth)
  const { unreadCount } = useSelector(state => state.notifications)
  const location = useLocation()

  const meta = PAGE_META[location.pathname] || { label: 'Sahifa', breadcrumb: [] }
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase()
  const today = format(new Date(), "d MMMM, yyyy", { locale: uz })

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
        {meta.breadcrumb.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{crumb}</span>
            <ChevronRight style={{ width: 13, height: 13, color: '#CBD5E1' }} />
          </span>
        ))}
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
          {meta.label}
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
          type="search" placeholder="Qidirish... (Ctrl+K)"
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
            {user?.first_name || 'Foydalanuvchi'}
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8' }}>
            {user?.is_superuser ? 'Super Admin' : 'Profil'}
          </p>
        </div>
      </Link>
    </header>
  )
}
