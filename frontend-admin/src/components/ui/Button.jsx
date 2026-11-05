import { Loader2 } from 'lucide-react'

const BASE = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontWeight: 600, border: 'none', cursor: 'pointer',
  transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
  userSelect: 'none', fontFamily: 'inherit',
  whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '-0.01em',
  borderRadius: 9,
}
const SIZES = {
  xs: { fontSize: 11.5, padding: '4px 10px', height: 26 },
  sm: { fontSize: 12.5, padding: '5px 12px', height: 30 },
  md: { fontSize: 13.5, padding: '7px 16px', height: 36 },
  lg: { fontSize: 14.5, padding: '9px 22px', height: 42 },
}
const V = {
  primary:   { n: { background: '#4F46E5', color: '#fff', boxShadow: '0 1px 3px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }, h: { background: '#4338CA', boxShadow: '0 4px 14px rgba(79,70,229,0.45)' } },
  secondary: { n: { background: '#fff', color: '#374151', border: '1.5px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }, h: { background: '#F8FAFC', borderColor: '#CBD5E1' } },
  danger:    { n: { background: '#EF4444', color: '#fff', boxShadow: '0 1px 3px rgba(239,68,68,0.3)' }, h: { background: '#DC2626', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' } },
  ghost:     { n: { background: 'transparent', color: '#64748B' }, h: { background: '#F1F5F9', color: '#374151' } },
  success:   { n: { background: '#10B981', color: '#fff', boxShadow: '0 1px 3px rgba(16,185,129,0.3)' }, h: { background: '#059669', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' } },
  warning:   { n: { background: '#F59E0B', color: '#fff', boxShadow: '0 1px 3px rgba(245,158,11,0.3)' }, h: { background: '#D97706' } },
  outline:   { n: { background: 'transparent', color: '#4F46E5', border: '1.5px solid #4F46E5' }, h: { background: '#EEF2FF' } },
}

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  icon: Icon, iconRight: IconRight,
  style: extra = {}, onClick, type = 'button', ...rest
}) {
  const v = V[variant] || V.primary
  const s = SIZES[size] || SIZES.md
  const off = disabled || loading
  return (
    <button
      type={type} onClick={onClick} disabled={off}
      style={{ ...BASE, ...s, ...v.n, ...extra, opacity: off ? 0.52 : 1, cursor: off ? 'not-allowed' : 'pointer', border: v.n.border || 'none' }}
      onMouseEnter={e => { if (!off) Object.assign(e.currentTarget.style, v.h) }}
      onMouseLeave={e => { if (!off) { Object.assign(e.currentTarget.style, { ...v.n, opacity: '1', transform: 'scale(1)' }) } }}
      onMouseDown={e => { if (!off) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      {...rest}
    >
      {loading
        ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
        : Icon && <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />}
      {children}
      {IconRight && !loading && <IconRight style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.7 }} />}
    </button>
  )
}

export function IconButton({ icon: Icon, size = 'md', variant = 'ghost', tooltip, disabled, onClick, style: extra = {}, ...rest }) {
  const sz = { xs: 26, sm: 30, md: 34, lg: 40 }[size] || 34
  const ic = { xs: 12, sm: 14, md: 16, lg: 18 }[size] || 16
  const v = V[variant] || V.ghost
  return (
    <button
      onClick={onClick} disabled={disabled} title={tooltip}
      style={{ width: sz, height: sz, borderRadius: 8, border: v.n.border || 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', flexShrink: 0, ...v.n, opacity: disabled ? 0.5 : 1, ...extra }}
      onMouseEnter={e => { if (!disabled) Object.assign(e.currentTarget.style, v.h) }}
      onMouseLeave={e => { if (!disabled) { Object.assign(e.currentTarget.style, { ...v.n, opacity: '1', transform: 'scale(1)' }) } }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.9)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      {...rest}
    >
      <Icon style={{ width: ic, height: ic }} />
    </button>
  )
}
