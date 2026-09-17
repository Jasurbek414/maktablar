import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Users, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { studentsAPI } from '../../api/students'
import toast from 'react-hot-toast'

const cardStyle = {
  background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
}

export default function ParentsPage() {
  const { t } = useTranslation()
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  // Qidiruv maydoniga har harf kiritilganda darhol so'rov yubormaslik uchun debounce
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [searchInput])

  const loadParents = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await studentsAPI.getParents({ search, page, page_size: PAGE_SIZE })
      setParents(data.results || data)
      setTotal(data.count || (data.results?.length ?? data.length))
    } catch { toast.error(t('parents.loadError')) }
    finally { setLoading(false) }
  }, [search, page, t])

  useEffect(() => { loadParents() }, [loadParents])

  const registered = parents.filter(p => p.is_registered).length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('parents.title')}</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('parents.subtitle')}</p>
      </div>

      {/* Stats + Search row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: t('common.total'), value: total, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: t('parents.stats.botActive'), value: registered, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: t('parents.stats.pending'), value: total - registered, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.75 }}>{label}</span>
          </div>
        ))}

        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94A3B8' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('parents.searchPlaceholder')}
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13,
              color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2.5fr 1fr', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          {[t('parents.tableHeaders.parent'), t('parents.tableHeaders.phone'), t('parents.tableHeaders.children'), t('parents.tableHeaders.botStatus')].map((h, i) => (
            <div key={i} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '24px 16px' }}><TableSkeleton rows={7} cols={4} /></div>
        ) : parents.length === 0 ? (
          <EmptyState icon={Users} title={t('parents.empty.title')}
            description={t('parents.empty.description')} />
        ) : parents.map((p, idx) => (
          <div key={p.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 2.5fr 1fr',
            alignItems: 'center',
            borderBottom: idx < parents.length - 1 ? '1px solid #F8FAFC' : 'none',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFBFD'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Name */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#16A34A',
              }}>
                {p.first_name?.[0]?.toUpperCase()}{p.last_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{p.last_name} {p.first_name}</p>
                {p.telegram_username && (
                  <p style={{ fontSize: 11.5, color: '#94A3B8' }}>@{p.telegram_username}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#475569', fontFamily: 'monospace' }}>
              {p.phone || '—'}
            </div>

            {/* Children */}
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {p.students?.length > 0 ? p.students.map((s, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE',
                  padding: '2px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                }}>
                  {s.name} {s.class && <span style={{ opacity: 0.6 }}>({s.class})</span>}
                </span>
              )) : (
                <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
              )}
            </div>

            {/* Bot status */}
            <div style={{ padding: '12px 16px' }}>
              {p.is_registered ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                  padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                }}>
                  <MessageCircle style={{ width: 11, height: 11 }} />
                  {t('parents.botActive')}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
                  padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                }}>
                  {t('parents.botPending')}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>{t('parents.totalCount', { count: total })}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white',
                cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} /> {t('common.previous')}
              </button>
              <span style={{ fontSize: 13, color: '#64748B', padding: '0 6px' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{
                padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1,
                fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {t('common.next')} <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
