import { applyStockUpdates, planCreateOrderStock } from './shop'

export const SAMPLE_PRODUCT_IDS = {
  pickle: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e01',
  brain: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e02',
  durian: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e03',
  bubbles: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e04',
}

export const SAMPLE_CUSTOMER_IDS = {
  aina: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e11',
  marcus: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e12',
  jason: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e13',
  priya: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e14',
  farah: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e15',
  till: '8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e16',
}

export const OPENING_STOCK = {
  [SAMPLE_PRODUCT_IDS.pickle]: 30,
  [SAMPLE_PRODUCT_IDS.brain]: 18,
  [SAMPLE_PRODUCT_IDS.durian]: 5,
  [SAMPLE_PRODUCT_IDS.bubbles]: 8,
}

const CREATED = '2026-01-10T02:00:00.000Z'

function at(day) {
  return `${day}T04:00:00.000Z`
}

function catalogue() {
  return [
    {
      id: SAMPLE_PRODUCT_IDS.pickle,
      name: 'Pickle Pete',
      flavour: 'sour apple',
      size: 'Medium',
      colour: 'Green',
      imagePath: 'products/pickle-pete.jpg',
      stockCount: OPENING_STOCK[SAMPLE_PRODUCT_IDS.pickle],
      cost: 8.5,
      price: 29.9,
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_PRODUCT_IDS.brain,
      name: 'Brain Freeze',
      flavour: 'blue raspberry',
      size: 'Large',
      colour: 'Blue',
      imagePath: 'products/brain-freeze.jpg',
      stockCount: OPENING_STOCK[SAMPLE_PRODUCT_IDS.brain],
      cost: 11,
      price: 36,
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_PRODUCT_IDS.durian,
      name: 'Durian Don',
      flavour: 'durian',
      size: 'Medium',
      colour: 'Yellow-green',
      imagePath: 'products/durian-don.jpg',
      stockCount: OPENING_STOCK[SAMPLE_PRODUCT_IDS.durian],
      cost: 10,
      price: 34.5,
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_PRODUCT_IDS.bubbles,
      name: 'Bubbles the Octopus',
      flavour: 'bubblegum',
      size: 'Small',
      colour: 'Pink',
      imagePath: 'products/bubbles-octopus.jpg',
      stockCount: OPENING_STOCK[SAMPLE_PRODUCT_IDS.bubbles],
      cost: 7.5,
      price: 27,
      isSample: true,
      createdAt: CREATED,
    },
  ]
}

function customers() {
  return [
    {
      id: SAMPLE_CUSTOMER_IDS.aina,
      name: 'Aina Rahman',
      phone: '012-000 1001',
      email: 'aina.rahman.sample@example.com',
      channel: 'Shopee',
      notes: 'Sample buyer from the seeded shop data.',
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_CUSTOMER_IDS.marcus,
      name: 'Marcus Lim',
      phone: '016-000 1002',
      email: 'marcus.lim.sample@example.com',
      channel: 'Instagram',
      notes: 'Sample buyer. Asked for a packed parcel.',
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_CUSTOMER_IDS.jason,
      name: 'Jason Teo',
      phone: '011-000 1003',
      email: 'jason.teo.sample@example.com',
      channel: 'TikTok Shop',
      notes: 'Sample buyer. One order was cancelled.',
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_CUSTOMER_IDS.priya,
      name: 'Priya Nair',
      phone: '017-000 1004',
      email: 'priya.nair.sample@example.com',
      channel: 'In person',
      notes: 'Sample buyer. Collects toys at the weekend market.',
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_CUSTOMER_IDS.farah,
      name: 'Farah Ibrahim',
      phone: '013-000 1005',
      email: 'farah.ibrahim.sample@example.com',
      channel: 'Shopee',
      notes: 'Sample buyer.',
      isSample: true,
      createdAt: CREATED,
    },
    {
      id: SAMPLE_CUSTOMER_IDS.till,
      name: 'Weekend market till',
      phone: '',
      email: 'till.sample@example.com',
      channel: 'Other',
      notes: 'Sample counter used for in-person sales.',
      isSample: true,
      createdAt: CREATED,
    },
  ]
}

function line(id, product, quantity) {
  return {
    id,
    productId: product.id,
    productName: product.name,
    flavour: product.flavour,
    quantity,
    unitPrice: product.price,
  }
}

function order(id, customerId, createdAt, paymentStatus, fulfilmentStatus, items) {
  return {
    id,
    customerId,
    paymentStatus,
    fulfilmentStatus,
    isSample: true,
    createdAt,
    items,
  }
}

function orders(products) {
  const byId = Object.fromEntries(products.map((product) => [product.id, product]))
  const pickle = byId[SAMPLE_PRODUCT_IDS.pickle]
  const brain = byId[SAMPLE_PRODUCT_IDS.brain]
  const durian = byId[SAMPLE_PRODUCT_IDS.durian]
  const bubbles = byId[SAMPLE_PRODUCT_IDS.bubbles]
  const ids = SAMPLE_CUSTOMER_IDS

  return [
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e21', ids.aina, at('2026-06-12'), 'paid', 'delivered', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e31', pickle, 4),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e22', ids.marcus, at('2026-07-03'), 'paid', 'shipped', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e32', brain, 2),
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e33', bubbles, 1),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e23', ids.priya, at('2026-08-18'), 'paid', 'delivered', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e34', pickle, 6),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e24', ids.jason, at('2026-09-02'), 'paid', 'delivered', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e35', brain, 3),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e25', ids.aina, at('2026-09-21'), 'paid', 'packed', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e36', durian, 2),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e26', ids.till, at('2026-10-05'), 'paid', 'delivered', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e37', bubbles, 1),
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e38', pickle, 2),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e27', ids.marcus, at('2026-10-19'), 'unpaid', 'pending', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e39', pickle, 4),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e28', ids.farah, at('2026-10-28'), 'paid', 'delivered', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e3a', bubbles, 5),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e29', ids.priya, at('2026-11-01'), 'paid', 'pending', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e3b', durian, 1),
    ]),
    order('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e2a', ids.jason, at('2026-11-04'), 'paid', 'cancelled', [
      line('8d4f6a1e-1b7a-4c1e-9a11-0a1b2c3d4e3c', brain, 2),
    ]),
  ]
}

export function buildSeed() {
  const products = catalogue()
  const orderList = orders(products)
  let stocked = products.map((product) => ({ ...product }))
  const chronological = [...orderList].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const entry of chronological) {
    if (entry.fulfilmentStatus === 'cancelled') continue
    const plan = planCreateOrderStock(stocked, entry.items)
    if (!plan.ok) throw new Error(`Sample data is inconsistent: ${plan.error}`)
    stocked = applyStockUpdates(stocked, plan.updates)
  }

  return {
    products: stocked,
    customers: customers(),
    orders: orderList,
  }
}
