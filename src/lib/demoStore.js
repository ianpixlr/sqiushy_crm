import { applyStockUpdates } from './shop'
import { buildCustomerRecord, buildDeleteOrder, buildOrderDraft, buildProductRecord, buildStatusUpdate } from './records'
import { buildSeed } from './seed'

export const DEMO_STORAGE_KEY = 'sqiushy-crm-v1'

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function hydrateOrders(state) {
  const names = new Map(state.customers.map((customer) => [customer.id, customer.name]))
  return sortOrders(state.orders).map((order) => ({
    ...order,
    customerName: names.get(order.customerId) || 'Unknown customer',
  }))
}

export function createDemoStore(storage, extras = {}) {
  const now = extras.now || (() => new Date().toISOString())
  const id = extras.id

  function blank() {
    return buildSeed()
  }

  function read() {
    const raw = storage.getItem(DEMO_STORAGE_KEY)
    if (!raw) {
      const seed = blank()
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed?.products) || !Array.isArray(parsed?.customers) || !Array.isArray(parsed?.orders)) {
        throw new Error('Demo data was unreadable.')
      }
      return parsed
    } catch {
      const seed = blank()
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
  }

  function commit(state) {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
    return publicView(state)
  }

  function publicView(state) {
    return {
      products: sortByName(state.products),
      customers: sortByName(state.customers),
      orders: hydrateOrders(state),
    }
  }

  return {
    loadAll() {
      return publicView(read())
    },
    reset() {
      return commit(blank())
    },
    saveProduct(input) {
      const state = read()
      const existing = state.products.find((product) => product.id === input.id)
      const result = buildProductRecord(input, existing, { now: now(), id })
      if (!result.ok) throw new Error(result.error)
      const products = existing
        ? state.products.map((product) => (product.id === existing.id ? result.product : product))
        : [result.product, ...state.products]
      commit({ ...state, products })
      return result.product
    },
    deleteProduct(productId) {
      const state = read()
      if (!state.products.some((product) => product.id === productId)) {
        throw new Error('That product was not found.')
      }
      const products = state.products.filter((product) => product.id !== productId)
      const orders = state.orders.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          item.productId === productId ? { ...item, productId: null } : item,
        ),
      }))
      commit({ ...state, products, orders })
    },
    saveCustomer(input) {
      const state = read()
      const existing = state.customers.find((customer) => customer.id === input.id)
      const result = buildCustomerRecord(input, existing, { now: now(), id })
      if (!result.ok) throw new Error(result.error)
      const customers = existing
        ? state.customers.map((customer) => (customer.id === existing.id ? result.customer : customer))
        : [result.customer, ...state.customers]
      commit({ ...state, customers })
      return result.customer
    },
    deleteCustomer(customerId) {
      const state = read()
      if (!state.customers.some((customer) => customer.id === customerId)) {
        throw new Error('That customer was not found.')
      }
      if (state.orders.some((order) => order.customerId === customerId)) {
        throw new Error('This customer has orders, so the record stays.')
      }
      commit({
        ...state,
        customers: state.customers.filter((customer) => customer.id !== customerId),
      })
    },
    createOrder(input) {
      const state = read()
      const draft = buildOrderDraft(input, state.products, state.customers, { now: now(), id })
      if (!draft.ok) throw new Error(draft.error)
      commit({
        ...state,
        products: applyStockUpdates(state.products, draft.updates),
        orders: [draft.order, ...state.orders],
      })
      return draft.order
    },
    updateOrderStatus(orderId, patch) {
      const state = read()
      const order = state.orders.find((entry) => entry.id === orderId)
      if (!order) throw new Error('That order was not found.')
      const result = buildStatusUpdate(order, state.products, patch)
      if (!result.ok) throw new Error(result.error)
      commit({
        ...state,
        products: applyStockUpdates(state.products, result.updates),
        orders: state.orders.map((entry) => (entry.id === orderId ? result.order : entry)),
      })
      return result.order
    },
    deleteOrder(orderId) {
      const state = read()
      const order = state.orders.find((entry) => entry.id === orderId)
      if (!order) throw new Error('That order was not found.')
      const result = buildDeleteOrder(order, state.products)
      if (!result.ok) throw new Error(result.error)
      commit({
        ...state,
        products: applyStockUpdates(state.products, result.updates),
        orders: state.orders.filter((entry) => entry.id !== orderId),
      })
    },
  }
}

let singleton = null

export function getDemoStore() {
  if (!singleton) {
    if (typeof localStorage === 'undefined') {
      throw new Error('This browser cannot store the demo shop.')
    }
    singleton = createDemoStore(localStorage)
  }
  return singleton
}
