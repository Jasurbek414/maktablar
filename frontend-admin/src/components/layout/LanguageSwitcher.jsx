import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../../i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = SUPPORTED_LANGUAGES.includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'uz'

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const change = (lng) => {
    i18n.changeLanguage(lng)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={t('language.label')}
        style={{
          height: 38, padding: '0 10px',
          borderRadius: 9,
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#64748B', cursor: 'pointer', transition: 'all 0.15s',
          fontSize: 12.5, fontWeight: 700,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.color = '#4F46E5' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
      >
        <Globe style={{ width: 15, height: 15 }} />
        {current.toUpperCase()}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 150,
          padding: 4, zIndex: 100,
        }}>
          {SUPPORTED_LANGUAGES.map(lng => (
            <button
              key={lng}
              onClick={() => change(lng)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 7, border: 'none',
                background: current === lng ? '#EEF2FF' : 'transparent',
                color: current === lng ? '#4F46E5' : '#374151',
                fontSize: 13, fontWeight: current === lng ? 700 : 500,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { if (current !== lng) e.currentTarget.style.background = '#F8FAFC' }}
              onMouseLeave={e => { if (current !== lng) e.currentTarget.style.background = 'transparent' }}
            >
              {t(`language.${lng}`)}
              {current === lng && <Check style={{ width: 14, height: 14 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
