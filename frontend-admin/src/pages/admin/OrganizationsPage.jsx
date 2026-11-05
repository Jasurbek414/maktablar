import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, Building2, School, BookOpen, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { orgAPI } from '../../api/organizations'
import { studentsAPI } from '../../api/students'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'regions',   label: 'Viloyatlar', icon: MapPin,    color: '#7C3AED' },
  { id: 'districts', label: 'Tumanlar',   icon: Building2, color: '#2563EB' },
  { id: 'schools',   label: 'Maktablar',  icon: School,    color: '#059669' },
  { id: 'classes',   label: 'Sinflar',    icon: BookOpen,  color: '#D97706' },
]

/* ── Generic Table ── */
function OrgTable({ cols, rows, loading, onEdit, onDelete, empty }) {
  if (loading) return <TableSkeleton rows={6} cols={cols.length + 1} />
  if (!rows.length) return <EmptyState icon={Plus} title={empty} description="Qo'shish uchun + tugmasini bosing" />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
              Amallar
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i}
              style={{ borderBottom: i < rows.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {cols.map(c => (
                <td key={c.key} style={{ padding: '12px 16px', fontSize: 13.5, color: '#475569', verticalAlign: 'middle' }}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <button onClick={() => onEdit(row)} title="Tahrirlash"
                    style={tblBtnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <Pencil style={{ width: 14, height: 14 }} />
                  </button>
                  {onDelete && (
                    <button onClick={() => onDelete(row)} title="O'chirish"
                      style={tblBtnStyle}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tblBtnStyle = {
  width: 30, height: 30, borderRadius: 7, background: 'transparent',
  border: 'none', cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
  transition: 'all 0.15s',
}

function FilterBar({ children }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder = 'Qidirish...' }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
      <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '7px 12px 7px 32px',
          border: '1.5px solid #E2E8F0', borderRadius: 9,
          fontSize: 13, outline: 'none', background: '#F8FAFC',
          transition: 'all 0.15s', fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)'; }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  )
}

function CountChip({ value, color }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, background: color + '15', padding: '2px 8px', borderRadius: 5 }}>
      {value ?? 0}
    </span>
  )
}

/* ── REGIONS ── */
function RegionsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    orgAPI.getRegions({ search, page_size: 100 }).then(r => setItems(r.data.results || [])).finally(() => setLoading(false))
  }, [search])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ name: '', code: '' }); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ name: r.name, code: r.code || '' }); setModal({ mode: 'edit', data: r }) }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Viloyat nomini kiriting')
    setSaving(true)
    try {
      modal.mode === 'add' ? await orgAPI.createRegion(form) : await orgAPI.updateRegion(modal.data.id, form)
      toast.success(modal.mode === 'add' ? "Viloyat qo'shildi" : 'Viloyat yangilandi')
      setModal(null); load()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.name?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await orgAPI.deleteRegion(confirm.id); toast.success("O'chirildi"); load() }
    catch { toast.error("O'chirib bo'lmadi — bog'liq ma'lumotlar bor") }
    finally { setConfirm(null) }
  }

  return (
    <>
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Viloyat qidirish..." />
        <Button icon={Plus} onClick={openAdd}>Viloyat qo'shish</Button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#94A3B8' }}>{items.length} ta viloyat</span>
      </FilterBar>
      <OrgTable loading={loading} rows={items} empty="Viloyatlar yo'q" onEdit={openEdit} onDelete={r => setConfirm(r)}
        cols={[
          { key: 'name', label: 'Viloyat nomi', render: r => <span style={{ fontWeight: 600, color: '#0F172A' }}>{r.name}</span> },
          { key: 'code', label: 'Kod' },
          { key: 'districts_count', label: 'Tumanlar',     render: r => <CountChip value={r.districts_count} color="#2563EB" /> },
          { key: 'schools_count',   label: 'Maktablar',    render: r => <CountChip value={r.schools_count}   color="#059669" /> },
          { key: 'students_count',  label: "O'quvchilar",  render: r => <CountChip value={r.students_count}  color="#7C3AED" /> },
        ]}
      />
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Yangi viloyat' : 'Viloyatni tahrirlash'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button><Button onClick={handleSave} loading={saving}>Saqlash</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Viloyat nomi" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Toshkent viloyati" />
          <Input label="Kod" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="TSH" hint="Ixtiyoriy: qisqa kod" />
        </div>
      </Modal>
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} danger
        title="Viloyatni o'chirish" message={`"${confirm?.name}" viloyatini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`} confirmLabel="O'chirish" />
    </>
  )
}

