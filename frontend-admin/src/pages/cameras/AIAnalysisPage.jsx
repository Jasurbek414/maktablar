import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BrainCircuit, AlertTriangle, CheckCircle2, ListVideo, RefreshCw, Camera as CameraIcon, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { camerasAPI } from '../../api/cameras'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const TYPE_KEYS = {
  MOTION: 'motion',
  PERSON_DETECTED: 'personDetected',
  CROWD: 'crowd',
  UNAUTHORIZED_ACCESS: 'unauthorizedAccess',
  EQUIPMENT_ISSUE: 'equipmentIssue',
  OTHER: 'other',
}
const SEVERITY_KEYS = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }
const SEVERITY_COLORS = { LOW: '#3B82F6', MEDIUM: '#F59E0B', HIGH: '#EF4444' }
const TYPE_COLORS = ['#4F46E5', '#0891B2', '#7C3AED', '#DC2626', '#D97706', '#64748B']

const cardStyle = { background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }

function KpiCard({ label, value, color, borderColor }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${borderColor || '#E2E8F0'}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.payload?.fill }} />
          <span style={{ fontSize: 12, color: '#64748B' }}>{p.name}: </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AIAnalysisPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(30)

  const load = useCallback(async (d) => {
    setLoading(true)
    try {
      const { data } = await camerasAPI.getEventStats({ days: d })
      setStats(data)
      setError(null)
    } catch (e) {
      setError(t('cameras.aiAnalysis.loadError'))
    } finally { setLoading(false) }
  }, [t])

  useEffect(() => { load(days) }, [days, load])

  const severityData = stats ? Object.entries(stats.bySeverity || {}).map(([k, v]) => ({
    name: t(`cameras.severity.${SEVERITY_KEYS[k] || 'low'}`, { defaultValue: k }), value: v, fill: SEVERITY_COLORS[k] || '#94A3B8',
  })) : []
  const typeData = stats ? Object.entries(stats.byType || {})
    .filter(([, v]) => v > 0)
    .map(([k, v], i) => ({ name: t(`cameras.eventTypes.${TYPE_KEYS[k] || 'other'}`, { defaultValue: k }), value: v, fill: TYPE_COLORS[i % TYPE_COLORS.length] })) : []
  const trendData = stats ? (stats.dailyTrend || []).map(p => ({ date: p.date.slice(5), [t('cameras.aiAnalysis.trendSeriesName')]: p.count })) : []
  const trendKey = t('cameras.aiAnalysis.trendSeriesName')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('cameras.aiAnalysis.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('cameras.aiAnalysis.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A', background: 'white', outline: 'none' }}>
            <option value={7}>{t('cameras.aiAnalysis.periods.last7')}</option>
            <option value={30}>{t('cameras.aiAnalysis.periods.last30')}</option>
            <option value={90}>{t('cameras.aiAnalysis.periods.last90')}</option>
          </select>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => load(days)} loading={loading}>{t('common.refresh')}</Button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#991B1B', fontSize: 13 }}>
          {error} — <button onClick={() => load(days)} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontSize: 13 }}>{t('cameras.aiAnalysis.retry')}</button>
        </div>
      )}

      {loading && !stats ? (
        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
      ) : !stats || stats.totalEvents === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={BrainCircuit} title={t('cameras.aiAnalysis.empty.title')}
            description={t('cameras.aiAnalysis.empty.description')}
            action={
              <div style={{ display: 'flex', gap: 10 }}>
                <Button icon={CameraIcon} onClick={() => navigate('/cameras')}>{t('cameras.aiAnalysis.addCameraBtn')}</Button>
                <Button variant="secondary" icon={Plus} onClick={() => navigate('/camera-analysis')}>{t('cameras.aiAnalysis.addEventBtn')}</Button>
              </div>
            } />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <KpiCard label={t('cameras.aiAnalysis.kpi.total')} value={stats.totalEvents} color="#0F172A" borderColor="#E2E8F0" />
            <KpiCard label={t('cameras.aiAnalysis.kpi.unresolved')} value={stats.unresolvedCount} color="#DC2626" borderColor="#FECACA" />
            <KpiCard label={t('cameras.aiAnalysis.kpi.resolved')} value={stats.totalEvents - stats.unresolvedCount} color="#059669" borderColor="#A7F3D0" />
            <KpiCard label={t('cameras.aiAnalysis.kpi.resolveRate')}
              value={stats.totalEvents ? `${Math.round(((stats.totalEvents - stats.unresolvedCount) / stats.totalEvents) * 100)}%` : '0%'}
              color="#4F46E5" borderColor="#C7D2FE" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('cameras.aiAnalysis.severityChartTitle')}</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('cameras.aiAnalysis.typeChartTitle')}</p>
              {typeData.length === 0 ? (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>{t('common.noData')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {typeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>{t('cameras.aiAnalysis.dailyTrendTitle', { days })}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={trendKey} fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListVideo style={{ width: 16, height: 16, color: '#64748B' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t('cameras.aiAnalysis.topCamerasTitle')}</p>
            </div>
            {(!stats.topCameras || stats.topCameras.length === 0) ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', padding: '28px 0', fontSize: 13 }}>{t('cameras.aiAnalysis.topCamerasEmpty')}</p>
            ) : (
              <div>
                {stats.topCameras.map((tc, i) => (
                  <div key={tc.cameraId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderTop: i === 0 ? 'none' : '1px solid #F8FAFC' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 8, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{tc.cameraName}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>{t('cameras.aiAnalysis.eventCountSuffix', { count: tc.count })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
