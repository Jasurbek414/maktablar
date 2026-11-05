const STATUS_CONFIG = {
  present:  { label: 'Keldi',       bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  late:     { label: 'Kech keldi',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  absent:   { label: 'Kelmadi',     bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  excused:  { label: 'Sababli',     bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', dot: '#3B82F6' },
  online:   { label: 'Online',      bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  offline:  { label: 'Offline',     bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
  syncing:  { label: 'Sinxron',     bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE', dot: '#7C3AED' },
  error:    { label: 'Xatolik',     bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  active:   { label: 'Faol',        bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  pending:  { label: 'Kutilmoqda',  bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  inactive: { label: 'Nofaol',      bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
  none:     { label: 'Ulanmagan',   bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
}

export function StatusBadge({ status, showDot = true }) {
  const c = STATUS_CONFIG[status] || { label: status, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' }
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
      {c.label}
    </span>
  )
}

const ROLE_CONFIG = {
  superadmin:       { label: 'Super Admin',      bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  region_director:  { label: 'Viloyat Dir.',     bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  district_director:{ label: 'Tuman Dir.',       bg: '#ECFEFF', color: '#164E63', border: '#A5F3FC' },
  school_director:  { label: 'Maktab Dir.',      bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  operator:         { label: 'Operator',         bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  teacher:          { label: "O'qituvchi",       bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  parent:           { label: 'Ota-ona',          bg: '#FDF2F8', color: '#9D174D', border: '#FBCFE8' },
}

export function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || { label: role, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {c.label}
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
