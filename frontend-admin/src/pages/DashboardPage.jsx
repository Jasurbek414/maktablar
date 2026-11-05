import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Monitor, CheckCircle, Clock, XCircle,
  RefreshCw, ChevronRight, Activity,
  School, MapPin, Building2, BookOpen,
  ArrowUpRight, TrendingUp, Zap, Wifi
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { PageLoader, EmptyState } from '../components/ui/LoadingSpinner'
import { reportsAPI } from '../api/reports'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { usePermissions } from '../hooks/usePermissions'
import toast from 'react-hot-toast'

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (!target && target !== 0) return
    let timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) raf.current = requestAnimationFrame(animate)
      }
      raf.current = requestAnimationFrame(animate)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf.current) }
  }, [target, duration, delay])
  return value
}

/* ── Color helpers ── */
const RATE_COLOR = (r) => r >= 80 ? '#10B981' : r >= 60 ? '#F59E0B' : '#EF4444'
const RATE_BG    = (r) => r >= 80 ? '#ECFDF5' : r >= 60 ? '#FFFBEB' : '#FEF2F2'

/* ── Fade/slide variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { show: { transition: { staggerChildren: 0.08 } } }
const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    }}>
      <p style={{ color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#E2E8F0' }}>{p.name}:</span>
          <span style={{ color: 'white', fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── KPI Card ── */
const KPI_CFG = {
  total:   { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', glow: 'rgba(102,126,234,0.35)', icon: Users,        light: '#EEF2FF' },
  present: { gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', glow: 'rgba(17,153,142,0.35)',  icon: CheckCircle,  light: '#ECFDF5' },
  late:    { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5a623 100%)', glow: 'rgba(245,166,35,0.35)',  icon: Clock,        light: '#FFFBEB' },
  absent:  { gradient: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)', glow: 'rgba(252,74,26,0.3)',    icon: XCircle,      light: '#FEF2F2' },
  devices: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', glow: 'rgba(79,172,254,0.35)',  icon: Monitor,      light: '#EFF6FF' },
}

function KpiCard({ type, title, value, sub, delay = 0 }) {
  const cfg = KPI_CFG[type]
  const Icon = cfg.icon
  const counted = useCountUp(typeof value === 'number' ? value : 0, 1000, delay)
  const displayVal = typeof value === 'number' ? counted.toLocaleString() : value

  return (
    <motion.div variants={cardVariant} whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        background: 'white', borderRadius: 18,
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden', position: 'relative', cursor: 'default',
      }}>
      {/* Top gradient strip */}
      <div style={{ height: 3, background: cfg.gradient }} />

      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {title}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {displayVal}
            </p>
            {sub && (
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 6, fontWeight: 500 }}>{sub}</p>
            )}
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: cfg.gradient,
            boxShadow: `0 4px 16px ${cfg.glow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon style={{ width: 20, height: 20, color: 'white' }} />
          </div>
        </div>

        {/* Animated mini bar */}
        {typeof value === 'number' && (
          <div style={{ marginTop: 16, height: 3, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (value / (value * 1.3 || 1)) * 100)}%` }}
              transition={{ duration: 1.2, delay: delay / 1000 + 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', borderRadius: 999, background: cfg.gradient }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Hero attendance rate ── */
function HeroRate({ rate, total, present, late, absent }) {
  const countedRate = useCountUp(rate, 1400, 200)
  const color = RATE_COLOR(rate)

  return (
    <motion.div variants={fadeUp}
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
        borderRadius: 22, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(15,23,42,0.35)',
      }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(79,70,229,0.15)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: Title + Rate */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: 16, height: 16, color: '#818CF8' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {format(new Date(), "d MMMM yyyy, EEEE", { locale: uz })}
            </span>
          </div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: '#94A3B8', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Bugungi davomad
          </h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
            >
              {countedRate}
            </motion.span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#94A3B8', paddingBottom: 12 }}>%</span>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: color + '25', border: `1px solid ${color}50`,
              borderRadius: 999, padding: '5px 12px', marginBottom: 14,
            }}>
              <ArrowUpRight style={{ width: 13, height: 13, color }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{rate >= 80 ? 'Yaxshi' : rate >= 60 ? "O'rtacha" : 'Past'}</span>
            </div>
          </div>
        </div>

        {/* Right: 4 mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minWidth: 260 }}>
          {[
            { label: "Jami o'quvchi", value: total, color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
            { label: 'Keldi',         value: present, color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
            { label: 'Kech keldi',    value: late,    color: '#FCD34D', bg: 'rgba(252,211,77,0.15)' },
            { label: 'Kelmadi',       value: absent,  color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
          ].map(({ label, value: v, color: c, bg }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${c}20` }}
            >
              <p style={{ fontSize: 22, fontWeight: 800, color: c, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rate bar */}
      <div style={{ marginTop: 24, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>Davomad ko'rsatkichi</span>
          <span style={{ fontSize: 11.5, color: '#475569' }}>Maqsad: 85%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: '100%', borderRadius: 999,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
              boxShadow: `0 0 12px ${color}60`,
            }}
          />
          {/* Target line at 85% */}
          <div style={{ position: 'absolute', top: 0, left: '85%', width: 2, height: '100%', background: 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)' }} />
        </div>
      </div>
    </motion.div>
  )
}

/* ── Attendance Row ── */
function AttendanceRow({ name, present, late, absent, total, rate, onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      whileHover={onClick ? { backgroundColor: '#F8FAFC' } : {}}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px 68px 88px',
        alignItems: 'center', gap: 8, padding: '11px 18px',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: '1px solid #F8FAFC',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onClick && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: RATE_COLOR(rate), flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 13.5, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
      <span style={{ fontSize: 13, color: '#059669', fontWeight: 700, textAlign: 'center' }}>{present}</span>
      <span style={{ fontSize: 13, color: '#D97706', fontWeight: 700, textAlign: 'center' }}>{late}</span>
      <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, textAlign: 'center' }}>{absent}</span>
      <span style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>{total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 0.8, delay: 0.1 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: '100%', background: RATE_COLOR(rate), borderRadius: 999 }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: RATE_COLOR(rate), minWidth: 30, textAlign: 'right' }}>{rate}%</span>
      </div>
    </motion.div>
  )
}

