export function Card({ children, className = '', padding = true, hover = false, style: extra = {} }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        ...extra,
      }}
      className={className}
      onMouseEnter={hover ? e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#E2E8F0'; } : undefined}
    >
      {padding ? <div style={{ padding: 20 }}>{children}</div> : children}
    </div>
  )
}

const STAT_COLORS = {
  indigo:  { bg: 'linear-gradient(135deg, #4F46E5, #6366F1)', light: '#EEF2FF', text: '#4F46E5' },
  emerald: { bg: 'linear-gradient(135deg, #10B981, #34D399)', light: '#ECFDF5', text: '#059669' },
  amber:   { bg: 'linear-gradient(135deg, #F59E0B, #FCD34D)', light: '#FFFBEB', text: '#D97706' },
  red:     { bg: 'linear-gradient(135deg, #EF4444, #F87171)', light: '#FEF2F2', text: '#DC2626' },
  violet:  { bg: 'linear-gradient(135deg, #7C3AED, #A78BFA)', light: '#F5F3FF', text: '#7C3AED' },
  blue:    { bg: 'linear-gradient(135deg, #3B82F6, #60A5FA)', light: '#EFF6FF', text: '#2563EB' },
  cyan:    { bg: 'linear-gradient(135deg, #06B6D4, #22D3EE)', light: '#ECFEFF', text: '#0891B2' },
  pink:    { bg: 'linear-gradient(135deg, #EC4899, #F472B6)', light: '#FDF2F8', text: '#DB2777' },
}

export function StatCard({ title, value, icon: Icon, color = 'indigo', change, sub, loading = false }) {
  const c = STAT_COLORS[color] || STAT_COLORS.indigo
  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'flex-start',
      gap: 14, overflow: 'hidden', position: 'relative',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Decorative background */}
      <div style={{
        position: 'absolute', right: -16, bottom: -16,
        width: 80, height: 80, borderRadius: '50%',
        background: c.light, opacity: 0.6,
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${c.text}33`,
      }}>
        <Icon style={{ width: 21, height: 21, color: 'white' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>{title}</p>
        {loading
          ? <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 6 }} />
          : (
            <p style={{
              fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value ?? '—'}
            </p>
          )
        }
        {sub && !loading && (
          <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{sub}</p>
        )}
        {change !== undefined && !loading && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5 }}>
            <span style={{
              fontSize: 11.5, fontWeight: 700,
              color: change >= 0 ? '#059669' : '#DC2626',
              background: change >= 0 ? '#ECFDF5' : '#FEF2F2',
              padding: '1px 7px', borderRadius: 5,
            }}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>kechagidan</span>
          </div>
        )}
      </div>
    </div>
  )
}
