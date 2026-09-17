import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '8px 13px',
  border: `1.5px solid ${hasError ? '#EF4444' : '#E2E8F0'}`,
  borderRadius: 9,
  fontSize: 13.5,
  color: '#0F172A',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
})

export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = '', style: extra = {}, required, ...props }, ref
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }} className={className}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            width: 15, height: 15, color: '#94A3B8', pointerEvents: 'none',
          }} />
        )}
        <input
          ref={ref}
          style={{
            ...inputStyle(!!error),
            paddingLeft: Icon ? 34 : 13,
            ...extra,
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? '#EF4444' : '#4F46E5'
            e.target.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.15)'
              : '0 0 0 3px rgba(79,70,229,0.15)'
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
          ⚠ {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 12, color: '#94A3B8' }}>{hint}</p>
      )}
    </div>
  )
})

export const PasswordInput = forwardRef(function PasswordInput(
  { label, error, hint, required, ...props }, ref
) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          style={{ ...inputStyle(!!error), paddingRight: 40 }}
          onFocus={e => {
            e.target.style.borderColor = error ? '#EF4444' : '#4F46E5'
            e.target.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.15)'
              : '0 0 0 3px rgba(79,70,229,0.15)'
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
        <button
          type="button" onClick={() => setShow(v => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#475569'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
        >
          {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: '#EF4444' }}>⚠ {error}</p>}
      {hint && !error && <p style={{ fontSize: 12, color: '#94A3B8' }}>{hint}</p>}
    </div>
  )
})

export function Select({ label, error, hint, required, children, style: extra = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <select
        style={{
          ...inputStyle(!!error),
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 32,
          cursor: 'pointer',
          ...extra,
        }}
        onFocus={e => {
          e.target.style.borderColor = '#4F46E5'
          e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.15)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ fontSize: 12, color: '#EF4444' }}>⚠ {error}</p>}
      {hint && !error && <p style={{ fontSize: 12, color: '#94A3B8' }}>{hint}</p>}
    </div>
  )
}
