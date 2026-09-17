import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { User, Phone, Mail, Key, Shield, CheckCircle, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { RoleBadge } from '../../components/ui/Badge'
import { PasswordInput } from '../../components/ui/Input'
import { authAPI } from '../../api/auth'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid #F8FAFC',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: 15, height: 15, color: '#64748B' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 500, marginBottom: 1 }}>{label}</p>
        <p style={{
          fontSize: 14, color: '#0F172A', fontWeight: 600,
          fontFamily: mono ? 'monospace' : 'inherit',
        }}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useSelector(s => s.auth)
  const [changingPwd, setChangingPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()

  const onChangePassword = async (data) => {
    if (data.new_password !== data.new_password_confirm)
      return toast.error(t('profile.validation.mismatch'))
    setSavingPwd(true)
    try {
      await authAPI.changePassword(data)
      toast.success(t('profile.toast.changed'))
      reset()
      setChangingPwd(false)
    } catch (e) {
      toast.error(e.response?.data?.old_password?.[0] || e.response?.data?.detail || t('profile.toast.error'))
    } finally { setSavingPwd(false) }
  }

  if (!user) return null

  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase()
  const primaryRole = user.roles?.[0]?.role

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>{t('profile.title')}</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{t('profile.subtitle')}</p>
      </div>

      {/* Profile hero card */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 6px 24px rgba(79,70,229,0.10)',
      }}>
        {/* Cover */}
        <div style={{
          height: 96,
          background: 'linear-gradient(120deg, #1E1B4B 0%, #4F46E5 50%, #7C3AED 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: 30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: 150, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', top: -30, left: 120, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Avatar + info */}
        <div style={{ padding: '22px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', padding: 3, flexShrink: 0,
              background: 'linear-gradient(135deg, #818CF8, #C084FC)',
              boxShadow: '0 8px 24px rgba(79,70,229,0.4)',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: '#1E293B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 26, fontWeight: 800, letterSpacing: 1,
              }}>
                {initials || 'U'}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px',
              background: user.is_active ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${user.is_active ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: 999, fontSize: 11.5, fontWeight: 700,
              color: user.is_active ? '#065F46' : '#991B1B',
              boxShadow: user.is_active ? '0 2px 10px rgba(16,185,129,0.15)' : '0 2px 10px rgba(239,68,68,0.15)',
              marginBottom: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: user.is_active ? '#10B981' : '#EF4444',
                boxShadow: `0 0 0 3px ${user.is_active ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
              }} />
              {user.is_active ? t('common.active') : t('common.inactive')}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>
              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
              {user.is_superuser && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: 'white', padding: '4px 13px', borderRadius: 999,
                  fontSize: 11.5, fontWeight: 700,
                  boxShadow: '0 3px 12px rgba(79,70,229,0.35)',
                }}>
                  <Shield style={{ width: 12, height: 12 }} />
                  {t('profile.superAdminBadge')}
                </span>
              )}
              {user.roles?.map((r, i) => {
                if (r.role === 'superadmin' && user.is_superuser) return null
                return <RoleBadge key={i} role={r.role} />
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User style={{ width: 15, height: 15, color: '#94A3B8' }} />
          {t('profile.personalInfoTitle')}
        </h3>
        <div>
          <InfoRow icon={User}  label={t('profile.fullNameLabel')}  value={user.full_name} />
          <InfoRow icon={Phone} label={t('profile.phoneLabel')} value={user.phone} mono />
          <InfoRow icon={Mail}  label={t('profile.emailLabel')}  value={user.email || t('profile.emailNotSet')} />
          <InfoRow icon={Shield} label={t('profile.primaryRoleLabel')}   value={(primaryRole && t(`nav.roles.${primaryRole}`, { defaultValue: primaryRole })) || t('profile.roleNotSet')} />
        </div>
      </div>

      {/* Change password card */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: changingPwd ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key style={{ width: 15, height: 15, color: '#7C3AED' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t('profile.changePasswordTitle')}</p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>{t('profile.changePasswordSubtitle')}</p>
            </div>
          </div>
          <Button
            variant={changingPwd ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => { setChangingPwd(v => !v); reset(); }}
          >
            {changingPwd ? t('common.cancel') : t('profile.changeBtn')}
          </Button>
        </div>

        {changingPwd && (
          <form onSubmit={handleSubmit(onChangePassword)} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PasswordInput
              label={t('profile.currentPasswordLabel')} required
              {...register('old_password', { required: true })}
              placeholder={t('profile.currentPasswordPlaceholder')}
            />
            <PasswordInput
              label={t('profile.newPasswordLabel')} required
              {...register('new_password', { required: true, minLength: { value: 8, message: t('profile.newPasswordMinLength') } })}
              error={errors.new_password?.message}
              placeholder={t('profile.newPasswordPlaceholder')}
              hint={t('profile.newPasswordHint')}
            />
            <PasswordInput
              label={t('profile.confirmPasswordLabel')} required
              {...register('new_password_confirm', { required: true })}
              placeholder={t('profile.confirmPasswordPlaceholder')}
            />
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <Button type="submit" loading={savingPwd} icon={CheckCircle}>
                {t('profile.savePasswordBtn')}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* System info */}
      <div style={{
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
        padding: '18px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield style={{ width: 15, height: 15, color: '#94A3B8' }} />
          {t('profile.systemInfoTitle')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: t('profile.userIdLabel'), value: user.id },
            { label: t('profile.usernameLabel'), value: user.phone, mono: true },
            { label: t('profile.systemVersionLabel'), value: t('profile.systemVersionValue') },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