/* ── DISTRICTS ── */
function DistrictsTab() {
  const [items, setItems] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', region: '', code: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { orgAPI.getRegions({ page_size: 200 }).then(r => setRegions(r.data.results || [])) }, [])
  const load = useCallback(() => {
    setLoading(true)
    orgAPI.getDistricts({ search, region: filterRegion || undefined, page_size: 200 }).then(r => setItems(r.data.results || [])).finally(() => setLoading(false))
  }, [search, filterRegion])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ name: '', region: filterRegion || '', code: '' }); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ name: r.name, region: String(r.region), code: r.code || '' }); setModal({ mode: 'edit', data: r }) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.region) return toast.error("Nom va viloyatni to'ldiring")
    setSaving(true)
    try {
      modal.mode === 'add' ? await orgAPI.createDistrict(form) : await orgAPI.updateDistrict(modal.data.id, form)
      toast.success(modal.mode === 'add' ? "Tuman qo'shildi" : 'Tuman yangilandi')
      setModal(null); load()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.name?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const getRegionName = (id) => regions.find(r => r.id === id)?.name || '—'

  return (
    <>
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Tuman qidirish..." />
        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={selectStyle}>
          <option value="">Barcha viloyatlar</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Button icon={Plus} onClick={openAdd}>Tuman qo'shish</Button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#94A3B8' }}>{items.length} ta tuman</span>
      </FilterBar>
      <OrgTable loading={loading} rows={items} empty="Tumanlar yo'q" onEdit={openEdit} onDelete={r => setConfirm(r)}
        cols={[
          { key: 'name',   label: 'Tuman nomi', render: r => <span style={{ fontWeight: 600, color: '#0F172A' }}>{r.name}</span> },
          { key: 'region', label: 'Viloyat',    render: r => getRegionName(r.region) },
          { key: 'schools_count',  label: 'Maktablar',   render: r => <CountChip value={r.schools_count}  color="#059669" /> },
          { key: 'students_count', label: "O'quvchilar", render: r => <CountChip value={r.students_count} color="#7C3AED" /> },
        ]}
      />
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Yangi tuman' : 'Tumanni tahrirlash'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button><Button onClick={handleSave} loading={saving}>Saqlash</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Tuman nomi" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Yunusobod tumani" />
          <Input label="Kod" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="YUN" />
          <Select label="Viloyat" required value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
            <option value="">Viloyatni tanlang</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
      </Modal>
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} danger
        onConfirm={async () => { try { await orgAPI.deleteDistrict(confirm.id); toast.success("O'chirildi"); load() } catch { toast.error("O'chirib bo'lmadi") } finally { setConfirm(null) } }}
        title="Tumanni o'chirish" message={`"${confirm?.name}" tumanni o'chirasizmi?`} confirmLabel="O'chirish" />
    </>
  )
}

