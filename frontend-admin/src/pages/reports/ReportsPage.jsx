import { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, TrendingUp, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { reportsAPI } from '../../api/reports'
import { attendanceAPI } from '../../api/attendance'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

const cardStyle = {
  background: 'white',
  border: '1px solid #E2E8F0',
  borderRadius: 16,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: 9,
  fontSize: 13,
  color: '#0F172A',
  outline: 'none',
  background: 'white',
  cursor: 'pointer',
}

function KpiCard({ label, value, color, bg, borderColor, change }) {
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${borderColor || '#E2E8F0'}`,
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</p>
      {change != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {change >= 0
            ? <ArrowUp style={{ width: 12, height: 12, color: '#10B981' }} />
            : <ArrowDown style={{ width: 12, height: 12, color: '#EF4444' }} />}
          <span style={{ fontSize: 11.5, fontWeight: 600, color: change >= 0 ? '#10B981' : '#EF4444' }}>
            {Math.abs(change)}%
          </span>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 12, color: '#64748B' }}>{p.name}: </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
            {typeof p.value === 'number' && p.name.includes('%') ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('daily')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [exporting, setExporting] = useState(false)

  const TABS = [
    { id: 'daily', label: t('reports.tabs.daily'), icon: '📅' },
    { id: 'weekly', label: t('reports.tabs.weekly'), icon: '📊' },
    { id: 'monthly', label: t('reports.tabs.monthly'), icon: '📈' },
  ]
  const MONTHS = t('reports.months', { returnObjects: true })

  // Recharts dataKey qatorlarini tarjima qilingan seriya nomlari bilan ishlatish uchun
  // (Legend/Tooltip'da ko'rinadigan nom bilan data obyekti kaliti bir xil bo'lishi shart).
  const kPresent = t('reports.kpi.present')
  const kLate = t('reports.kpi.late')
  const kAbsent = t('reports.kpi.absent')
  const kRate = t('reports.kpi.rate')

  useEffect(() => { loadData() }, [tab, selectedDate, year, month])

  const loadData = async () => {
    setLoading(true)
    try {
      let res
      if (tab === 'daily') {
        res = await reportsAPI.getDaily({ date: selectedDate })
      } else if (tab === 'weekly') {
        const end = selectedDate
        const start = format(subDays(new Date(selectedDate), 6), 'yyyy-MM-dd')
        res = await reportsAPI.getWeekly({ start_date: start, end_date: end })
      } else {
        res = await reportsAPI.getMonthly({ year, month })
      }
      setData(res.data)
    } catch {
      toast.error(t('reports.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = {}
      if (tab === 'daily') {
        params.date = selectedDate
      } else if (tab === 'weekly') {
        params.end_date = selectedDate
        params.start_date = format(subDays(new Date(selectedDate), 6), 'yyyy-MM-dd')
      } else {
        params.year = year
        params.month = month
      }
      const res = await attendanceAPI.exportExcel(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `hisobot_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(t('reports.exportSuccess'))
    } catch {
      toast.error(t('reports.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const renderDaily = () => {
    if (!data) return null
    const classData = (data.class_breakdown || []).map(c => ({
      name: c.student__class_ref__name || '',
      [kPresent]: c.present || 0,
      [kLate]: c.late || 0,
      [kAbsent]: c.absent || 0,
    }))
    const rate = data.attendance_rate || 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KpiCard label={t('reports.kpi.totalStudents')} value={data.total || 0} color="#0F172A" borderColor="#E2E8F0" />
          <KpiCard label={kPresent} value={data.present || 0} color="#059669" borderColor="#A7F3D0" />
          <KpiCard label={kLate} value={data.late || 0} color="#D97706" borderColor="#FDE68A" />
          <KpiCard label={kAbsent} value={data.absent || 0} color="#DC2626" borderColor="#FECACA" />
        </div>

        {/* Attendance rate */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t('reports.attendanceRate')}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{t('reports.todayOverall')}</p>
            </div>
            <span style={{
              fontSize: 28, fontWeight: 900,
              color: rate >= 90 ? '#059669' : rate >= 75 ? '#D97706' : '#DC2626',
            }}>{rate}%</span>
          </div>
          <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${rate}%`,
              background: rate >= 90
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : rate >= 75
                ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                : 'linear-gradient(90deg, #F87171, #DC2626)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Class breakdown chart */}
        {classData.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('reports.classBreakdown')}</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey={kPresent} fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={kLate} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey={kAbsent} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )
  }

  const renderWeekly = () => {
    if (!data?.daily) return null
    const chartData = Object.entries(data.daily).map(([date, stats]) => ({
      date: date.slice(5),
      [kRate]: stats.attendance_rate || 0,
      [kPresent]: stats.present || 0,
      [kAbsent]: stats.absent || 0,
    }))
    const ov = data.overall || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KpiCard label={kPresent} value={ov.present || 0} color="#059669" borderColor="#A7F3D0" />
          <KpiCard label={kLate} value={ov.late || 0} color="#D97706" borderColor="#FDE68A" />
          <KpiCard label={kAbsent} value={ov.absent || 0} color="#DC2626" borderColor="#FECACA" />
          <KpiCard label={kRate} value={`${ov.attendance_rate || 0}%`} color="#4F46E5" borderColor="#C7D2FE" />
        </div>

        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('reports.weeklyTrend')}</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={kRate}
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#areaGrad)"
                dot={{ r: 5, fill: '#4F46E5', strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 7 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('reports.presentVsAbsent')}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey={kPresent} fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey={kAbsent} fill="#F87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderMonthly = () => {
    if (!data) return null
    const weekData = Object.entries(data.weekly || {}).map(([w, stats]) => ({
      name: `${t('reports.week')} ${w}`,
      [kRate]: stats.attendance_rate || 0,
      [kPresent]: stats.present || 0,
      [kAbsent]: stats.absent || 0,
    }))
    // Backend returns stats directly at root level (not under 'overall')
    const ov = data.overall || data || {}

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KpiCard label={t('reports.kpi.total')} value={ov.total || 0} color="#0F172A" borderColor="#E2E8F0" />
          <KpiCard label={kPresent} value={ov.present || 0} color="#059669" borderColor="#A7F3D0" />
          <KpiCard label={kAbsent} value={ov.absent || 0} color="#DC2626" borderColor="#FECACA" />
          <KpiCard label={kRate} value={`${ov.attendance_rate || 0}%`} color="#4F46E5" borderColor="#C7D2FE" />
        </div>

        {weekData.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('reports.weeklyRate')} ({MONTHS[month - 1]})</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey={kRate} stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 5, fill: '#4F46E5', strokeWidth: 2, stroke: 'white' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly class breakdown */}
        {(data.class_breakdown || []).length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t('reports.monthlyClassBreakdown')}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {[t('reports.tableHeaders.class'), t('reports.tableHeaders.total'), kPresent, kLate, kAbsent, kRate].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.class_breakdown.map((c, i) => {
                  const rate = c.total ? Math.round((c.present / c.total) * 100) : 0
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.student__class_ref__name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{c.total || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{c.present || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#D97706', fontWeight: 600 }}>{c.late || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{c.absent || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: rate >= 90 ? '#10B981' : rate >= 75 ? '#F59E0B' : '#EF4444', borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: rate >= 90 ? '#059669' : rate >= 75 ? '#D97706' : '#DC2626' }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('reports.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('reports.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadData} loading={loading}>{t('reports.refresh')}</Button>
          <Button size="sm" icon={Download} onClick={handleExport} loading={exporting}>{t('reports.export')}</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, width: 'fit-content' }}>
        {TABS.map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
            padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: tab === tabItem.id ? '#4F46E5' : 'transparent',
            color: tab === tabItem.id ? 'white' : '#64748B',
            boxShadow: tab === tabItem.id ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
          }}>
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Calendar style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
        {tab === 'daily' && (
          <input type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            style={inputStyle}
          />
        )}
        {tab === 'weekly' && (
          <>
            <span style={{ fontSize: 13, color: '#64748B' }}>{t('reports.weekEndLabel')}</span>
            <input type="date" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              style={inputStyle}
            />
          </>
        )}
        {tab === 'monthly' && (
          <>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inputStyle, paddingRight: 28 }}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inputStyle, paddingRight: 28 }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={cardStyle}>
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : !data ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={BarChart3} title={t('reports.noData')} description={t('reports.noDataDescription')} />
        </div>
      ) : (
        tab === 'daily' ? renderDaily() :
        tab === 'weekly' ? renderWeekly() :
        renderMonthly()
      )}
    </div>
  )
}
