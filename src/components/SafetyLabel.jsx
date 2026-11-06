import { SAFETY_LABEL } from '../lib/constants'

export function SafetyLabel() {
  return (
    <p className="safety">
      <span className="safety-mark" aria-hidden="true">
        !
      </span>
      <span>{SAFETY_LABEL}</span>
    </p>
  )
}
