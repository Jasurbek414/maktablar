import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ size = 'md', text = 'Yuklanmoqda...' }) {
  const sz = { sm: 18, md: 32, lg: 48 }[size] || 32
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
      <Loader2 style={{ width: sz, height: sz, color: '#4F46E5', animation: 'spin 0.75s linear infinite' }} />
      {text && <p style={{ fontSize: 13.5, color: '#94A3B8', fontWeight: 500 }}>{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
        }}>
          <Loader2 style={{ width: 22, height: 22, color: 'white', animation: 'spin 0.75s linear infinite' }} />
        </div>
        <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>Yuklanmoqda...</p>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div>
      {/* Header skeleton */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16, padding: '12px 16px',
        background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 12, borderRadius: 6 }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16, padding: '14px 16px',
          borderBottom: '1px solid #F1F5F9',
          animationDelay: `${i * 80}ms`,
        }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton" style={{ height: 14, borderRadius: 6, width: j === 0 ? '80%' : '60%' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20,
          animationDelay: `${i * 80}ms`,
        }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 11, width: '60%', marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 22, width: '40%', borderRadius: 6 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 10, width: '80%', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
    }}>
      {Icon && (
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
          boxShadow: '0 4px 12px rgba(79,70,229,0.1)',
        }}>
          <Icon style={{ width: 28, height: 28, color: '#818CF8' }} />
        </div>
      )}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 13.5, color: '#64748B', maxWidth: 340, lineHeight: 1.6, marginBottom: 20 }}>{description}</p>
      )}
      {action}
    </div>
  )
}