/* ── SCHOOLS ── */
function SchoolsTab() {
  const [items, setItems] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', district: '', address: '', phone: '', director_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { orgAPI.getDistricts({ page_size: 500 }).then(r => setDistricts(r.data.results || [])) }, [])
  const load = useCallback(() => {
    setLoading(true)
    orgAPI.getSchools({ search, district: filterDistrict || undefined, page_size: 200 }).then(r => setItems(r.data.results || [])).finally(() => setLoading(false))
  }, [search, filterDistrict])
  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ name: '', district: filterDistrict || '', address: '', phone: '', director_name: '' }); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ name: r.name, district: String(r.district), address: r.address || '', phone: r.phone || '', director_name: r.director_name || '' }); setModal({ mode: 'edit', data: r }) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.district) return toast.error("Nom va tumanni to'ldiring")
    setSaving(true)
    try {
      const p = { name: form.name, district: form.district }
      if (form.address) p.address = form.address
      if (form.phone) p.phone = form.phone
      if (form.director_name) p.director_name = form.director_name
      modal.mode === 'add' ? await orgAPI.createSchool(p) : await orgAPI.updateSchool(modal.data.id, p)
      toast.success(modal.mode === 'add' ? "Maktab qo'shildi" : 'Maktab yangilandi')
      setModal(null); load()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.name?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const getDistrictName = (id) => districts.find(d => d.id === id)?.name || '—'

  return (
    <>
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Maktab qidirish..." />
        <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} style={selectStyle}>
          <option value="">Barcha tumanlar</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Button icon={Plus} onClick={openAdd}>Maktab qo'shish</Button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#94A3B8' }}>{items.length} ta maktab</span>
      </FilterBar>
      <OrgTable loading={loading} rows={items} empty="Maktablar yo'q" onEdit={openEdit} onDelete={r => setConfirm(r)}
        cols={[
          { key: 'name',     label: 'Maktab nomi', render: r => <span style={{ fontWeight: 600, color: '#0F172A' }}>{r.name}</span> },
          { key: 'district', label: 'Tuman',       render: r => getDistrictName(r.district) },
          { key: 'phone',    label: 'Telefon',      render: r => r.phone || '—' },
          { key: 'students_count', label: "O'quvchilar", render: r => <CountChip value={r.students_count} color="#7C3AED" /> },
        ]}
      />
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Yangi maktab' : 'Maktabni tahrirlash'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button><Button onClick={handleSave} loading={saving}>Saqlash</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Maktab nomi" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="145-son maktab" />
          <Select label="Tuman" required value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}>
            <option value="">Tumanni tanlang</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Manzil" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Ko'cha, uy raqami" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998..." />
            <Input label="Direktor" value={form.director_name} onChange={e => setForm(f => ({ ...f, director_name: e.target.value }))} placeholder="F.I.O." />
          </div>
        </div>
      </Modal>
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} danger
        onConfirm={async () => { try { await orgAPI.deleteSchool(confirm.id); toast.success("O'chirildi"); load() } catch { toast.error("O'chirib bo'lmadi") } finally { setConfirm(null) } }}
        title="Maktabni o'chirish" message={`"${confirm?.name}" maktabini o'chirasizmi?`} confirmLabel="O'chirish" />
    </>
  )
}

