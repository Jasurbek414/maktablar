import { X } from 'lucide-react'
import { useEffect } from 'react'

const SIZES = {
  sm: 460,
  md: 560,
  lg: 760,
  xl: 980,
  full: '95vw',
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && isOpen) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'fadeIn 0.15s ease both',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: SIZES[size] || SIZES.md,
        maxHeight: '90vh',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
        border: '1px solid #E2E8F0',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #F1F5F9',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94A3B8',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 22px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0,
            background: '#FAFAFA',
            borderRadius: '0 0 16px 16px',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* Confirm dialog */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Tasdiqlash', danger = false, variant, loading = false }) {
  const isDanger = danger || variant === 'danger'
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0',
              background: 'white', color: '#374151', fontSize: 13.5,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm} disabled={loading}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: isDanger ? '#EF4444' : '#4F46E5',
              color: 'white', fontSize: 13.5,
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = isDanger ? '#DC2626' : '#4338CA'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDanger ? '#EF4444' : '#4F46E5'; }}
          >
            {loading ? 'Yuklanmoqda...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>{message}</p>
    </Modal>
  )
}
