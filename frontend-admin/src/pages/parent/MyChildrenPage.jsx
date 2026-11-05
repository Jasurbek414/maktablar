import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Users, GraduationCap, ClipboardList, CheckCircle, XCircle, Clock, Calendar, BookOpen } from 'lucide-react'
import { studentsAPI } from '../../api/students'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  present:  { label: 'Keldi',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle },
  late:     { label: 'Kech keldi',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  absent:   { label: 'Kelmadi',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle },
  excused:  { label: "Sababli",     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: CheckCircle },
}

function AttendanceBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <Icon style={{ width: 11, height: 11 }} />
      {cfg.label}
    </span>
  )
}

function ChildCard({ student }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    studentsAPI.getStudentAttendance(student.id)
      .then(r => setRecords(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [student.id])

  const present = records.filter(r => r.status === 'present').length
  const late    = records.filter(r => r.status === 'late').length
  const absent  = records.filter(r => r.status === 'absent').length
  const total   = records.length
  const rate    = total > 0 ? Math.round((present + late) / total * 100) : 0

  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Child header */}
      <div style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {student.photo_url ? (
          <img src={student.photo_url} alt={student.full_name}
            style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white',
          }}>
            {student.first_name?.[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
            {student.last_name} {student.first_name}
          </p>
          {student.middle_name && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{student.middle_name}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {student.class_name && (
              <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookOpen style={{ width: 10, height: 10 }} />
                {student.class_name}
              </span>
            )}
            <span style={{ fontSize: 11, fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 6 }}>
              {student.student_id}
            </span>
          </div>
        </div>
        {/* Rate circle */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '3px solid',
            borderColor: rate >= 90 ? '#34D399' : rate >= 70 ? '#FCD34D' : '#F87171',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{rate}%</span>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>davomad</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #F1F5F9' }}>
        {[
          { label: 'Keldi', value: present, color: '#059669', bg: '#ECFDF5' },
          { label: 'Kech', value: late, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Kelmadi', value: absent, color: '#DC2626', bg: '#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ padding: '12px', textAlign: 'center', background: bg }}>
            <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Records toggle */}
      <div style={{ padding: '0 16px' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%', padding: '12px 0', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 600, color: '#374151',
            borderBottom: expanded ? '1px solid #F1F5F9' : 'none',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar style={{ width: 14, height: 14, color: '#6366F1' }} />
            So'nggi davomad ({total} ta)
          </span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div style={{ paddingBottom: 8 }}>
            {loading ? (
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner />
              </div>
            ) : records.length === 0 ? (
              <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
                Davomad ma'lumotlari yo'q
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {records.slice(0, 14).map((r, i) => (
                  <div key={r.id || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 2px', borderBottom: i < Math.min(records.length, 14) - 1 ? '1px solid #F8FAFC' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                      {r.date || r.check_in_str?.slice(0, 10) || '—'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(r.check_in_str || r.check_in_time) && (
                        <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>
                          {(r.check_in_str || r.check_in_time)?.slice(11, 16) || '—'}
                        </span>
                      )}
                      <AttendanceBadge status={r.status} />
                    </div>
                  </div>
                ))}
                {records.length > 14 && (
                  <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>
                    Yana {records.length - 14} ta yozuv bor
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyChildrenPage() {
  const { user } = useSelector(state => state.auth)
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Parent's children come from parent_links
    studentsAPI.getStudents({ page_size: 50 })
      .then(r => setChildren(r.data.results || r.data || []))
      .catch(() => toast.error("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Mening bolalarim</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Farzandlaringizning davomad ma'lumotlari
        </p>
      </div>

      {children.length === 0 ? (
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '60px 24px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users style={{ width: 28, height: 28, color: '#CBD5E1' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Farzand ma'lumotlari topilmadi</p>
          <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 320, margin: '0 auto' }}>
            Maktab operatori siz bilan farzandingizni bog'lashi kerak. Telegram bot orqali ham ulashingiz mumkin.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {children.map(child => (
            <ChildCard key={child.id} student={child} />
          ))}
        </div>
      )}
    </div>
  )
}