/* ── CLASSES ── */
function ClassesTab() {
  const [items, setItems] = useState([])
  const [schools, setSchools] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSchool, setFilterSchool] = useState('')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ grade: '', section: '', name: '', school: '', academic_year: '2024-2025', teacher: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { orgAPI.getSchools({ page_size: 200 }).then(r => setSchools(r.data.results || [])) }, [])
  const load = useCallback(() => {
    setLoading(true)
    orgAPI.getClasses({ school: filterSchool || undefined, page_size: 200 }).then(r => setItems(r.data.results || [])).finally(() => setLoading(false))
  }, [filterSchool])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (form.school) studentsAPI.getTeachers({ school: form.school, page_size: 100 }).then(r => setTeachers(r.data.results || [])).catch(() => setTeachers([]))
    else setTeachers([])
  }, [form.school])

  const openAdd  = () => { setForm({ grade: '', section: '', name: '', school: filterSchool || '', academic_year: '2024-2025', teacher: '' }); setModal({ mode: 'add' }) }
  const openEdit = (r) => { setForm({ grade: String(r.grade), section: r.section, name: r.name || '', school: String(r.school), academic_year: r.academic_year || '2024-2025', teacher: r.teacher ? String(r.teacher) : '' }); setModal({ mode: 'edit', data: r }) }

  const handleSave = async () => {
    if (!form.grade || !form.section || !form.school) return toast.error('Barcha maydonlarni to\'ldiring')
    setSaving(true)
    try {
      const p = { grade: parseInt(form.grade), section: form.section.toUpperCase(), name: form.name || `${form.grade}-${form.section}`, school: form.school, academic_year: form.academic_year, teacher: form.teacher || null }
      modal.mode === 'add' ? await orgAPI.createClass(p) : await orgAPI.updateClass(modal.data.id, p)
      toast.success(modal.mode === 'add' ? "Sinf qo'shildi" : 'Sinf yangilandi')
      setModal(null); load()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const getSchoolName = (id) => schools.find(s => s.id === id)?.name || '—'

  return (
    <>
      <FilterBar>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} style={selectStyle}>
          <option value="">Barcha maktablar</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Button icon={Plus} onClick={openAdd}>Sinf qo'shish</Button>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: '#94A3B8' }}>{items.length} ta sinf</span>
      </FilterBar>
      <OrgTable loading={loading} rows={items} empty="Sinflar yo'q" onEdit={openEdit} onDelete={r => setConfirm(r)}
        cols={[
          { key: 'name',         label: 'Sinf',        render: r => <span style={{ fontWeight: 700, color: '#7C3AED' }}>{r.name || `${r.grade}-${r.section}`}</span> },
          { key: 'school',       label: 'Maktab',      render: r => getSchoolName(r.school) },
          { key: 'teacher_name', label: 'Sinf rahbari', render: r => r.teacher_name || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Tayinlanmagan</span> },
          { key: 'students_count', label: "O'quvchilar", render: r => <CountChip value={r.students_count} color="#7C3AED" /> },
        ]}
      />
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Yangi sinf' : 'Sinfni tahrirlash'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button><Button onClick={handleSave} loading={saving}>Saqlash</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Maktab" required value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value, teacher: '' }))}>
            <option value="">Maktabni tanlang</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Sinf nomi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="5-A (ixtiyoriy — quyidagi maydonlardan avtomatik)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Sinf raqami" required type="number" min="1" max="11" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="1-11" />
            <Input label="Sinf harfi" required value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A, B, V..." maxLength={2} />
          </div>
          <Input label="O'quv yili" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2024-2025" />
          <Select label="Sinf rahbari" value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}>
            <option value="">Sinf rahbarini tanlang</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
        </div>
      </Modal>
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} danger
        onConfirm={async () => { try { await orgAPI.deleteClass(confirm.id); toast.success("O'chirildi"); load() } catch { toast.error("O'chirib bo'lmadi") } finally { setConfirm(null) } }}
        title="Sinfni o'chirish" message={`"${confirm?.name || (confirm?.grade + '-' + confirm?.section)}" sinfini o'chirasizmi?`} confirmLabel="O'chirish" />
    </>
  )
}

const selectStyle = {
  padding: '7px 30px 7px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: 13, color: '#374151', background: 'white', outline: 'none',
  transition: 'all 0.15s', fontFamily: 'inherit', cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
}

/* ── MAIN PAGE ── */
export default function OrganizationsPage() {
  const { pathname } = useLocation()
  const initialTab = ['districts', 'schools', 'classes'].find(t => pathname.includes(t)) || 'regions'
  const [tab, setTab] = useState(initialTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Tashkilotlar</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Viloyat, tuman, maktab va sinflarni boshqarish</p>
      </div>

      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '14px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: active ? 700 : 500,
                  color: active ? t.color : '#64748B',
                  borderBottom: `2px solid ${active ? t.color : 'transparent'}`,
                  marginBottom: -1,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px 20px 24px' }}>
          {tab === 'regions'   && <RegionsTab />}
          {tab === 'districts' && <DistrictsTab />}
          {tab === 'schools'   && <SchoolsTab />}
          {tab === 'classes'   && <ClassesTab />}
        </div>
      </div>
    </div>
  )
}
