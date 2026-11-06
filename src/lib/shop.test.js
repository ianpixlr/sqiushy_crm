import { describe, expect, it } from 'vitest'
import { SAFETY_LABEL } from './constants'
import { toCsv } from './csv'
import { createDemoStore } from './demoStore'
import { formatRM } from './money'
import { bestSellingFlavours, lowStockProducts, monthKey, recentMonthKeys, salesByMonth } from './metrics'
import { buildStatusUpdate } from './records'
import { OPENING_STOCK, SAMPLE_PRODUCT_IDS, buildSeed } from './seed'
import {
  applyStockUpdates,
  lineTotalCents,
  orderTotalCents,
  planCreateOrderStock,
  planDeleteOrderStock,
  planFulfilmentChange,
} from './shop'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

describe('order totals', () => {
  it('sums quantity times unit price in cents', () => {
    const items = [
      { quantity: 2, unitPrice: 29.9 },
      { quantity: 1, unitPrice: 27 },
    ]
    expect(lineTotalCents(items[0])).toBe(5980)
    expect(lineTotalCents(items[1])).toBe(2700)
    expect(orderTotalCents(items)).toBe(8680)
    expect(formatRM(86.8)).toBe('RM 86.80')
  })

  it('keeps 0.1 and 0.2 from drifting', () => {
    expect(orderTotalCents([
      { quantity: 1, unitPrice: 0.1 },
      { quantity: 1, unitPrice: 0.2 },
    ])).toBe(30)
  })

  it('rejects a negative price', () => {
    expect(() => orderTotalCents([{ quantity: 1, unitPrice: -1 }])).toThrow(/zero or more/)
  })
})

describe('stock changes', () => {
  const pickle = { id: 'pickle', name: 'Pickle Pete', stockCount: 4 }

  it('reduces stock for a new order and combines duplicate lines', () => {
    const plan = planCreateOrderStock([pickle], [
      { productId: 'pickle', quantity: 1 },
      { productId: 'pickle', quantity: 2 },
    ])
    expect(plan.ok).toBe(true)
    const next = applyStockUpdates([pickle], plan.updates)
    expect(next[0].stockCount).toBe(1)
    expect(pickle.stockCount).toBe(4)
  })

  it('refuses an order when there is not enough stock', () => {
    const plan = planCreateOrderStock([pickle], [{ productId: 'pickle', quantity: 5 }])
    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/Not enough Pickle Pete/)
    expect(plan.error).toMatch(/4 left, 5 requested/)
  })

  it('puts stock back once when an order is cancelled', () => {
    const packed = planFulfilmentChange([pickle], [{ productId: 'pickle', quantity: 2 }], 'packed', 'cancelled')
    expect(packed.updates[0].stockCount).toBe(6)
    const restored = applyStockUpdates([pickle], packed.updates)
    const again = planFulfilmentChange(restored, [{ productId: 'pickle', quantity: 2 }], 'cancelled', 'cancelled')
    expect(again.updates).toEqual([])
  })

  it('takes stock again when a cancelled order is reopened', () => {
    const products = [{ id: 'pickle', name: 'Pickle Pete', stockCount: 2 }]
    const items = [{ productId: 'pickle', quantity: 2 }]
    const plan = planFulfilmentChange(products, items, 'cancelled', 'pending')
    expect(plan.updates[0].stockCount).toBe(0)
    const short = planFulfilmentChange([{ ...products[0], stockCount: 1 }], items, 'cancelled', 'shipped')
    expect(short.ok).toBe(false)
  })

  it('leaves stock alone for packing, shipping, and refunds', () => {
    const items = [{ productId: 'pickle', quantity: 1 }]
    expect(planFulfilmentChange([pickle], items, 'pending', 'shipped').updates).toEqual([])
    const order = {
      paymentStatus: 'paid',
      fulfilmentStatus: 'delivered',
      items,
    }
    const refund = buildStatusUpdate(order, [pickle], { paymentStatus: 'refunded' })
    expect(refund.ok).toBe(true)
    expect(refund.updates).toEqual([])
    expect(refund.order.paymentStatus).toBe('refunded')
  })

  it('restores stock when a live order is deleted, not when it was already cancelled', () => {
    const items = [{ productId: 'pickle', quantity: 2 }]
    expect(planDeleteOrderStock([pickle], items, 'pending').updates[0].stockCount).toBe(6)
    expect(planDeleteOrderStock([pickle], items, 'cancelled').updates).toEqual([])
  })
})

