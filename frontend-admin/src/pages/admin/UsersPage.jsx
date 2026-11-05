import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, UserX, Shield, Users, CheckCircle,
  Phone, X, Edit2, KeyRound, UserCheck, Eye, EyeOff,
  Calendar, Clock, Mail, Crown
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { RoleBadge, StatusBadge } from '../../components/ui/Badge'
import { TableSkeleton, EmptyState } from '../../components/ui/LoadingSpinner'
import { usersAPI } from '../../api/auth'
import { orgAPI } from '../../api/organizations'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  superadmin: 'Super Admin', region_director: 'Viloyat Direktori',
  district_director: 'Tuman Direktori', school_director: 'Maktab Direktori',
  operator: 'Operator', teacher: "O'qituvchi", parent: 'Ota-ona',
}
const ROLE_COLORS = {
  superadmin: '#7C3AED', region_director: '#2563EB', district_director: '#0891B2',
  school_director: '#059669', operator: '#D97706', teacher: '#B45309', parent: '#DB2777',
}

/* ── PasswordField ── */
function PasswordField({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      {label && <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '8px 38px 8px 12px',
            border: '1.5px solid #E2E8F0', borderRadius: 9,
            fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
            background: '#FAFAFA', boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)' }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none' }}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
          {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
        </button>
      </div>
      {hint && <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

/* ── Role Assign Modal ── */
function RoleAssignModal({ userId, onClose }) {
  const [roles, setRoles] = useState([])
  const [regions, setRegions] = useState([])
  const [districts, setDistricts] = useState([])
  const [schools, setSchools] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [form, setForm] = useState({ role: '', region: '', district: '', school: '' })
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(null)

  const loadUserRoles = useCallback(() => {
    usersAPI.getUserRoles(userId).then(r => setUserRoles(r.data || []))
  }, [userId])

  useEffect(() => {
    Promise.all([
      usersAPI.getRoles(),
      usersAPI.getUserRoles(userId),
      orgAPI.getRegions({ page_size: 200 }),
      orgAPI.getDistricts({ page_size: 500 }),
      orgAPI.getSchools({ page_size: 500 }),
    ]).then(([r, ur, reg, dis, sch]) => {
      setRoles(r.data.results || r.data || [])
      setUserRoles(ur.data || [])
      setRegions(reg.data.results || [])
      setDistricts(dis.data.results || [])
      setSchools(sch.data.results || [])
    }).catch(() => toast.error("Ma'lumotlarni yuklashda xatolik"))
  }, [userId])

  const handleAssign = async () => {
    if (!form.role) return toast.error('Rolni tanlang')
    setSaving(true)
    try {
      const payload = { role: form.role }
      if (form.region)   payload.region   = form.region
      if (form.district) payload.district = form.district
      if (form.school)   payload.school   = form.school
      await usersAPI.assignRole(userId, payload)
      loadUserRoles()
      setForm({ role: '', region: '', district: '', school: '' })
      toast.success('Rol berildi!')
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.non_field_errors?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const handleRemove = async (roleId) => {
    setRemoving(roleId)
    try {
      await usersAPI.removeRole(userId, roleId)
      loadUserRoles()
      toast.success('Rol olib tashlandi')
    } catch { toast.error('Xatolik yuz berdi') }
    finally { setRemoving(null) }
  }

  const sr = form.role
  const needsRegion   = ['region_director','district_director','school_director','operator','teacher'].includes(sr)
  const needsDistrict = ['district_director','school_director','operator','teacher'].includes(sr)
  const needsSchool   = ['school_director','operator','teacher'].includes(sr)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
          Mavjud rollar
          {userRoles.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 999 }}>
              {userRoles.length} ta
            </span>
          )}
        </p>
        {userRoles.length === 0 ? (
          <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 10, border: '1px dashed #E2E8F0', textAlign: 'center' }}>
            <Shield style={{ width: 24, height: 24, color: '#CBD5E1', margin: '0 auto 6px' }} />
            <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Rol tayinlanmagan</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {userRoles.map((ur) => {
              const color = ROLE_COLORS[ur.role_name] || '#4F46E5'
              const scope = [ur.region_name, ur.district_name, ur.school_name].filter(Boolean).join(' › ')
              return (
                <div key={ur.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: color + '0D', border: `1.5px solid ${color}30`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield style={{ width: 14, height: 14, color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                        {ROLE_LABELS[ur.role_name] || ur.role_name}
                      </p>
                      {scope && <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{scope}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(ur.id)} disabled={removing === ur.id} title="Rolni olib tashlash"
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: '1px solid #FECACA',
                      background: removing === ur.id ? '#FEF2F2' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: removing === ur.id ? 'not-allowed' : 'pointer',
                      color: '#EF4444', transition: 'all 0.15s',
                      opacity: removing === ur.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (removing !== ur.id) e.currentTarget.style.background = '#FEF2F2' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Yangi rol qo'shish</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Rol *" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value, region: '', district: '', school: '' }))}>
            <option value="">Rolni tanlang</option>
            {roles.map(r => <option key={r.name} value={r.name}>{ROLE_LABELS[r.name] || r.name}</option>)}
          </Select>
          {needsRegion && (
            <Select label="Viloyat *" value={form.region}
              onChange={e => setForm(f => ({ ...f, region: e.target.value, district: '', school: '' }))}>
              <option value="">Viloyatni tanlang</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
          {needsDistrict && form.region && (
            <Select label="Tuman *" value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value, school: '' }))}>
              <option value="">Tumanni tanlang</option>
              {districts.filter(d => String(d.region) === String(form.region)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          )}
          {needsSchool && form.district && (
            <Select label="Maktab *" value={form.school}
              onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
              <option value="">Maktabni tanlang</option>
              {schools.filter(s => String(s.district) === String(form.district)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
          <Button onClick={handleAssign} loading={saving} style={{ width: '100%', justifyContent: 'center' }}>
            <Shield style={{ width: 14, height: 14 }} />
            Rol tayinlash
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Edit User Modal ── */
function EditUserModal({ user, onClose, onSaved }) {
  const [tab, setTab] = useState('info') // 'info' | 'password'
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    middle_name: user.middle_name || '',
    phone: user.phone || '',
    email: user.email || '',
    is_active: user.is_active,
  })
  const [pwd, setPwd] = useState({ new_password: '', new_password_confirm: '' })
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
  const setPwdF = (f) => (e) => setPwd(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.phone)
      return toast.error("Ism, familiya va telefon majburiy")
    setSaving(true)
    try {
      await usersAPI.updateUser(user.id, form)
      toast.success("Ma'lumotlar saqlandi")
      onSaved()
      onClose()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.phone?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik')
    } finally { setSaving(false) }
  }

  const handleSetPassword = async () => {
    if (!pwd.new_password) return toast.error('Yangi parolni kiriting')
    if (pwd.new_password.length < 8) return toast.error('Parol kamida 8 ta belgi')
    if (pwd.new_password !== pwd.new_password_confirm) return toast.error('Parollar mos kelmadi')
    setSaving(true)
    try {
      await usersAPI.setUserPassword(user.id, pwd)
      toast.success('Parol muvaffaqiyatli o\'zgartirildi')
      setPwd({ new_password: '', new_password_confirm: '' })
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.new_password?.[0] || err?.detail || 'Xatolik')
    } finally { setSaving(false) }
  }

  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
    background: tab === t ? '#4F46E5' : 'transparent',
    color: tab === t ? 'white' : '#64748B',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* User info header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px', margin: '-4px -4px 0',
        background: 'linear-gradient(135deg, #0F172A, #1E1B4B)',
        borderRadius: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {[user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            {user.last_name} {user.first_name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 3, fontFamily: 'monospace' }}>
            {user.phone}
          </p>
        </div>
        {user.is_superuser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(252,211,77,0.2)', border: '1px solid rgba(252,211,77,0.4)', borderRadius: 8, padding: '4px 10px' }}>
            <Crown style={{ width: 13, height: 13, color: '#FCD34D' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D' }}>Superuser</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '14px 0 4px', background: '#F8FAFC', margin: '12px -4px 0', borderBottom: '1px solid #E2E8F0', paddingLeft: 16 }}>
        <button style={tabStyle('info')} onClick={() => setTab('info')}>
          <Edit2 style={{ width: 12, height: 12, display: 'inline', marginRight: 5 }} />
          Ma'lumotlar
        </button>
        <button style={tabStyle('password')} onClick={() => setTab('password')}>
          <KeyRound style={{ width: 12, height: 12, display: 'inline', marginRight: 5 }} />
          Parol o'zgartirish
        </button>
      </div>

      {/* Tab content */}
      <div style={{ paddingTop: 16 }}>
        {tab === 'info' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Familiya *" value={form.last_name} onChange={set('last_name')} placeholder="Karimov" />
              <Input label="Ismi *" value={form.first_name} onChange={set('first_name')} placeholder="Ali" />
            </div>
            <Input label="Otasining ismi" value={form.middle_name} onChange={set('middle_name')} placeholder="Valiyevich" />
            <Input label="Telefon (login) *" value={form.phone} onChange={set('phone')} placeholder="+998901234567" icon={Phone} />
            <Input label="Email" value={form.email} onChange={set('email')} type="email" placeholder="ali@example.com" icon={Mail} />

            {/* Status toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.is_active ? '#ECFDF5' : '#FEF2F2', border: `1.5px solid ${form.is_active ? '#A7F3D0' : '#FECACA'}`, borderRadius: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Holat</p>
                <p style={{ fontSize: 12, color: form.is_active ? '#059669' : '#DC2626', marginTop: 2 }}>
                  {form.is_active ? 'Faol — tizimga kira oladi' : "Nofaol — tizimga kira olmaydi"}
                </p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{
                  width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: form.is_active ? '#10B981' : '#CBD5E1',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: form.is_active ? 22 : 2,
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Meta info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: Calendar, label: "Ro'yxatdan o'tgan", value: user.created_at ? new Date(user.created_at).toLocaleDateString('uz-UZ') : '—' },
                { icon: Clock, label: 'Oxirgi kirish', value: user.last_login ? new Date(user.last_login).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : 'Kirish yo\'q' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 9, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Icon style={{ width: 12, height: 12, color: '#94A3B8' }} />
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
              <Button onClick={handleSave} loading={saving}>Saqlash</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <KeyRound style={{ width: 15, height: 15, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Superadmin huquqi</p>
                <p style={{ fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 1.5 }}>
                  Eski parol talab qilinmaydi. Foydalanuvchi keyingi kirishda yangi paroldan foydalanadi.
                </p>
              </div>
            </div>

            <PasswordField
              label="Yangi parol *"
              value={pwd.new_password}
              onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))}
              placeholder="Kamida 8 ta belgi"
              hint="Katta harf, raqam va maxsus belgi tavsiya etiladi"
            />
            <PasswordField
              label="Yangi parolni tasdiqlash *"
              value={pwd.new_password_confirm}
              onChange={e => setPwd(p => ({ ...p, new_password_confirm: e.target.value }))}
              placeholder="Parolni qayta kiriting"
            />

            {/* Password strength hint */}
            {pwd.new_password && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: '8+ belgi', ok: pwd.new_password.length >= 8 },
                  { label: 'Katta harf', ok: /[A-Z]/.test(pwd.new_password) },
                  { label: 'Raqam', ok: /\d/.test(pwd.new_password) },
                  { label: 'Maxsus belgi', ok: /[^a-zA-Z0-9]/.test(pwd.new_password) },
                ].map(({ label, ok }) => (
                  <span key={label} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: ok ? '#ECFDF5' : '#F1F5F9',
                    color: ok ? '#059669' : '#94A3B8',
                    border: `1px solid ${ok ? '#A7F3D0' : '#E2E8F0'}`,
                  }}>{ok ? '✓' : '○'} {label}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
              <Button onClick={handleSetPassword} loading={saving} icon={KeyRound}>
                Parolni o'zgartirish
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Add User Modal ── */
function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    phone: '+998', first_name: '', last_name: '', middle_name: '',
    email: '', password: '', password_confirm: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleCreate = async () => {
    if (!form.phone || !form.first_name || !form.last_name || !form.password || !form.password_confirm)
      return toast.error("Majburiy maydonlarni to'ldiring")
    if (form.password.length < 8) return toast.error("Parol kamida 8 ta belgi bo'lishi kerak")
    if (form.password !== form.password_confirm) return toast.error('Parollar mos kelmadi')
    setSaving(true)
    try {
      await usersAPI.createUser(form)
      toast.success('Foydalanuvchi yaratildi!')
      onCreated()
      onClose()
    } catch (e) {
      const err = e.response?.data
      toast.error(err?.phone?.[0] || err?.password?.[0] || err?.detail || Object.values(err || {}).flat()[0] || 'Xatolik yuz berdi')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Familiya *" required value={form.last_name} onChange={set('last_name')} placeholder="Karimov" />
        <Input label="Ismi *" required value={form.first_name} onChange={set('first_name')} placeholder="Ali" />
      </div>
      <Input label="Otasining ismi" value={form.middle_name} onChange={set('middle_name')} placeholder="Valiyevich" />
      <Input label="Telefon raqami (login) *" required value={form.phone} onChange={set('phone')} placeholder="+998901234567" icon={Phone} />
      <Input label="Email" value={form.email} onChange={set('email')} type="email" placeholder="ali@example.com" icon={Mail} />
      <PasswordField label="Parol *" value={form.password} onChange={set('password')} placeholder="Kamida 8 ta belgi" hint="Katta harf, raqam va belgi ishlatish tavsiya etiladi" />
      <PasswordField label="Parolni tasdiqlash *" value={form.password_confirm} onChange={set('password_confirm')} placeholder="Parolni qayta kiriting" />
      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Shield style={{ width: 14, height: 14, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
          Foydalanuvchi yaratilgandan so'ng unga rol tayinlashni unutmang.
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
        <Button onClick={handleCreate} loading={saving}>Yaratish</Button>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)   // user object
  const [roleModal, setRoleModal] = useState(null)   // user id
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [confirmActivate, setConfirmActivate] = useState(null)
  const [processing, setProcessing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = { search, page_size: 200 }
    if (filterActive !== '') params.is_active = filterActive
    usersAPI.getUsers(params)
      .then(r => setUsers(r.data.results || r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [search, filterActive])

  useEffect(() => { load() }, [load])

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return
    setProcessing(confirmDeactivate.id)
    try {
      await usersAPI.deactivateUser(confirmDeactivate.id)
      toast.success('Foydalanuvchi deaktivlashtirildi')
      setConfirmDeactivate(null)
      load()
    } catch { toast.error('Xatolik yuz berdi') }
    finally { setProcessing(null) }
  }

  const handleActivate = async () => {
    if (!confirmActivate) return
    setProcessing(confirmActivate.id)
    try {
      await usersAPI.activateUser(confirmActivate.id)
      toast.success('Foydalanuvchi aktivlashtirildi')
      setConfirmActivate(null)
      load()
    } catch { toast.error('Xatolik yuz berdi') }
    finally { setProcessing(null) }
  }

  const activeCount   = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Foydalanuvchilar</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Tizim foydalanuvchilari, rollar va login ma'lumotlarini boshqarish
          </p>
        </div>
        <Button icon={Plus} onClick={() => setAddModal(true)}>
          Foydalanuvchi qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { icon: Users,       label: 'Jami',    value: users.length,  color: '#4F46E5', filter: '' },
          { icon: UserCheck,   label: 'Faol',    value: activeCount,   color: '#10B981', filter: 'true' },
          { icon: UserX,       label: 'Nofaol',  value: inactiveCount, color: '#EF4444', filter: 'false' },
        ].map(({ icon: Icon, label, value, color, filter }) => (
          <div key={label} onClick={() => setFilterActive(f => f === filter ? '' : filter)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: filterActive === filter && filter !== '' ? color + '12' : 'white',
              border: `1.5px solid ${filterActive === filter && filter !== '' ? color : '#E2E8F0'}`,
              borderRadius: 10, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Search */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Ism, telefon, email bo'yicha qidirish..."
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: '1.5px solid #E2E8F0', borderRadius: 9,
                fontSize: 13, outline: 'none', background: '#F8FAFC',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <span style={{ fontSize: 12.5, color: '#94A3B8', marginLeft: 'auto' }}>{users.length} ta</span>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="Foydalanuvchilar topilmadi" description="Yangi foydalanuvchi qo'shish uchun yuqoridagi tugmani bosing"
            action={<Button icon={Plus} onClick={() => setAddModal(true)}>Qo'shish</Button>} />
        ) : (
          <>
            {/* Col headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2.2fr 145px 1.5fr 100px 120px',
              gap: 8, padding: '9px 16px',
              background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
            }}>
              {['Foydalanuvchi', 'Login / Telefon', 'Rollar', 'Holat', 'Amallar'].map((h, i) => (
                <span key={h} style={{
                  fontSize: 11, fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  textAlign: i >= 3 ? 'center' : 'left',
                }}>{h}</span>
              ))}
            </div>

            {users.map((user, i) => {
              const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase()
              const lastLogin = user.last_login
                ? new Date(user.last_login).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : null
              return (
                <div key={user.id} style={{
                  display: 'grid', gridTemplateColumns: '2.2fr 145px 1.5fr 100px 120px',
                  gap: 8, padding: '12px 16px',
                  borderBottom: i < users.length - 1 ? '1px solid #F8FAFC' : 'none',
                  transition: 'background 0.1s', alignItems: 'center',
                  opacity: user.is_active ? 1 : 0.65,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Name + email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: user.is_active ? 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' : '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: user.is_active ? '#4F46E5' : '#94A3B8',
                      }}>
                        {initials || 'U'}
                      </div>
                      {user.is_superuser && (
                        <Crown style={{ position: 'absolute', bottom: -2, right: -2, width: 13, height: 13, color: '#F59E0B', background: 'white', borderRadius: '50%', padding: 1 }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.last_name} {user.first_name}
                        {user.middle_name ? ` ${user.middle_name}` : ''}
                      </p>
                      <p style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email || (lastLogin ? `Kirgan: ${lastLogin}` : 'Hali kirmagan')}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <span style={{ fontSize: 12.5, color: '#475569', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Phone style={{ width: 11, height: 11, color: '#CBD5E1', flexShrink: 0 }} />
                      {user.phone || '—'}
                    </span>
                    {lastLogin && (
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 10, height: 10 }} />
                        {lastLogin}
                      </p>
                    )}
                  </div>

                  {/* Roles */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {user.is_superuser && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                        Superuser
                      </span>
                    )}
                    {user.roles?.length > 0
                      ? user.roles.slice(0, 2).map((r, ri) => <RoleBadge key={ri} role={r.role} />)
                      : !user.is_superuser && <span style={{ fontSize: 11.5, color: '#CBD5E1', fontStyle: 'italic' }}>Rol yo'q</span>
                    }
                    {user.roles?.length > 2 && (
                      <span style={{ fontSize: 11, color: '#94A3B8', padding: '3px 7px', background: '#F8FAFC', borderRadius: 999, border: '1px solid #E2E8F0' }}>
                        +{user.roles.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    {/* Edit */}
                    <button onClick={() => setEditModal(user)} title="Tahrirlash"
                      style={actionBtnStyle}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                    >
                      <Edit2 style={{ width: 14, height: 14 }} />
                    </button>
                    {/* Roles */}
                    <button onClick={() => setRoleModal(user.id)} title="Rol boshqarish"
                      style={actionBtnStyle}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F5F3FF'; e.currentTarget.style.color = '#7C3AED' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                    >
                      <Shield style={{ width: 14, height: 14 }} />
                    </button>
                    {/* Activate / Deactivate */}
                    {user.is_active ? (
                      <button onClick={() => setConfirmDeactivate(user)} title="Deaktivlashtirish"
                        style={actionBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                      >
                        <UserX style={{ width: 14, height: 14 }} />
                      </button>
                    ) : (
                      <button onClick={() => setConfirmActivate(user)} title="Aktivlashtirish"
                        style={actionBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.color = '#10B981' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                      >
                        <UserCheck style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Yangi foydalanuvchi qo'shish" size="md">
        <AddUserModal onClose={() => setAddModal(false)} onCreated={load} />
      </Modal>

      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Foydalanuvchini tahrirlash" size="md">
        {editModal && <EditUserModal user={editModal} onClose={() => setEditModal(null)} onSaved={load} />}
      </Modal>

      <Modal isOpen={!!roleModal} onClose={() => setRoleModal(null)} title="Rollarni boshqarish" size="md">
        {roleModal && <RoleAssignModal userId={roleModal} onClose={() => setRoleModal(null)} />}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate}
        loading={!!processing}
        danger
        title="Foydalanuvchini deaktivlashtirish"
        message={`"${confirmDeactivate?.last_name} ${confirmDeactivate?.first_name}" foydalanuvchini deaktivlashtirasizmi? Tizimga kira olmaydi.`}
        confirmLabel="Deaktivlashtirish"
      />

      <ConfirmModal
        isOpen={!!confirmActivate}
        onClose={() => setConfirmActivate(null)}
        onConfirm={handleActivate}
        loading={!!processing}
        title="Foydalanuvchini aktivlashtirish"
        message={`"${confirmActivate?.last_name} ${confirmActivate?.first_name}" foydalanuvchini aktivlashtirasizmi?`}
        confirmLabel="Aktivlashtirish"
      />
    </div>
  )
}

const actionBtnStyle = {
  width: 30, height: 30, borderRadius: 7, background: 'transparent',
  border: 'none', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
  transition: 'all 0.15s',
}
