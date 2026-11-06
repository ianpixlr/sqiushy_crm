import { useEffect, useRef } from 'react'

export function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const node = dialogRef.current
    const focusable = node?.querySelector('input, select, textarea, button')
    focusable?.focus()
    function onKey(event) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="modal-back" onMouseDown={() => onCloseRef.current()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-button" onClick={() => onCloseRef.current()} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({ title, body, confirmLabel, danger, busy, error, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{body}</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
          Back
        </button>
        <button type="button" className={`button${danger ? ' danger' : ''}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