describe('sample shop', () => {
  const seed = buildSeed()
  const stock = Object.fromEntries(seed.products.map((product) => [product.name, product.stockCount]))

  it('marks the four sample toys and keeps the photos', () => {
    expect(seed.products.map((product) => product.name).sort()).toEqual([
      'Brain Freeze',
      'Bubbles the Octopus',
      'Durian Don',
      'Pickle Pete',
    ])
    for (const product of seed.products) {
      expect(product.isSample).toBe(true)
      expect(product.imagePath.startsWith('products/')).toBe(true)
      expect(`${product.name} ${product.flavour} ${product.size} ${product.colour}`).not.toMatch(
        /safe to eat|edible|delicious|tasty|yummy|food-safe|chew|teether/i,
      )
    }
    expect(seed.products.find((product) => product.name === 'Pickle Pete').flavour).toBe('sour apple')
    expect(seed.products.find((product) => product.name === 'Brain Freeze').flavour).toBe('blue raspberry')
    expect(seed.products.find((product) => product.name === 'Durian Don').flavour).toBe('durian')
    expect(seed.products.find((product) => product.name === 'Bubbles the Octopus').flavour).toBe('bubblegum')
  })

  it('matches stock to orders that are not cancelled', () => {
    expect(stock['Pickle Pete']).toBe(14)
    expect(stock['Brain Freeze']).toBe(13)
    expect(stock['Durian Don']).toBe(2)
    expect(stock['Bubbles the Octopus']).toBe(1)
    for (const product of seed.products) {
      const used = seed.orders
        .filter((order) => order.fulfilmentStatus !== 'cancelled')
        .flatMap((order) => order.items)
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0)
      expect(product.stockCount).toBe(OPENING_STOCK[product.id] - used)
    }
    expect(OPENING_STOCK[SAMPLE_PRODUCT_IDS.brain] - 5).toBe(13)
  })

  it('counts paid sales by flavour and month', () => {
    const flavours = bestSellingFlavours(seed.orders)
    expect(flavours.map((flavour) => [flavour.flavour, flavour.quantity])).toEqual([
      ['sour apple', 12],
      ['bubblegum', 7],
      ['blue raspberry', 5],
      ['durian', 3],
    ])
    const months = salesByMonth(seed.orders, recentMonthKeys(new Date('2026-11-06T04:00:00.000Z')))
    const byMonth = Object.fromEntries(months.map((month) => [month.month, month.totalCents]))
    expect(byMonth['2026-06']).toBe(11960)
    expect(byMonth['2026-07']).toBe(9900)
    expect(byMonth['2026-08']).toBe(17940)
    expect(byMonth['2026-09']).toBe(17700)
    expect(byMonth['2026-10']).toBe(22180)
    expect(byMonth['2026-11']).toBe(3450)
    expect(lowStockProducts(seed.products).map((product) => product.name)).toEqual([
      'Bubbles the Octopus',
      'Durian Don',
    ])
  })
})

describe('dates and csv', () => {
  it('uses Malaysia time for the sales month', () => {
    expect(monthKey('2026-10-31T20:00:00.000Z')).toBe('2026-11')
    expect(recentMonthKeys(new Date('2026-11-06T04:00:00.000Z'))).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
  })

  it('exports the fixed safety label and escapes commas', () => {
    const csv = toCsv([{ name: 'Pickle Pete', notes: 'Hello, "shop"' }], [
      { header: 'Name', value: (row) => row.name },
      { header: 'Notes', value: (row) => row.notes },
      { header: 'Safety label', value: () => SAFETY_LABEL },
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain(SAFETY_LABEL)
    expect(csv).toContain('"Hello, ""shop"""')
    expect(SAFETY_LABEL).toBe('Not edible. Contains toxic materials. Keep away from children and pets.')
  })
})

describe('demo shop', () => {
  it('reduces stock on create, restores it once on cancel, and keeps a refund in stock', () => {
    const store = createDemoStore(memoryStorage())
    const before = store.loadAll()
    const pickle = before.products.find((product) => product.name === 'Pickle Pete')
    const customer = before.customers[0]
    const starting = pickle.stockCount

    expect(() => store.createOrder({
      customerId: customer.id,
      paymentStatus: 'paid',
      items: [{ productId: pickle.id, quantity: 9999, unitPrice: 10 }],
    })).toThrow(/Not enough/)
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting)

    const created = store.createOrder({
      customerId: customer.id,
      paymentStatus: 'paid',
      items: [{ productId: pickle.id, quantity: 2, unitPrice: 10 }],
    })
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting - 2)
    expect(orderTotalCents(created.items)).toBe(2000)

    store.updateOrderStatus(created.id, { paymentStatus: 'refunded' })
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting - 2)

    store.updateOrderStatus(created.id, { fulfilmentStatus: 'cancelled' })
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting)
    store.updateOrderStatus(created.id, { fulfilmentStatus: 'cancelled' })
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting)

    store.deleteOrder(created.id)
    expect(store.loadAll().products.find((product) => product.id === pickle.id).stockCount).toBe(starting)
  })
})
