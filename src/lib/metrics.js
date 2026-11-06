import { KL_OFFSET_MS, LOW_STOCK_AT } from './constants'
import { isSale, orderTotalCents } from './shop'

export function monthKey(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new Error('That date is not valid.')
  const shifted = new Date(date.getTime() + KL_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function recentMonthKeys(now = new Date(), count = 6) {
  const current = monthKey(now.toISOString())
  let year = Number(current.slice(0, 4))
  let month = Number(current.slice(5, 7))
  const keys = []
  for (let index = 0; index < count; index += 1) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return keys.reverse()
}

export function bestSellingFlavours(orders, limit = 5) {
  const totals = new Map()
  for (const order of orders) {
    if (!isSale(order)) continue
    for (const item of order.items) {
      const flavour = (item.flavour || '').trim() || 'No flavour set'
      const current = totals.get(flavour) || { flavour, quantity: 0, revenueCents: 0 }
      current.quantity += item.quantity
      current.revenueCents += orderTotalCents([item])
      totals.set(flavour, current)
    }
  }
  return [...totals.values()]
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.revenueCents - a.revenueCents ||
        a.flavour.localeCompare(b.flavour),
    )
    .slice(0, limit)
}

export function salesByMonth(orders, monthKeys) {
  const buckets = new Map(monthKeys.map((key) => [key, { month: key, totalCents: 0, orders: 0 }]))
  for (const order of orders) {
    if (!isSale(order)) continue
    const key = monthKey(order.createdAt)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.totalCents += orderTotalCents(order.items)
    bucket.orders += 1
  }
  return monthKeys.map((key) => buckets.get(key))
}

export function lowStockProducts(products, threshold = LOW_STOCK_AT) {
  return products
    .filter((product) => product.stockCount <= threshold)
    .sort((a, b) => a.stockCount - b.stockCount || a.name.localeCompare(b.name))
}

export function monthSales(orders, month) {
  return orders.reduce(
    (summary, order) => {
      if (!isSale(order) || monthKey(order.createdAt) !== month) return summary
      summary.totalCents += orderTotalCents(order.items)
      summary.orders += 1
      return summary
    },
    { totalCents: 0, orders: 0 },
  )
}

export function unpaidOrders(orders) {
  return orders.filter(
    (order) => order.paymentStatus === 'unpaid' && order.fulfilmentStatus !== 'cancelled',
  )
}