/* ── Device status mini card ── */
function DeviceStatus({ online, total }) {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: online > 0 ? 'linear-gradient(135deg, #4facfe, #00f2fe)' : '#F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: online > 0 ? '0 4px 12px rgba(79,172,254,0.4)' : 'none',
        }}>
          <Wifi style={{ width: 19, height: 19, color: online > 0 ? 'white' : '#94A3B8' }} />
        </div>
        {online > 0 && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ position: 'absolute', inset: -3, borderRadius: 15, border: '2px solid #4facfe', pointerEvents: 'none' }}
          />
        )}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
          {online} / {total}
        </p>
        <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>qurilma online</p>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
        }}>{pct}%</span>
        <p style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 1 }}>faollik</p>
      </div>
    </div>
  )
}

const levelLabel = { region: 'Viloyat', district: 'Tuman', school: 'Maktab', class: 'Sinf' }

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function DashboardPage() {
  const { isSuperAdmin, isRegionDirector, isDistrictDirector } = usePermissions()
  const [stats, setStats]       = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [overview, setOverview]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod]       = useState('today')
  const [breadcrumb, setBreadcrumb] = useState([])
  const [drillParams, setDrillParams] = useState({})

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [analyticsRes, overviewRes] = await Promise.all([
        reportsAPI.getAnalytics({ ...drillParams, period }),
        reportsAPI.getOverview(),
      ])
      setAnalytics(analyticsRes.data)
      setOverview(overviewRes.data)
      setStats(overviewRes.data?.today || null)
    } catch {
      if (isRefresh) toast.error("Ma'lumot yangilanmadi")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period, drillParams])

  useEffect(() => { load() }, [load])

  const handleDrillDown = (item) => {
    const level = analytics?.level
    if (!level || level === 'class') return
    const next = { region: 'region_id', district: 'district_id', school: 'school_id' }[level]
    if (!next) return
    setBreadcrumb(prev => [...prev, { label: item.name, params: drillParams }])
    setDrillParams(prev => ({ ...prev, [next]: item.id }))
  }

  const handleBreadcrumbNav = (idx) => {
    if (idx < 0) { setBreadcrumb([]); setDrillParams({}) }
    else {
      const snap = breadcrumb[idx]
      setBreadcrumb(prev => prev.slice(0, idx))
      setDrillParams(snap.params)
    }
  }

  const overall   = analytics?.overall || {}
  const breakdown = analytics?.breakdown || []
  const total   = overall.total   || 0
  const present = overall.present || 0
  const late    = overall.late    || 0
  const absent  = overall.absent  || 0
  const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0

  const onlineDevices = overview?.summary?.devices_online ?? 0
  const totalDevices  = overview?.summary?.devices_total  ?? 0

  const trendData = (overview?.weekly_trend || []).map(d => ({
    day:     d.date?.slice(5) || '',
    present: d.present || 0,
    late:    d.late    || 0,
    absent:  Math.max(0, (d.total || 0) - (d.present || 0) - (d.late || 0)),
  }))

  const donutData = [
    { value: present, name: 'Keldi',    color: '#4F46E5' },
    { value: late,    name: 'Kech',     color: '#F59E0B' },
    { value: absent,  name: 'Kelmadi',  color: '#EF4444' },
  ]

  if (loading) return <PageLoader />

  return (
    <motion.div
      initial="hidden" animate="show" variants={stagger}
      style={{ display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      {/* ── Top toolbar ── */}
      <motion.div variants={fadeUp}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}
      >
        {/* Period pills */}
        <div style={{
          display: 'flex', background: 'white', border: '1.5px solid #E2E8F0',
          borderRadius: 12, overflow: 'hidden', padding: 3, gap: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {[{ v: 'today', l: 'Bugun' }, { v: 'week', l: 'Hafta' }, { v: 'month', l: 'Oy' }].map(({ v, l }) => (
            <button key={v} onClick={() => setPeriod(v)}
              style={{
                padding: '6px 16px', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                background: period === v ? '#4F46E5' : 'transparent',
                color:      period === v ? 'white'    : '#64748B',
                boxShadow:  period === v ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <motion.button
          onClick={() => load(true)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{
            width: 38, height: 38, borderRadius: 10, border: '1.5px solid #E2E8F0',
            background: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748B', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
          title="Yangilash"
        >
          <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : {}}>
            <RefreshCw style={{ width: 16, height: 16 }} />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* ── Hero Rate Card ── */}
      <HeroRate rate={rate} total={total} present={present} late={late} absent={absent} />

      {/* ── KPI Cards ── */}
      <motion.div variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}
      >
        <KpiCard type="total"   title="Jami o'quvchi" value={total}   sub="Ro'yxatda"                                    delay={0} />
        <KpiCard type="present" title="Keldi"          value={present} sub={`${total > 0 ? Math.round(present/total*100) : 0}% to'liq davomad`} delay={80} />
        <KpiCard type="late"    title="Kech keldi"     value={late}    sub="Kechikkan"                                    delay={160} />
        <KpiCard type="absent"  title="Kelmadi"        value={absent}  sub="Sababsiz"                                     delay={240} />
        <KpiCard type="devices" title="Qurilmalar"     value={`${onlineDevices}/${totalDevices}`} sub={`${onlineDevices} ta online`} delay={320} />
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div variants={fadeUp}
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}
      >
        {/* Area Chart */}
        <div style={{
          background: 'white', borderRadius: 18, padding: '22px 20px 14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Haftalik trend</h2>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>So'nggi 7 kun davomad grafigi</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ color: '#4F46E5', label: 'Keldi' }, { color: '#EF4444', label: 'Kelmadi' }].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, borderRadius: 999, background: color, display: 'block' }} />
                  <span style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={168}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="present" name="Keldi"   stroke="#4F46E5" strokeWidth={2.5} fill="url(#gP)" dot={{ fill: '#4F46E5', r: 3.5, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="absent"  name="Kelmadi" stroke="#EF4444" strokeWidth={2}   fill="url(#gA)" strokeDasharray="4 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut + stats */}
        <div style={{
          background: 'white', borderRadius: 18, padding: 22,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Holat taqsimoti</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 18 }}>Bugungi statistika</p>

          {total > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <PieChart width={148} height={148}>
                  <Pie data={donutData} dataKey="value" cx={73} cy={73}
                    innerRadius={46} outerRadius={68}
                    startAngle={90} endAngle={-270}
                    stroke="none" paddingAngle={3}
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </PieChart>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}
                  >
                    {rate}%
                  </motion.span>
                  <span style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3, fontWeight: 500 }}>davomad</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                {donutData.map(({ name, value: v, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{v}</span>
                    <span style={{ fontSize: 11.5, color: '#94A3B8', minWidth: 36, textAlign: 'right' }}>
                      {total > 0 ? Math.round(v / total * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Device status */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                <DeviceStatus online={onlineDevices} total={totalDevices} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>Ma'lumot yo'q</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Breakdown Table ── */}
      <motion.div variants={fadeUp}
        style={{
          background: 'white', borderRadius: 18,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp style={{ width: 16, height: 16, color: '#4F46E5' }} />
            {/* Breadcrumb */}
            <button onClick={() => handleBreadcrumbNav(-1)}
              style={{ fontSize: 14, fontWeight: 700, color: breadcrumb.length > 0 ? '#4F46E5' : '#0F172A', background: 'none', border: 'none', cursor: breadcrumb.length > 0 ? 'pointer' : 'default', padding: 0 }}>
              Tahlil
            </button>
            {breadcrumb.map((bc, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronRight style={{ width: 13, height: 13, color: '#CBD5E1' }} />
                <button onClick={() => handleBreadcrumbNav(i)}
                  style={{ fontSize: 14, fontWeight: 600, color: i === breadcrumb.length - 1 ? '#0F172A' : '#4F46E5', background: 'none', border: 'none', cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default', padding: 0 }}>
                  {bc.label}
                </button>
              </span>
            ))}
            {analytics?.level && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: '#EEF2FF', color: '#4F46E5',
                padding: '3px 9px', borderRadius: 999, marginLeft: 4,
                border: '1px solid #C7D2FE',
              }}>
                {levelLabel[analytics.level] || analytics.level}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94A3B8', background: '#F8FAFC', padding: '4px 10px', borderRadius: 7, border: '1px solid #F1F5F9' }}>
              {breakdown.length} ta yozuv
            </span>
          </div>
        </div>

        {/* Table cols header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px 68px 88px',
          gap: 8, padding: '9px 18px',
          background: '#F8FAFC', borderBottom: '1px solid #F1F5F9',
        }}>
          {['Nomi', 'Keldi', 'Kech', 'Kelmadi', 'Jami', 'Foiz'].map((h, i) => (
            <span key={h} style={{
              fontSize: 10.5, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              textAlign: i === 0 ? 'left' : 'center',
            }}>{h}</span>
          ))}
        </div>

        {breakdown.length === 0 ? (
          <EmptyState icon={Activity} title="Ma'lumot topilmadi" description="Tanlangan davr uchun ma'lumot mavjud emas" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={JSON.stringify(drillParams) + period}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {breakdown.map((item, i) => (
                <AttendanceRow
                  key={item.id || i}
                  index={i}
                  name={item.name}
                  present={item.present ?? 0}
                  late={item.late ?? 0}
                  absent={item.absent ?? 0}
                  total={item.total ?? 0}
                  rate={item.rate ?? 0}
                  onClick={analytics?.level !== 'class' ? () => handleDrillDown(item) : undefined}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Footer summary */}
        {breakdown.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px 68px 88px',
            gap: 8, padding: '11px 18px',
            background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
            borderTop: '2px solid #E2E8F0',
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>Umumiy jami</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', textAlign: 'center' }}>{present}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#D97706', textAlign: 'center' }}>{late}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', textAlign: 'center' }}>{absent}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>{total}</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: 'white',
                background: RATE_COLOR(rate),
                padding: '2px 8px', borderRadius: 6,
              }}>{rate}%</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
