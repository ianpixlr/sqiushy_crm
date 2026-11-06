export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function SampleChip() {
  return <span className="sample-chip">Sample</span>
}

export function StatusBadge({ kind, label }) {
  return <span className={`badge ${kind}`}>{label}</span>
}
