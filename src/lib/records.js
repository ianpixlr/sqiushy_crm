import {
  CHANNELS,
  FULFILMENT_STATUSES,
  MAX_MONEY,
  MAX_QUANTITY,
  PAYMENT_STATUSES,
} from './constants'
import { parseWholeNumber } from './format'
import { roundMoney } from './money'
import { planCreateOrderStock, planDeleteOrderStock, planFulfilmentChange } from './shop'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function moneyField(value, label) {
  const amount = roundMoney(value)
  if (amount == null || amount < 0 || amount >= MAX_MONEY) {
    return { ok: false, error: `${label} must be zero or more.` }
  }
  return { ok: true, amount }
}

export function buildProductRecord(input, existing, extras = {}) {
  const name = String(input.name ?? '').trim()
  if (!name) return { ok: false, error: 'Enter a product name.' }

  const stockCount = parseWholeNumber(input.stockCount)
  if (stockCount == null || stockCount < 0 || stockCount > MAX_QUANTITY) {
    return { ok: false, error: 'Stock must be a whole number, zero or more.' }
  }

  const cost = moneyField(input.cost, 'Cost')
  if (!cost.ok) return cost
  const price = moneyField(input.price, 'Price')
  if (!price.ok) return price

  const makeId = extras.id || newId
  return {
    ok: true,
    product: {
      id: existing?.id || input.id || makeId(),
      name,
      flavour: String(input.flavour ?? '').trim(),
      size: String(input.size ?? '').trim(),
      colour: String(input.colour ?? '').trim(),
      imagePath: String(input.imagePath ?? '').trim(),
      stockCount,
      cost: cost.amount,
      price: price.amount,
      isSample: existing ? Boolean(existing.isSample) : false,
      createdAt: existing?.createdAt || extras.now || new Date().toISOString(),
    },
  }
}

export function buildCustomerRecord(input, existing, extras = {}) {
  const name = String(input.name ?? '').trim()
  if (!name) return { ok: false, error: 'Enter the customer name.' }
  if (!CHANNELS.includes(input.channel)) return { ok: false, error: 'Choose a channel.' }

  const email = String(input.email ?? '').trim()
  if (email && !EMAIL.test(email)) {
    return { ok: false, error: 'Enter a valid email, or leave it blank.' }
  }

  const makeId = extras.id || newId
  return {
    ok: true,
    customer: {
      id: existing?.id || input.id || makeId(),
      name,
      phone: String(input.phone ?? '').trim(),
      email,
      channel: input.channel,
      notes: String(input.notes ?? '').trim(),
      isSample: existing ? Boolean(existing.isSample) : false,
      createdAt: existing?.createdAt || extras.now || new Date().toISOString(),
    },
  }
}

export function buildOrderDraft(input, products, customers, extras = {}) {
  const customer = customers.find((entry) => entry.id === input.customerId)
  if (!customer) return { ok: false, error: 'Choose a customer.' }

  const paymentStatus = input.paymentStatus || 'unpaid'
  if (paymentStatus !== 'unpaid' && paymentStatus !== 'paid') {
    return { ok: false, error: 'A new order starts as unpaid or paid.' }
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: 'Add at least one toy to the order.' }
  }

  const byId = new Map(products.map((product) => [product.id, product]))
  const makeId = extras.id || newId
  const items = []

  for (const item of input.items) {
    const product = byId.get(item.productId)
    if (!product) return { ok: false, error: 'Choose a product for every line.' }
    const quantity = parseWholeNumber(item.quantity)
    if (quantity == null || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, error: 'Quantity must be a whole number of at least 1.' }
    }
    const priceInput = item.unitPrice == null || item.unitPrice === '' ? product.price : item.unitPrice
    const price = moneyField(priceInput, 'Price')
    if (!price.ok) return price
    items.push({
      id: item.id || makeId(),
      productId: product.id,
      productName: product.name,
      flavour: product.flavour,
      quantity,
      unitPrice: price.amount,
    })
  }

  const stock = planCreateOrderStock(products, items)
  if (!stock.ok) return stock

  return {
    ok: true,
    updates: stock.updates,
    order: {
      id: extras.orderId || makeId(),
      customerId: customer.id,
      paymentStatus,
      fulfilmentStatus: 'pending',
      isSample: false,
      createdAt: extras.now || new Date().toISOString(),
      items,
    },
  }
}

export function buildStatusUpdate(order, products, patch) {
  const paymentStatus = patch.paymentStatus ?? order.paymentStatus
  const fulfilmentStatus = patch.fulfilmentStatus ?? order.fulfilmentStatus
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return { ok: false, error: 'Choose a payment status.' }
  }
  if (!FULFILMENT_STATUSES.includes(fulfilmentStatus)) {
    return { ok: false, error: 'Choose a fulfilment status.' }
  }
  const stock = planFulfilmentChange(products, order.items, order.fulfilmentStatus, fulfilmentStatus)
  if (!stock.ok) return stock
  return {
    ok: true,
    updates: stock.updates,
    order: { ...order, paymentStatus, fulfilmentStatus },
  }
}

export function buildDeleteOrder(order, products) {
  const stock = planDeleteOrderStock(products, order.items, order.fulfilmentStatus)
  if (!stock.ok) return stock
  return { ok: true, updates: stock.updates }
}
