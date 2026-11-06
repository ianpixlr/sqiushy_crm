import { amountToCents } from './money'

function combinedQuantities(items, direction) {
  const totals = new Map()
  for (const item of items) {
    const quantity = item.quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: 'Quantity must be a whole number of at least 1.' }
    }
    if (!item.productId) {
      if (direction === 1) continue
      return { ok: false, error: 'A product on this order is no longer in the catalogue.' }
    }
    totals.set(item.productId, (totals.get(item.productId) || 0) + quantity)
  }
  return { ok: true, totals }
}

export function planStockAdjustment(products, items, direction) {
  if (direction !== 1 && direction !== -1) {
    return { ok: false, error: 'Stock direction is invalid.' }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Add at least one toy to the order.' }
  }

  const combined = combinedQuantities(items, direction)
  if (!combined.ok) return combined

  const byId = new Map(products.map((product) => [product.id, product]))
  const updates = []

  for (const [productId, quantity] of combined.totals) {
    const product = byId.get(productId)
    if (!product) {
      if (direction === 1) continue
      return { ok: false, error: 'A product on this order is no longer in the catalogue.' }
    }
    if (!Number.isInteger(product.stockCount)) {
      return { ok: false, error: `Stock for ${product.name} is unreadable.` }
    }
    const stockCount = product.stockCount + direction * quantity
    if (stockCount < 0) {
      return {
        ok: false,
        error: `Not enough ${product.name} in stock. ${product.stockCount} left, ${quantity} requested.`,
      }
    }
    updates.push({ productId, stockCount, previous: product.stockCount })
  }

  return { ok: true, updates }
}

export function planCreateOrderStock(products, items) {
  return planStockAdjustment(products, items, -1)
}

export function planFulfilmentChange(products, items, fromStatus, toStatus) {
  const wasCancelled = fromStatus === 'cancelled'
  const willCancel = toStatus === 'cancelled'
  if (wasCancelled === willCancel) return { ok: true, updates: [] }
  return planStockAdjustment(products, items, willCancel ? 1 : -1)
}

export function planDeleteOrderStock(products, items, fulfilmentStatus) {
  if (fulfilmentStatus === 'cancelled') return { ok: true, updates: [] }
  return planStockAdjustment(products, items, 1)
}

export function applyStockUpdates(products, updates) {
  const nextStock = new Map(updates.map((update) => [update.productId, update.stockCount]))
  return products.map((product) =>
    nextStock.has(product.id) ? { ...product, stockCount: nextStock.get(product.id) } : product,
  )
}

export function lineTotalCents(item) {
  if (!Number.isInteger(item.quantity)) {
    throw new Error('Quantity must be a whole number.')
  }
  const cents = amountToCents(item.unitPrice)
  if (cents == null || cents < 0) {
    throw new Error('Price must be zero or more.')
  }
  return cents * item.quantity
}

export function orderTotalCents(items) {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0)
}

export function isSale(order) {
  return order.paymentStatus === 'paid' && order.fulfilmentStatus !== 'cancelled'
}
