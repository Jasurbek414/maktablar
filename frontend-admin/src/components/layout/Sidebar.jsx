import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { logout } from '../../store/authSlice'
import { usePermissions } from '../../hooks/usePermissions'
import {
  LayoutDashboard, Users, MapPin, School, BookOpen, UserSquare,
  Monitor, ClipboardList, BarChart3, Bell, Settings, LogOut,
  GraduationCap, ShieldCheck, MessageCircle, Building2,
  ChevronLeft, ChevronRight, Scan, Home, Camera, ScanLine, BrainCircuit
} from 'lucide-react'

/* ── Nav configuration ──────────────────────────── */
// Har bir item `labelKey` orqali i18n kalitini ko'rsatadi; matnlar
// komponent ichida t() bilan aniqlanadi.
const cameraGroup = {
  labelKey: 'nav.groups.cameras',
  items: [
    { labelKey: 'nav.items.cameras', path: '/cameras', icon: Camera },
    { labelKey: 'nav.items.cameraAnalysis', path: '/camera-analysis', icon: ScanLine },
    { labelKey: 'nav.items.aiAnalysis', path: '/ai-analysis', icon: BrainCircuit },
  ]
}
const navGroups = {
  superadmin: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.management',
      items: [
        { labelKey: 'nav.items.users', path: '/users', icon: Users },
        { labelKey: 'nav.items.regions', path: '/regions', icon: MapPin },
        { labelKey: 'nav.items.districts', path: '/districts', icon: Building2 },
        { labelKey: 'nav.items.schools', path: '/schools', icon: School },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
        { labelKey: 'nav.items.auditLogs', path: '/audit', icon: ShieldCheck },
      ]
    },
    {
      labelKey: 'nav.groups.education',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.teachers', path: '/teachers', icon: UserSquare },
        { labelKey: 'nav.items.parents', path: '/parents', icon: Users },
      ]
    },
    { labelKey: 'nav.groups.devices', items: [{ labelKey: 'nav.items.faceDevices', path: '/devices', icon: Monitor }] },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  // Admin — superadmindan 1 daraja past, lekin hamma viloyatlarni ko'radi/boshqaradi
  // (superadmin/boshqa admin'larni boshqarishdan tashqari — bu backend'da cheklangan).
  admin: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.management',
      items: [
        { labelKey: 'nav.items.users', path: '/users', icon: Users },
        { labelKey: 'nav.items.regions', path: '/regions', icon: MapPin },
        { labelKey: 'nav.items.districts', path: '/districts', icon: Building2 },
        { labelKey: 'nav.items.schools', path: '/schools', icon: School },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
      ]
    },
    {
      labelKey: 'nav.groups.education',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.teachers', path: '/teachers', icon: UserSquare },
        { labelKey: 'nav.items.parents', path: '/parents', icon: Users },
      ]
    },
    { labelKey: 'nav.groups.devices', items: [{ labelKey: 'nav.items.faceDevices', path: '/devices', icon: Monitor }] },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  region_director: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.organizations',
      items: [
        { labelKey: 'nav.items.districts', path: '/districts', icon: Building2 },
        { labelKey: 'nav.items.schools', path: '/schools', icon: School },
      ]
    },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  district_director: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.organizations',
      items: [
        { labelKey: 'nav.items.schools', path: '/schools', icon: School },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
      ]
    },
    {
      labelKey: 'nav.groups.education',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.teachers', path: '/teachers', icon: UserSquare },
      ]
    },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  school_director: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.school',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.teachers', path: '/teachers', icon: UserSquare },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
        { labelKey: 'nav.items.parents', path: '/parents', icon: Users },
      ]
    },
    { labelKey: 'nav.groups.devices', items: [{ labelKey: 'nav.items.faceDevices', path: '/devices', icon: Monitor }] },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  // mudir — school_director bilan bir xil qatlam (maktab darajasida), lekin bu panel
  // (/spd) amalda faqat superadmin uchun ishlatiladi — shuning uchun minimal nav yetarli.
  mudir: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.school',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
      ]
    },
    { labelKey: 'nav.groups.analysis', items: [{ labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList }] },
  ],
  operator: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.education',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.teachers', path: '/teachers', icon: UserSquare },
        { labelKey: 'nav.items.classes', path: '/classes', icon: BookOpen },
        { labelKey: 'nav.items.parents', path: '/parents', icon: Users },
      ]
    },
    { labelKey: 'nav.groups.devices', items: [{ labelKey: 'nav.items.faceDevices', path: '/devices', icon: Monitor }] },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  teacher: [
    { labelKey: 'nav.groups.main', items: [{ labelKey: 'nav.items.dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      labelKey: 'nav.groups.education',
      items: [
        { labelKey: 'nav.items.students', path: '/students', icon: GraduationCap },
        { labelKey: 'nav.items.classSchedule', path: '/classes', icon: BookOpen },
      ]
    },
    cameraGroup,
    {
      labelKey: 'nav.groups.analysis',
      items: [
        { labelKey: 'nav.items.attendance', path: '/attendance', icon: ClipboardList },
        { labelKey: 'nav.items.reports', path: '/reports', icon: BarChart3 },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
  parent: [
    {
      labelKey: 'nav.groups.myChildren',
      items: [
        { labelKey: 'nav.items.myChildren', path: '/my-children', icon: Home },
        { labelKey: 'nav.items.attendanceHistory', path: '/attendance', icon: ClipboardList },
      ]
    },
    {
      labelKey: 'nav.groups.other',
      items: [
        { labelKey: 'nav.items.cameras', path: '/cameras', icon: Camera },
        { labelKey: 'nav.items.cameraAnalysis', path: '/camera-analysis', icon: ScanLine },
        { labelKey: 'nav.items.aiAnalysis', path: '/ai-analysis', icon: BrainCircuit },
        { labelKey: 'nav.items.telegramBot', path: '/telegram', icon: MessageCircle },
      ]
    },
  ],
}

const ROLE_COLORS = {
  superadmin: 'bg-violet-500',
  admin: 'bg-fuchsia-500',
  region_director: 'bg-blue-500',
  district_director: 'bg-cyan-500',
  school_director: 'bg-emerald-500',
  mudir: 'bg-lime-500',
  operator: 'bg-orange-500',
  teacher: 'bg-amber-500',
  parent: 'bg-pink-500',
}

export function Sidebar({ collapsed, onToggle }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { primaryRole } = usePermissions()
  const { user } = useSelector(state => state.auth)

  const groups = navGroups[primaryRole] || navGroups.operator
  const roleLabel = t(`nav.roles.${primaryRole}`, { defaultValue: primaryRole })
  const roleColor = ROLE_COLORS[primaryRole] || 'bg-indigo-500'

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase()

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        background: '#0F172A',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 12, padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
        }}>
          <Scan style={{ width: 18, height: 18, color: 'white' }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {t('common.appName')}
            </p>
            <p style={{ color: '#6366F1', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap' }}>
              {t('common.appTagline')}
            </p>
          </div>
        )}
      </div>

      {/* User profile */}
      {!collapsed && user && (
        <div style={{
          margin: '12px 10px',
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials || 'U'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '1px 7px', borderRadius: 999,
              background: 'rgba(79,70,229,0.2)', color: '#A5B4FC',
              display: 'inline-block', marginTop: 2,
            }}>
              {roleLabel}
            </span>
          </div>
        </div>
      )}

      {collapsed && user && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px', flexShrink: 0 }}>
          <div
            title={user.full_name || roleLabel}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}>
            {initials || 'U'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px 8px' }}>
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#334155',
                padding: '10px 12px 4px',
              }}>
                {t(group.labelKey)}
              </div>
            )}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
            )}
            {group.items.map(({ labelKey, path, icon: Icon }) => {
              const label = t(labelKey)
              return (
              <NavLink
                key={path}
                to={path}
                title={collapsed ? label : ''}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  gap: 10, padding: collapsed ? '9px' : '8px 12px',
                  borderRadius: 8,
                  color: isActive ? '#C7D2FE' : '#94A3B8',
                  background: isActive ? 'rgba(79,70,229,0.18)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s',
                  marginBottom: 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                })}
                className={({ isActive }) => isActive ? '' : 'sidebar-hover'}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: 3, borderRadius: '0 3px 3px 0',
                        background: '#6366F1',
                      }} />
                    )}
                    <Icon style={{
                      width: 17, height: 17, flexShrink: 0,
                      color: isActive ? '#818CF8' : 'currentColor',
                    }} />
                    {!collapsed && label}
                  </>
                )}
              </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom utility */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px',
        flexShrink: 0,
      }}>
        <NavLink to="/notifications"
          title={collapsed ? t('nav.items.notifications') : ''}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px' : '8px 12px',
            borderRadius: 8,
            color: isActive ? '#C7D2FE' : '#94A3B8',
            background: isActive ? 'rgba(79,70,229,0.18)' : 'transparent',
            textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
            transition: 'all 0.15s', marginBottom: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
          })}>
          <Bell style={{ width: 17, height: 17, flexShrink: 0 }} />
          {!collapsed && t('nav.items.notifications')}
        </NavLink>

        <NavLink to="/profile"
          title={collapsed ? t('header.profileLabel') : ''}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px' : '8px 12px',
            borderRadius: 8,
            color: isActive ? '#C7D2FE' : '#94A3B8',
            background: isActive ? 'rgba(79,70,229,0.18)' : 'transparent',
            textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
            transition: 'all 0.15s', marginBottom: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
          })}>
          <Settings style={{ width: 17, height: 17, flexShrink: 0 }} />
          {!collapsed && t('nav.items.profileSettings')}
        </NavLink>

        <button onClick={handleLogout}
          title={collapsed ? t('nav.items.logout') : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px' : '8px 12px',
            borderRadius: 8, background: 'none', border: 'none',
            color: '#94A3B8', cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
            transition: 'all 0.15s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#FCA5A5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <LogOut style={{ width: 17, height: 17, flexShrink: 0 }} />
          {!collapsed && t('nav.items.logout')}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', top: 20, right: -12,
          width: 24, height: 24,
          borderRadius: '50%',
          background: '#1E293B',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#94A3B8',
          transition: 'all 0.15s', zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.color = '#94A3B8'; }}
      >
        {collapsed
          ? <ChevronRight style={{ width: 13, height: 13 }} />
          : <ChevronLeft style={{ width: 13, height: 13 }} />}
      </button>
    </aside>
  )
}
