import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, GraduationCap, Edit, Trash2, Camera, Upload, Cpu, CheckCircle, XCircle, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner'
import { studentsAPI } from '../../api/students'
import { orgAPI } from '../../api/organizations'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#0F172A', outline: 'none', background: 'white', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }

function PhotoCell({ student, onPhotoUploaded }) {
  const { t } = useTranslation()
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(t('students.toasts.imageOnly')); return }
    if (file.size > 10 * 1024 * 1024) { toast.error(t('students.toasts.imageTooLarge')); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const { data } = await studentsAPI.uploadPhoto(student.id, formData)
      toast.success(t('students.toasts.imageUploaded'))
      onPhotoUploaded(student.id, data.photo_url)
    } catch (err) { toast.error(err?.response?.data?.detail || err?.response?.data?.error || t('students.toasts.imageUploadFailed')) }
    finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div
      style={{ position: 'relative', width: 56, height: 56, cursor: 'pointer', flexShrink: 0 }}
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />
      {student.photo_url ? (
        <img src={student.photo_url} alt={student.full_name}
          style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'linear-gradient(135deg, #E2E8F0, #CBD5E1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed #CBD5E1',
        }}>
          <Camera style={{ width: 20, height: 20, color: '#94A3B8' }} />
        </div>
      )}
      {/* Hover overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
      }}>
        {uploading ? <LoadingSpinner /> : <Upload style={{ width: 18, height: 18, color: 'white' }} />}
      </div>
    </div>
  )
}

function FaceBadge({ has }) {
  const { t } = useTranslation()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
      background: has ? '#ECFDF5' : '#FEF2F2',
      color: has ? '#059669' : '#DC2626',
      border: `1px solid ${has ? '#A7F3D0' : '#FECACA'}`,
    }}>
      {has ? <CheckCircle style={{ width: 11, height: 11 }} /> : <XCircle style={{ width: 11, height: 11 }} />}
      {has ? t('students.faceBadge.has') : t('students.faceBadge.none')}
    </span>
  )
}

function StudentCard({ student, onEdit, onDelete, onPushFace, onPhotoUploaded, pushingId }) {
  const { t } = useTranslation()
  const isPushing = pushingId === student.id
  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 14,
      padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <PhotoCell student={student} onPhotoUploaded={onPhotoUploaded} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {student.last_name} {student.first_name}
          </p>
          {student.middle_name && (
            <p style={{ fontSize: 11.5, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {student.middle_name}
            </p>
          )}
          <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontFamily: 'monospace', background: '#EEF2FF', color: '#4F46E5', padding: '1px 6px', borderRadius: 5 }}>
            {student.student_id}
          </span>
          <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{student.class_name || '—'}</p>
          <div style={{ marginTop: 5 }}>
            <FaceBadge has={student.has_photo} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
        <button onClick={() => onPushFace(student)} disabled={!student.has_photo || isPushing}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '6px', borderRadius: 8, border: '1px solid #C7D2FE', background: '#EEF2FF',
            color: '#4F46E5', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            opacity: !student.has_photo || isPushing ? 0.4 : 1,
          }}>
          {isPushing ? <LoadingSpinner /> : <Cpu style={{ width: 13, height: 13 }} />}
          {t('students.card.pushBtn')}
        </button>
        <button onClick={() => onEdit(student)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#64748B', cursor: 'pointer' }}>
          <Edit style={{ width: 14, height: 14 }} />
        </button>
        <button onClick={() => onDelete(student)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}>
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  )
}

export default function StudentsPage() {
  const { t } = useTranslation()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(24)
  const [viewMode, setViewMode] = useState('grid')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [deleteStudent, setDeleteStudent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [schools, setSchools] = useState([])
  const [classes, setClasses] = useState([])
  const [filterSchool, setFilterSchool] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [saving, setSaving] = useState(false)
  const [pushingId, setPushingId] = useState(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const selectedSchool = watch('school')

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (search) params.search = search
      if (filterSchool) params.school = filterSchool
      if (filterClass) params.class_ref = filterClass
      const { data } = await studentsAPI.getStudents(params)
      setStudents(data.results || data)
      setTotal(data.count || 0)
    } catch { toast.error(t('students.loadError')) }
    finally { setLoading(false) }
  }, [search, page, pageSize, filterSchool, filterClass, t])

  useEffect(() => { loadStudents() }, [loadStudents])

  useEffect(() => {
    orgAPI.getSchools({ page_size: 500 }).then(r => setSchools(r.data.results || r.data)).catch(() => {})
    orgAPI.getClasses({ page_size: 1000 }).then(r => setClasses(r.data.results || r.data)).catch(() => {})
  }, [])

  const filteredClasses = filterSchool ? classes.filter(c => String(c.school) === String(filterSchool)) : classes
  const formClasses = selectedSchool ? classes.filter(c => String(c.school) === String(selectedSchool)) : classes

  const openCreate = () => { setEditStudent(null); reset({ gender: 'M', relationship: 'father' }); setShowModal(true) }
  const openEdit = (s) => { setEditStudent(s); reset({ ...s, class_ref: s.class_ref, school: s.school }); setShowModal(true) }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      // MUHIM (2026-09-16 aniqlandi): backend /students/ va /students/{id}/ JSON
      // (@RequestBody Map<String,Object>) kutadi, MultipartFile emas — shu sabab rasm
      // faylini shu yerda FormData bilan yuborish hech qachon ishlamagan (butun so'rov
      // formati mos kelmagan). Rasm faqat alohida, MultipartFile qabul qiladigan
      // /students/{id}/upload-photo/ orqali yuklanadi (PhotoCell'dagi bilan bir xil).
      const photoFile = data.photo instanceof FileList ? data.photo[0] : null;
      const payload = {};
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'photo') return;
        if (v !== undefined && v !== null && v !== '') payload[k] = v;
      })
      let studentId = editStudent?.id;
      if (editStudent) {
        await studentsAPI.updateStudent(editStudent.id, payload)
        toast.success(t('students.toasts.updated'))
      } else {
        const { data: created } = await studentsAPI.createStudent(payload)
        studentId = created.id
        toast.success(t('students.toasts.created'))
      }
      if (photoFile && studentId) {
        const photoForm = new FormData()
        photoForm.append('photo', photoFile)
        try { await studentsAPI.uploadPhoto(studentId, photoForm) }
        catch { toast.error(t('students.toasts.imageUploadFailed')) }
      }
      setShowModal(false)
      loadStudents()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.detail || (typeof err === 'object' ? Object.values(err).flat().join(', ') : t('common.errorGeneric')))
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteStudent) return
    setDeleting(true)
    try {
      await studentsAPI.deleteStudent(deleteStudent.id)
      toast.success(t('students.toasts.deleted'))
      setDeleteStudent(null)
      loadStudents()
    } catch { toast.error(t('students.toasts.deleteError')) }
    finally { setDeleting(false) }
  }

  const handlePushFace = async (student) => {
    setPushingId(student.id)
    try {
      const { data } = await studentsAPI.pushFace(student.id)
      toast.success(data.message)
    } catch (e) { toast.error(e.response?.data?.detail || t('students.toasts.pushError')) }
    finally { setPushingId(null) }
  }

  const handlePhotoUploaded = (studentId, photoUrl) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, photo_url: photoUrl, has_photo: true } : s))
  }

  const withPhoto = students.filter(s => s.has_photo).length
  const noPhoto = students.filter(s => !s.has_photo).length
  const totalPages = Math.ceil(total / pageSize)

  const selectStyle = { ...inputStyle, appearance: 'none' }

  const modalFooter = (
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)} type="button">{t('common.cancel')}</Button>
      <Button type="submit" form="student-form" loading={saving}>{editStudent ? t('common.save') : t('common.add')}</Button>
    </>
  )

  const parentLinkLabel = (status) => {
    if (status === 'active') return { text: t('students.parentLink.linked'), color: '#059669' }
    if (status === 'pending') return { text: t('students.parentLink.pending'), color: '#D97706' }
    return { text: t('students.parentLink.none'), color: '#94A3B8' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('students.title')}</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            {t('students.totalLabel')}: <strong style={{ color: '#0F172A' }}>{total}</strong> •{' '}
            <span style={{ color: '#059669', fontWeight: 600 }}>{t('students.withPhotoSuffix', { count: withPhoto })}</span> •{' '}
            <span style={{ color: '#DC2626', fontWeight: 600 }}>{t('students.withoutPhotoSuffix', { count: noPhoto })}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            {[{ mode: 'grid', Icon: LayoutGrid }, { mode: 'table', Icon: List }].map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '7px 10px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: viewMode === mode ? '#4F46E5' : 'white',
                color: viewMode === mode ? 'white' : '#94A3B8',
              }}>
                <Icon style={{ width: 15, height: 15 }} />
              </button>
            ))}
          </div>
          <Button icon={Plus} onClick={openCreate}>{t('common.add')}</Button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: t('students.stats.total'), value: total, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0', Icon: GraduationCap, iconBg: '#EEF2FF', iconColor: '#4F46E5' },
          { label: t('students.stats.withPhoto'), value: withPhoto, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle, iconBg: '#D1FAE5', iconColor: '#059669' },
          { label: t('students.stats.withoutPhoto'), value: noPhoto, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle, iconBg: '#FEE2E2', iconColor: '#DC2626' },
        ].map(({ label, value, color, bg, border, Icon, iconBg, iconColor }) => (
          <div key={label} style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 18, height: 18, color: iconColor }} />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('students.searchPlaceholder')}
            style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
        <select value={filterSchool} onChange={e => { setFilterSchool(e.target.value); setFilterClass(''); setPage(1) }}
          style={{ ...selectStyle, minWidth: 160, flex: '0 1 auto' }}>
          <option value="">{t('students.filters.allSchools')}</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1) }}
          style={{ ...selectStyle, minWidth: 130, flex: '0 1 auto' }}>
          <option value="">{t('students.filters.allClasses')}</option>
          {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(filterSchool || filterClass || search) && (
          <button onClick={() => { setFilterSchool(''); setFilterClass(''); setSearch(''); setPage(1) }}
            style={{ padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 9, background: 'white', fontSize: 13, color: '#64748B', cursor: 'pointer' }}>
            {t('students.filters.clear')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: 40, display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : students.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          <EmptyState icon={GraduationCap} title={t('students.empty.title')}
            description={t('students.empty.description')}
            action={<Button onClick={openCreate} icon={Plus} size="sm">{t('common.add')}</Button>} />
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {students.map(s => (
            <StudentCard key={s.id} student={s}
              onEdit={openEdit} onDelete={s => setDeleteStudent(s)}
              onPushFace={handlePushFace} onPhotoUploaded={handlePhotoUploaded}
              pushingId={pushingId} />
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 2.5fr 100px 1fr 80px 120px 100px 80px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            {[t('students.table.photo'), t('students.table.student'), t('students.table.id'), t('students.table.class'), t('students.table.gender'), t('students.table.faceStatus'), t('students.table.parent'), ""].map((h, i) => (
              <div key={i} style={{ padding: '11px 12px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>
          {students.map((s, idx) => {
            const pl = parentLinkLabel(s.parent_link_status)
            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '70px 2.5fr 100px 1fr 80px 120px 100px 80px',
                alignItems: 'center',
                borderBottom: idx < students.length - 1 ? '1px solid #F8FAFC' : 'none',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFBFD'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ padding: '10px 12px' }}>
                  <PhotoCell student={s} onPhotoUploaded={handlePhotoUploaded} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{s.last_name} {s.first_name}</p>
                  <p style={{ fontSize: 11.5, color: '#94A3B8' }}>{s.middle_name}</p>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 11.5, fontFamily: 'monospace', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: 5 }}>{s.student_id}</span>
                </div>
                <div style={{ padding: '10px 12px', fontSize: 13, color: '#475569' }}>{s.class_name || '—'}</div>
                <div style={{ padding: '10px 12px', fontSize: 13, color: '#475569' }}>{s.gender === 'M' ? '♂' : '♀'}</div>
                <div style={{ padding: '10px 12px' }}><FaceBadge has={s.has_photo} /></div>
                <div style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pl.color }}>{pl.text}</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => handlePushFace(s)} disabled={!s.has_photo || pushingId === s.id}
                    style={{ padding: '5px', borderRadius: 7, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#4F46E5', cursor: 'pointer', opacity: !s.has_photo || pushingId === s.id ? 0.4 : 1, display: 'flex' }}
                    title={t('students.table.pushTooltip')}>
                    <Cpu style={{ width: 13, height: 13 }} />
                  </button>
                  <button onClick={() => openEdit(s)}
                    style={{ padding: '5px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#64748B', cursor: 'pointer', display: 'flex' }}>
                    <Edit style={{ width: 13, height: 13 }} />
                  </button>
                  <button onClick={() => setDeleteStudent(s)}
                    style={{ padding: '5px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft style={{ width: 15, height: 15, color: '#374151' }} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
              if (p < 1 || p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${p === page ? '#4F46E5' : '#E2E8F0'}`,
                  background: p === page ? '#4F46E5' : 'white',
                  color: p === page ? 'white' : '#374151', cursor: 'pointer',
                }}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}>
              <ChevronRight style={{ width: 15, height: 15, color: '#374151' }} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editStudent ? t('students.modal.editTitle') : t('students.modal.addTitle')}
        footer={modalFooter}
      >
        <form id="student-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('students.modal.lastNameLabel')}</label>
              <input {...register('last_name', { required: true })} style={inputStyle} placeholder="Karimov" />
              {errors.last_name && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>{t('students.modal.required')}</p>}
            </div>
            <div>
              <label style={labelStyle}>{t('students.modal.firstNameLabel')}</label>
              <input {...register('first_name', { required: true })} style={inputStyle} placeholder="Alisher" />
              {errors.first_name && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>{t('students.modal.required')}</p>}
            </div>
            <div>
              <label style={labelStyle}>{t('students.modal.middleNameLabel')}</label>
              <input {...register('middle_name')} style={inputStyle} placeholder="Alijonovich" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>{t('students.modal.birthDateLabel')}</label>
              <input {...register('birth_date', { required: true })} type="date" style={inputStyle} />
              {errors.birth_date && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>{t('students.modal.required')}</p>}
            </div>
            <div>
              <label style={labelStyle}>{t('students.modal.genderLabel')}</label>
              <select {...register('gender')} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="M">{t('students.modal.genderMale')}</option>
                <option value="F">{t('students.modal.genderFemale')}</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('students.modal.schoolLabel')}</label>
            <select {...register('school', { required: true })} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">{t('students.modal.schoolPlaceholder')}</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.school && <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 3 }}>{t('students.modal.required')}</p>}
          </div>
          <div>
            <label style={labelStyle}>{t('students.modal.classLabel')}</label>
            <select {...register('class_ref')} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">{t('students.modal.classPlaceholder')}</option>
              {formClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('students.modal.photoLabel')}</label>
            <input {...register('photo')} type="file" accept="image/*"
              style={{ ...inputStyle, paddingTop: 6, paddingBottom: 6 }} />
            <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{t('students.modal.photoHint')}</p>
          </div>
          {!editStudent && (
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>{t('students.modal.parentSectionTitle')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t('students.modal.parentPhoneLabel')}</label>
                  <input {...register('parent_phone')} style={inputStyle} placeholder="+998..." />
                </div>
                <div>
                  <label style={labelStyle}>{t('students.modal.relationshipLabel')}</label>
                  <select {...register('relationship')} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="father">{t('students.modal.relationship.father')}</option>
                    <option value="mother">{t('students.modal.relationship.mother')}</option>
                    <option value="guardian">{t('students.modal.relationship.guardian')}</option>
                    <option value="other">{t('students.modal.relationship.other')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {deleteStudent && (
        <ConfirmModal
          isOpen
          title={t('students.deleteConfirm.title')}
          message={t('students.deleteConfirm.message', { name: deleteStudent.full_name || deleteStudent.last_name + ' ' + deleteStudent.first_name })}
          confirmLabel={t('common.delete')}
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteStudent(null)}
        />
      )}
    </div>
  )
}
