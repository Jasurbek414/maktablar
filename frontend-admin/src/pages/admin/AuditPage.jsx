import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { usersAPI } from '../../api/auth'
import { format } from 'date-fns'

const ACTION_CFG = {
  CREATE: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Yaratish' },
  UPDATE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Yangilash' },
  DELETE: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: "O'chirish" },
  LOGIN:  { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', label: 'Kirish' },
  LOGOUT: { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Chiqish' },
}

const cardStyle = {
  background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
}

const selectStyle = {
  padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13,
  color: '#0F172A', background: 'white', outline: 'none', appearance: 'none',
  paddingRight: 32,
}

function ActionChip({ action }) {
  const cfg = ACTION_CFG[action] || { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: action }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 6, fontSize: 11.5, fontWeight: 700,
    }}>
      {cfg.label || action}
    </span>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 25

  const load = useCallback(() => {
    setLoading(true)
    usersAPI.getAuditLogs({ search, action: filterAction || undefined, page, page_size: PAGE_SIZE })
      .then(r => {
        setLogs(r.data.results || [])
        setTotal(r.data.count || 0)
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [search, filterAction, page])

  useEffect(() => { load() }, [load])

  const formatDate = (d) => {
    try { return format(new Date(d), 'dd.MM.yy HH:mm') } catch { return d }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Audit loglari</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Tizimda barcha o'zgarishlar tarixi</p>
        </div>
        <button onClick={load} style={{
          padding: '9px', border: '1px solid #E2E8F0', borderRadius: 10, background: 'white',
          cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center',
          transition: 'all 0.15s',
        }}
          title="Yangilash"
          onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; e.currentTarget.style.borderColor = '#C7D2FE' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0' }}
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Jami: </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{total}</span>
          <span style={{ fontSize: 13, color: '#94A3B8' }}> ta log</span>
        </div>
        {Object.entries(ACTION_CFG).map(([key, cfg]) => (
          <button key={key} onClick={() => { setFilterAction(filterAction === key ? '' : key); setPage(1) }}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: filterAction === key ? cfg.bg : 'white',
              color: filterAction === key ? cfg.color : '#64748B',
              border: `1px solid ${filterAction === key ? cfg.border : '#E2E8F0'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Foydalanuvchi yoki ob'ekt bo'yicha qidirish..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #E2E8F0',
              borderRadius: 9, fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            style={selectStyle}>
            <option value="">Barcha amallar</option>
            {Object.entries(ACTION_CFG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1.5fr 100px 1fr 2fr', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          {["Vaqt", "Foydalanuvchi", "Amal", "Model", "Ob'ekt"].map((h, i) => (
            <div key={i} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '24px 16px' }}><TableSkeleton rows={8} cols={5} /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Loglar yo'q" description="Hozircha hech qanday amal qayd etilmagan" />
        ) : logs.map((log, i) => (
          <div key={log.id || i} style={{
            display: 'grid', gridTemplateColumns: '130px 1.5fr 100px 1fr 2fr',
            alignItems: 'center',
            borderBottom: i < logs.length - 1 ? '1px solid #F8FAFC' : 'none',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFBFD'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Time */}
            <div style={{ padding: '11px 16px' }}>
              <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                {formatDate(log.created_at)}
              </span>
            </div>
            {/* User */}
            <div style={{ padding: '11px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, background: '#EEF2FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#4F46E5', flexShrink: 0,
                }}>
                  {(log.user_name || log.user || '?')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {log.user_name || log.user || '—'}
                </span>
              </div>
            </div>
            {/* Action */}
            <div style={{ padding: '11px 16px' }}>
              <ActionChip action={log.action} />
            </div>
            {/* Model */}
            <div style={{ padding: '11px 16px', fontSize: 12.5, color: '#64748B' }}>
              {log.model_name || '—'}
            </div>
            {/* Object */}
            <div style={{ padding: '11px 16px', fontSize: 12.5, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {log.object_repr || '—'}
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Jami {total} ta log</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white',
                cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> Oldingi
              </button>
              <span style={{ fontSize: 13, color: '#64748B', padding: '0 6px' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{
                padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1,
                fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Keyingi <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
