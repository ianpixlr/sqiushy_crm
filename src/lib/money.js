export function roundMoney(value) {
  if (value == null || value === '') return null
  const numeric = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.round(numeric * 100) / 100
}

export function amountToCents(amount) {
  const rounded = roundMoney(amount)
  if (rounded == null) return null
  return Math.round(rounded * 100)
}

export function centsToAmount(cents) {
  return cents / 100
}

export function formatRM(amount) {
  const rounded = roundMoney(amount) ?? 0
  const negative = rounded < 0
  const [whole, fraction] = Math.abs(rounded).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}RM ${grouped}.${fraction}`
}
