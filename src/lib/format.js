import { KL_OFFSET_MS, LOW_STOCK_AT } from './constants'

export function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() + KL_OFFSET_MS)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(shifted)
}

export function formatMonth(key) {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function labelFlavour(flavour) {
  const text = String(flavour || '').trim()
  if (!text) return 'No flavour set'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function shortId(id) {
  if (!id) return ''
  return id.length > 12 ? id.slice(0, 8) : id
}

export function stockLabel(stockCount) {
  if (stockCount <= 0) return 'Out of stock'
  if (stockCount <= LOW_STOCK_AT) return `Low stock · ${stockCount} left`
  return `${stockCount} in stock`
}

export function matchesQuery(query, ...parts) {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return true
  return parts.some((part) => String(part || '').toLowerCase().includes(needle))
}

export function parseWholeNumber(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}
