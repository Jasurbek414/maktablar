import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2, Scan, GraduationCap, Monitor, Bell, Shield } from 'lucide-react'
import { login } from '../../store/authSlice'
import toast from 'react-hot-toast'

// Superadmin login identifikatori: yoki +998XXXXXXXXX telefon shaklida,
// yoki mavjud tizim login nomi (masalan "superadmin") bo'lishi mumkin.
const PHONE_REGEX = /^(\+?998\d{9}|[a-zA-Z][a-zA-Z0-9_.]{2,29})$/

export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const { isLoading } = useSelector(s => s.auth)

  const schema = z.object({
    phone: z.string().regex(PHONE_REGEX, t('auth.phoneValidation')),
    password: z.string().min(6, t('auth.passwordValidation')),
  })

  const features = [
    { icon: Scan,          title: t('auth.features.faceId.title'),    desc: t('auth.features.faceId.desc') },
    { icon: GraduationCap, title: t('auth.features.students.title'),  desc: t('auth.features.students.desc') },
    { icon: Monitor,       title: t('auth.features.realtime.title'),  desc: t('auth.features.realtime.desc') },
    { icon: Bell,          title: t('auth.features.parents.title'),   desc: t('auth.features.parents.desc') },
  ]

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  const onSubmit = async (data) => {
    const res = await dispatch(login(data))
    if (login.fulfilled.match(res)) {
      toast.success(t('auth.welcomeToast'))
      navigate('/dashboard')
    } else {
      const e = res.payload
      toast.error(e?.detail || e?.non_field_errors?.[0] || t('auth.loginError'))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0F172A', overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
      }}
        className="left-panel"
      >
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79,70,229,0.45)',
          }}>
            <Scan style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{t('common.appName')}</p>
            <p style={{ color: '#818CF8', fontSize: 12, marginTop: 2 }}>{t('common.appTagline')}</p>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 16 }}>
          {t('auth.headline1')}<br />
          <span style={{ background: 'linear-gradient(90deg, #818CF8, #C4B5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('auth.headline2')}
          </span>
        </h1>
        <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.7, marginBottom: 48, maxWidth: 400 }}>
          {t('auth.heroDescription')}
        </p>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(79,70,229,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Icon style={{ width: 18, height: 18, color: '#818CF8' }} />
              </div>
              <p style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</p>
              <p style={{ color: '#64748B', fontSize: 11.5, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ color: '#334155', fontSize: 12, marginTop: 48 }}>
          {t('auth.footerCopyright')}
        </p>
      </div>

      {/* ── Right panel (login form) ── */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32,
        background: '#FAFBFF',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(79,70,229,0.4)',
            }}>
              <Scan style={{ width: 22, height: 22, color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{t('common.appName')}</p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>{t('common.appTagline')}</p>
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            {t('auth.title')}
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 32 }}>
            {t('auth.subtitle')}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                {t('auth.phoneLabel')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder={t('auth.phonePlaceholder')}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: `1.5px solid ${errors.phone ? '#EF4444' : '#E2E8F0'}`,
                  borderRadius: 10, fontSize: 14, color: '#0F172A',
                  background: 'white', outline: 'none',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
                onFocus={e => { e.target.style.borderColor = errors.phone ? '#EF4444' : '#4F46E5'; e.target.style.boxShadow = errors.phone ? '0 0 0 3px rgba(239,68,68,0.15)' : '0 0 0 3px rgba(79,70,229,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = errors.phone ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
              />
              {errors.phone && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 5 }}>⚠ {errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                {t('auth.passwordLabel')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '11px 42px 11px 14px',
                    border: `1.5px solid ${errors.password ? '#EF4444' : '#E2E8F0'}`,
                    borderRadius: 10, fontSize: 14, color: '#0F172A',
                    background: 'white', outline: 'none',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onFocus={e => { e.target.style.borderColor = errors.password ? '#EF4444' : '#4F46E5'; e.target.style.boxShadow = errors.password ? '0 0 0 3px rgba(239,68,68,0.15)' : '0 0 0 3px rgba(79,70,229,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                >
                  {showPwd ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 5 }}>⚠ {errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px',
                background: isLoading ? '#6366F1' : '#4F46E5',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
                transition: 'all 0.15s', marginTop: 4,
              }}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = '#4338CA'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4F46E5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.4)'; }}
              onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isLoading
                ? <><Loader2 style={{ width: 17, height: 17, animation: 'spin 0.75s linear infinite' }} /> {t('auth.submitLoading')}</>
                : t('auth.submit')
              }
            </button>
          </form>

          {/* Info note */}
          <div style={{
            marginTop: 28,
            padding: '12px 16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Shield style={{ width: 15, height: 15, color: '#64748B', marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              {t('auth.infoNote')}
            </p>
          </div>

          <p style={{ fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 28 }}>
            {t('auth.footerCopyrightShort')}
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
