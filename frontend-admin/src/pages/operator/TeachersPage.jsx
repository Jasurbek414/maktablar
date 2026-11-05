import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, UserSquare, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { studentsAPI } from '../../api/students'
import { orgAPI } from '../../api/organizations'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const cardStyle = {
  background: 'white', border: '1px solid #E2E8F0',
  borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
}
const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editTeacher, setEditTeacher] = useState(null)
  const [schools, setSchools] = useState([])
  const [saving, setSaving] = useState(false)
  const PAGE_SIZE = 20

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const loadTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await studentsAPI.getTeachers({ search, page, page_size: PAGE_SIZE })
      setTeachers(data.results || data)
      setTotal(data.count || (data.results?.length ?? data.length))
    } catch { toast.error("Ma'lumot olishda xatolik") }
    finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { loadTeachers() }, [loadTeachers])
  useEffect(() => { orgAPI.getSchools({ page_size: 200 }).then(r => setSchools(r.data.results || r.data)) }, [])

  const openCreate = () => { setEditTeacher(null); reset({}); setShowModal(true) }
  const openEdit = (t) => { setEditTeacher(t); reset(t); setShowModal(true) }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      if (editTeacher) {
        await studentsAPI.updateTeacher(editTeacher.id, data)
        toast.success("O'qituvchi yangilandi")
      } else {
        await studentsAPI.createTeacher(data)
        toast.success("O'qituvchi qo'shildi")
      }
      setShowModal(false)
      loadTeachers()
    } catch (e) { toast.error(e.response?.data?.detail || 'Xatolik yuz berdi') }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const footer = (
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Bekor qilish</Button>
      <Button type="submit" form="teacher-form" loading={saving}>{editTeacher ? 'Saqlash' : "Qo'shish"}</Button>
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>O'qituvchilar</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Jami: <strong style={{ color: '#0F172A' }}>{total}</strong> ta o'qituvchi</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Yangi o'qituvchi</Button>
      </div>

      {/* Search */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', maxWidth: 380 }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Ism, Familiya bo'yicha qidirish..."
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 1.2fr 1.5fr 1fr 80px', gap: 0 }}>
          {["O'qituvchi", "Maktab", "ID", "Fan", "Telefon", "Holat", ""].map((h, i) => (
            <div key={i} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '24px 16px' }}><TableSkeleton rows={6} cols={7} /></div>
        ) : teachers.length === 0 ? (
          <EmptyState icon={UserSquare} title="O'qituvchilar topilmadi"
            description="Yangi o'qituvchi qo'shish uchun yuqoridagi tugmani bosing"
            action={<Button onClick={openCreate} icon={Plus} size="sm">Qo'shish</Button>} />
        ) : teachers.map((t, idx) => (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 1.2fr 1.5fr 1fr 80px',
            alignItems: 'center',
            borderBottom: idx < teachers.length - 1 ? '1px solid #F8FAFC' : 'none',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFBFD'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Name */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#4F46E5', flexShrink: 0,
              }}>
                {t.first_name?.[0]?.toUpperCase()}{t.last_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t.last_name} {t.first_name}</p>
                {t.middle_name && <p style={{ fontSize: 11.5, color: '#94A3B8' }}>{t.middle_name}</p>}
              </div>
            </div>
            {/* School */}
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{t.school_name || '—'}</div>
            {/* ID */}
            <div style={{ padding: '12px 16px' }}>
              <span style={{ fontSize: 11.5, fontFamily: 'monospace', background: '#F1F5F9', color: '#475569', padding: '2px 7px', borderRadius: 5 }}>
                {t.employee_id || '—'}
              </span>
            </div>
            {/* Subject */}
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{t.subject || '—'}</div>
            {/* Phone */}
            <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#475569', fontFamily: 'monospace' }}>{t.phone || '—'}</div>
            {/* Status */}
            <div style={{ padding: '12px 16px' }}>
              <StatusBadge status={t.is_active ? 'active' : 'inactive'} />
            </div>
            {/* Actions */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => openEdit(t)} style={{
                padding: '6px', borderRadius: 7, border: '1px solid #E2E8F0',
                background: 'white', cursor: 'pointer', color: '#64748B',
                display: 'flex', alignItems: 'center',
              }}>
                <Edit style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Jami {total} ta o'qituvchi</span>
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

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editTeacher ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}
        footer={footer}
      >
        <form id="teacher-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Familiya *</label>
              <input {...register('last_name', { required: true })} placeholder="Karimov" style={inputStyle} />
              {errors.last_name && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>Majburiy</p>}
            </div>
            <div>
              <label style={labelStyle}>Ism *</label>
              <input {...register('first_name', { required: true })} placeholder="Alisher" style={inputStyle} />
              {errors.first_name && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>Majburiy</p>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Otasining ismi</label>
            <input {...register('middle_name')} placeholder="Alijonovich" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Telefon raqam *</label>
              <input {...register('phone', { required: true })} placeholder="+998..." style={inputStyle} />
              {errors.phone && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>Majburiy</p>}
            </div>
            <div>
              <label style={labelStyle}>Fan *</label>
              <input {...register('subject', { required: true })} placeholder="Matematika" style={inputStyle} />
              {errors.subject && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>Majburiy</p>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Maktab *</label>
            <select {...register('school', { required: true })} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">— Maktab tanlang —</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.school && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>Maktab majburiy</p>}
          </div>
        </form>
      </Modal>
    </div>
  )
}
