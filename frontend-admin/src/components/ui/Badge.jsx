import { useTranslation } from 'react-i18next'

const STATUS_CONFIG = {
  present:  { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  late:     { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  absent:   { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  excused:  { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', dot: '#3B82F6' },
  online:   { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  offline:  { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
  syncing:  { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE', dot: '#7C3AED' },
  error:    { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  active:   { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  pending:  { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  inactive: { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
  none:     { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
}

export function StatusBadge({ status, showDot = true }) {
  const { t } = useTranslation()
  const c = STATUS_CONFIG[status] || { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' }
  const label = STATUS_CONFIG[status] ? t(`status.${status}`) : status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: c.dot, flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  )
}

const ROLE_CONFIG = {
  superadmin:       { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  admin:            { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  region_director:  { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  district_director:{ bg: '#ECFEFF', color: '#164E63', border: '#A5F3FC' },
  school_director:  { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  mudir:            { bg: '#F7FEE7', color: '#3F6212', border: '#D9F99D' },
  operator:         { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  teacher:          { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  parent:           { bg: '#FDF2F8', color: '#9D174D', border: '#FBCFE8' },
}

export function RoleBadge({ role }) {
  const { t } = useTranslation()
  const c = ROLE_CONFIG[role] || { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' }
  const label = ROLE_CONFIG[role] ? t(`roleBadge.${role}`) : role
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function ColorBadge({ children, color = 'slate' }) {
  const COLORS = {
    indigo: { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
    emerald:{ bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    amber:  { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    red:    { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    blue:   { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
    violet: { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
    cyan:   { bg: '#ECFEFF', color: '#164E63', border: '#A5F3FC' },
    slate:  { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
  }
  const c = COLORS[color] || COLORS.slate
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
    }}>
      {children}
    </span>
  )
}
