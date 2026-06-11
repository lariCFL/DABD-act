import { useState } from 'react'
import { useApp } from '../context/AppContext'

// ── Toast Container ───────────────────────────────────────────
export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="toast-container">
      {toasts.map(({ id, msg, type }) => (
        <div key={id} className={`toast ${type}`}>
          <i className={`ti ti-${type === 'error' ? 'alert-circle' : 'check'}`} style={{ fontSize: 16 }} />
          {msg}
        </div>
      ))}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────
export function Modal() {
  const { modal, closeModal } = useApp()
  if (!modal) return null
  const { title, body, footer } = modal
  return (
    <div className={`modal-overlay open`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={closeModal}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="modal-body">{body}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ── Stars ────────────────────────────────────────────────────
export function Stars({ value = 0, max = 5, interactive = false, onChange }) {
  const [hover, setHover] = useState(null)
  const display = hover ?? value
  return (
    <div className="stars">
      {Array.from({ length: max }).map((_, i) => (
        <i
          key={i}
          className={`ti ${i < display ? 'ti-star-filled star filled' : 'ti-star star'}`}
          style={interactive ? { cursor: 'pointer', fontSize: 22 } : undefined}
          onClick={interactive ? () => onChange?.(i + 1) : undefined}
          onMouseEnter={interactive ? () => setHover(i + 1) : undefined}
          onMouseLeave={interactive ? () => setHover(null) : undefined}
        />
      ))}
    </div>
  )
}

// ── Loading ──────────────────────────────────────────────────
export function LoadingState({ text = 'Carregant...' }) {
  return (
    <div className="loading">
      <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 18 }} />
      {text}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Empty ────────────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title = 'Res per aquí', text = '' }) {
  return (
    <div className="empty">
      <i className={`ti ti-${icon}`} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

// ── Error ────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <i className="ti ti-alert-circle" style={{ color: 'var(--red)' }} />
      <h3>S'ha produït un error</h3>
      <p style={{ marginBottom: 16 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          <i className="ti ti-refresh" /> Tornar a intentar
        </button>
      )}
    </div>
  )
}
