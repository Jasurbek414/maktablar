import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, ChevronLeft, ChevronRight, Calendar,
  Users, CheckCircle, Clock, XCircle, BookOpen, Filter,
  ClipboardList
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { attendanceAPI } from '../../api/attendance'
import { orgAPI } from '../../api/organizations'
import { format, subDays, addDays } from 'date-fns'
import { uz } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { usePermissions } from '../../hooks/usePermissions'

const STATUS_ROW_COLORS = {
  present: { bg: 'transparent', border: '#dcfce7', left: '#10B981' },
  late:    { bg: '#fffbeb',      border: '#fde68a', left: '#F59E0B' },
  absent:  { bg: '#fef2f2',      border: '#fecaca', left: '#EF4444' },
  excused: { bg: '#eff6ff',      border: '#bfdbfe', left: '#3B82F6' },
}

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
      padding: '12px 18px', flex: 1, minWidth: 140,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div>
        <p style={{ fontSize: 21, fontWeight: 800, color: '#0F172A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        <p style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{label}</p>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const { isOperator, isSuperAdmin, isSchoolDirector } = usePermissions()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState({})
  const [classes, setClasses] = useState([])
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { date: selectedDate, page, page_size: PAGE_SIZE }
      if (search) params.search = search
      if (classFilter) params.class_ref = classFilter
      if (statusFilter) params.status = statusFilter

      const [attRes, statsRes] = await Promise.all([
        attendanceAPI.getAttendance(params),
        attendanceAPI.getStatistics({ start_date: selectedDate, end_date: selectedDate }),
      ])
      setRecords(attRes.data.results || attRes.data)
      setStats(statsRes.data || {})
    } catch {
      toast.error("Ma'lumot yuklanmadi")
    } finally {
      setLoading(false)
    }
  }, [selectedDate, search, classFilter, statusFilter, page])

  useEffect(() => {
    orgAPI.getClasses({ page_size: 200 }).then(r => setClasses(r.data.results || r.data)).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [selectedDate, search, classFilter, statusFilter])
  useEffect(() => { loadData() }, [loadData])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await attendanceAPI.exportExcel({ date: selectedDate, search })
      const url = URL.createObjectURL(new Blob([res.data]))
      Object.assign(document.createElement('a'), { href: url, download: `davomad_${selectedDate}.xlsx` }).click()
      URL.revokeObjectURL(url)
      toast.success('Excel fayl yuklandi')
    } catch {
      toast.error('Export xatoligi')
    } finally { setExporting(false) }
  }

  const prevDay = () => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))
  const nextDay = () => {
    const d = addDays(new Date(selectedDate), 1)
    if (d <= new Date()) setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const total = stats.total || records.length
  const present = stats.present || records.filter(r => r.status === 'present').length
  const late = stats.late || records.filter(r => r.status === 'late').length
  const absent = stats.absent || records.filter(r => r.status === 'absent').length
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Davomad</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Kunlik davomad yozuvlari va statistika
          </p>
        </div>
        <Button variant="success" size="md" icon={Download} loading={exporting} onClick={handleExport}>
          Excel yuklab olish
        </Button>
      </div>

      {/* ── Date nav + stats ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' }}>

        {/* Date navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <button onClick={prevDay} style={navBtnStyle}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px' }}>
            <Calendar style={{ width: 15, height: 15, color: '#4F46E5' }} />
            <input
              type="date"
              value={selectedDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                border: 'none', outline: 'none', fontSize: 14, fontWeight: 700,
                color: '#0F172A', background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            />
            {isToday && (
              <span style={{
                fontSize: 11, fontWeight: 700, background: '#EEF2FF', color: '#4F46E5',
                padding: '2px 8px', borderRadius: 5,
              }}>Bugun</span>
            )}
          </div>

          <button onClick={nextDay} disabled={isToday} style={{ ...navBtnStyle, opacity: isToday ? 0.3 : 1, cursor: isToday ? 'not-allowed' : 'pointer' }}>
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <StatPill icon={Users}        value={total}   label="Jami"       color="#4F46E5" />
          <StatPill icon={CheckCircle}  value={present} label="Keldi"      color="#10B981" />
          <StatPill icon={Clock}        value={late}    label="Kech keldi" color="#F59E0B" />
          <StatPill icon={XCircle}      value={absent}  label="Kelmadi"    color="#EF4444" />
        </div>
      </div>

      {/* ── Attendance rate bar ── */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Davomad darajasi</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: rate >= 80 ? '#059669' : rate >= 60 ? '#D97706' : '#DC2626' }}>
              {rate}%
            </span>
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${rate}%`,
              background: rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444',
              borderRadius: 999,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
          {[['#10B981', 'Keldi', present], ['#F59E0B', 'Kech', late], ['#EF4444', 'Yo\'q', absent]].map(([c, l, v]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{v}</p>
              <p style={{ fontSize: 10.5, color: c, fontWeight: 600 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '12px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ism yoki ID bo'yicha qidirish..."
            style={{ ...filterInputStyle, paddingLeft: 32 }}
          />
        </div>

        {/* Class filter */}
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={filterInputStyle}>
          <option value="">Barcha sinflar</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterInputStyle}>
          <option value="">Barcha holatlar</option>
          <option value="present">Keldi</option>
          <option value="late">Kech keldi</option>
          <option value="absent">Kelmadi</option>
          <option value="excused">Sababli</option>
        </select>

        {(search || classFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setClassFilter(''); setStatusFilter(''); }}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0',
              background: 'white', fontSize: 12.5, color: '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}
          >
            Tozalash ×
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 100px 100px 100px 110px',
          gap: 8, padding: '10px 16px',
          background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        }}>
          {["O'quvchi", 'Sinf', 'Keldi', 'Ketdi', 'Kechikish', 'Holat'].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 0 ? 'left' : 'center' }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Davomad yozuvlari topilmadi"
            description="Tanlangan sana va filtrlar bo'yicha yozuv mavjud emas"
          />
        ) : (
          records.map((r, i) => {
            const sc = STATUS_ROW_COLORS[r.status] || {}
            return (
              <div key={r.id || i} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 100px 100px 100px 110px',
                gap: 8, padding: '11px 16px',
                borderBottom: i < records.length - 1 ? '1px solid #F8FAFC' : 'none',
                background: sc.bg || 'transparent',
                borderLeft: `3px solid ${sc.left || 'transparent'}`,
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FAFBFF' }}
                onMouseLeave={e => { e.currentTarget.style.background = sc.bg || 'transparent' }}
              >
                {/* Student */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#4F46E5', flexShrink: 0,
                  }}>
                    {r.student_name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
                      {r.student_name || r.student?.full_name || '—'}
                    </p>
                    <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
                      ID: {r.student_id || r.student?.student_id || '—'}
                    </p>
                  </div>
                </div>

                {/* Class */}
                <span style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <BookOpen style={{ width: 13, height: 13, color: '#CBD5E1' }} />
                  {r.class_name || r.student?.class_name || '—'}
                </span>

                {/* Check-in */}
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, textAlign: 'center' }}>
                  {r.check_in_str || (r.check_in ? format(new Date(r.check_in), 'HH:mm') : '—')}
                </span>

                {/* Check-out */}
                <span style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                  {r.check_out_str || (r.check_out ? format(new Date(r.check_out), 'HH:mm') : '—')}
                </span>

                {/* Late minutes */}
                <span style={{ fontSize: 13, textAlign: 'center', color: r.late_minutes > 0 ? '#D97706' : '#94A3B8' }}>
                  {r.late_minutes > 0 ? `${r.late_minutes} daqiqa` : '—'}
                </span>

                {/* Status */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {records.length >= PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page > 1)}>
            ← Oldingi
          </button>
          <span style={{ padding: '7px 14px', fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center' }}>
            Sahifa {page}
          </span>
          <button onClick={() => setPage(p => p + 1)} style={pageBtnStyle(true)}>
            Keyingi →
          </button>
        </div>
      )}
    </div>
  )
}

const navBtnStyle = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
  background: '#F8FAFC', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: '#64748B',
  transition: 'all 0.15s',
}

const filterInputStyle = {
  padding: '7px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#374151', background: 'white', outline: 'none',
  transition: 'all 0.15s', fontFamily: 'inherit', cursor: 'pointer',
}

const pageBtnStyle = (enabled) => ({
  padding: '7px 16px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  background: enabled ? 'white' : '#F8FAFC',
  color: enabled ? '#374151' : '#CBD5E1',
  fontSize: 13, fontWeight: 600,
  cursor: enabled ? 'pointer' : 'not-allowed',
  transition: 'all 0.15s',
})
