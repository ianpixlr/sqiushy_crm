import { supabase } from './supabaseClient'
import {
  buildCustomerRecord,
  buildDeleteOrder,
  buildOrderDraft,
  buildProductRecord,
  buildStatusUpdate,
} from './records'

function db() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function raise(error, fallback) {
  if (!error) return
  if (error.code === '23503') {
    throw new Error('This customer has orders, so the record stays.')
  }
  const text = error.message || fallback
  if (/row-level security|jwt/i.test(text)) {
    throw new Error('Sign in to load the shop. The database only allows signed-in users.')
  }
  throw new Error(text)
}

function productFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    flavour: row.flavour || '',
    size: row.size || '',
    colour: row.colour || '',
    imagePath: row.image_path || '',
    stockCount: Number(row.stock_count),
    cost: Number(row.cost),
    price: Number(row.price),
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
  }
}

function customerFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    channel: row.channel,
    notes: row.notes || '',
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
  }
}

function orderFromRow(row) {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: customer?.name || 'Unknown customer',
    paymentStatus: row.payment_status,
    fulfilmentStatus: row.fulfilment_status,
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
    items: (row.order_items || [])
      .map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        flavour: item.flavour || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName)),
  }
}

const orderSelect = `
  id, customer_id, payment_status, fulfilment_status, is_sample, created_at,
  customers ( name ),
  order_items ( id, product_id, product_name, flavour, quantity, unit_price )
`

export async function listProducts() {
  const { data, error } = await db().from('products').select('*').order('name')
  raise(error, 'Could not load products.')
  return (data || []).map(productFromRow)
}

export async function listCustomers() {
  const { data, error } = await db().from('customers').select('*').order('name')
  raise(error, 'Could not load customers.')
  return (data || []).map(customerFromRow)
}

export async function listOrders() {
  const { data, error } = await db().from('orders').select(orderSelect).order('created_at', { ascending: false })
  raise(error, 'Could not load orders.')
  return (data || []).map(orderFromRow)
}

export async function loadAll() {
  const [products, customers, orders] = await Promise.all([listProducts(), listCustomers(), listOrders()])
  return { products, customers, orders }
}

async function writeStock(updates) {
  const applied = []
  try {
    for (const update of updates) {
      const { data, error } = await db()
        .from('products')
        .update({ stock_count: update.stockCount })
        .eq('id', update.productId)
        .eq('stock_count', update.previous)
        .select('id')
      raise(error, 'Could not update stock.')
      if (!data?.length) throw new Error('Stock changed while saving. Refresh and try again.')
      applied.push(update)
    }
  } catch (error) {
    await revertStock(applied)
    throw error
  }
}

async function revertStock(updates) {
  for (const update of [...updates].reverse()) {
    await db()
      .from('products')
      .update({ stock_count: update.previous })
      .eq('id', update.productId)
      .eq('stock_count', update.stockCount)
  }
}

export async function saveProduct(input) {
  const existing = input.id ? (await listProducts()).find((product) => product.id === input.id) : null
  const result = buildProductRecord(input, existing)
  if (!result.ok) throw new Error(result.error)
  const row = {
    id: result.product.id,
    name: result.product.name,
    flavour: result.product.flavour,
    size: result.product.size,
    colour: result.product.colour,
    image_path: result.product.imagePath,
    stock_count: result.product.stockCount,
    cost: result.product.cost,
    price: result.product.price,
    is_sample: result.product.isSample,
    created_at: result.product.createdAt,
  }
  const query = existing ? db().from('products').update(row).eq('id', row.id) : db().from('products').insert(row)
  const { error } = await query
  raise(error, 'Could not save the product.')
  return result.product
}

export async function deleteProduct(productId) {
  const { error } = await db().from('products').delete().eq('id', productId)
  raise(error, 'Could not delete the product.')
}

export async function saveCustomer(input) {
  const existing = input.id ? (await listCustomers()).find((customer) => customer.id === input.id) : null
  const result = buildCustomerRecord(input, existing)
  if (!result.ok) throw new Error(result.error)
  const row = {
    id: result.customer.id,
    name: result.customer.name,
    phone: result.customer.phone,
    email: result.customer.email,
    channel: result.customer.channel,
    notes: result.customer.notes,
    is_sample: result.customer.isSample,
    created_at: result.customer.createdAt,
  }
  const query = existing ? db().from('customers').update(row).eq('id', row.id) : db().from('customers').insert(row)
  const { error } = await query
  raise(error, 'Could not save the customer.')
  return result.customer
}

export async function deleteCustomer(customerId) {
  const { error } = await db().from('customers').delete().eq('id', customerId)
  raise(error, 'Could not delete the customer.')
}

export async function createOrder(input) {
  const [products, customers] = await Promise.all([listProducts(), listCustomers()])
  const draft = buildOrderDraft(input, products, customers)
  if (!draft.ok) throw new Error(draft.error)

  await writeStock(draft.updates)

  const { error: orderError } = await db().from('orders').insert({
    id: draft.order.id,
    customer_id: draft.order.customerId,
    payment_status: draft.order.paymentStatus,
    fulfilment_status: draft.order.fulfilmentStatus,
    is_sample: false,
    created_at: draft.order.createdAt,
  })
  if (orderError) {
    await revertStock(draft.updates)
    raise(orderError, 'Could not save the order.')
  }

  const { error: itemError } = await db().from('order_items').insert(
    draft.order.items.map((item) => ({
      id: item.id,
      order_id: draft.order.id,
      product_id: item.productId,
      product_name: item.productName,
      flavour: item.flavour,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  )
  if (itemError) {
    await db().from('orders').delete().eq('id', draft.order.id)
    await revertStock(draft.updates)
    raise(itemError, 'Could not save the toys on this order.')
  }
  return draft.order
}

async function getOrder(orderId) {
  const { data, error } = await db().from('orders').select(orderSelect).eq('id', orderId).maybeSingle()
  raise(error, 'Could not load that order.')
  if (!data) throw new Error('That order was not found.')
  return orderFromRow(data)
}

export async function updateOrderStatus(orderId, patch) {
  const [order, products] = await Promise.all([getOrder(orderId), listProducts()])
  const result = buildStatusUpdate(order, products, patch)
  if (!result.ok) throw new Error(result.error)
  await writeStock(result.updates)
  const { data, error } = await db()
    .from('orders')
    .update({
      payment_status: result.order.paymentStatus,
      fulfilment_status: result.order.fulfilmentStatus,
    })
    .eq('id', order.id)
    .eq('payment_status', order.paymentStatus)
    .eq('fulfilment_status', order.fulfilmentStatus)
    .select('id')
  if (error || !data?.length) {
    await revertStock(result.updates)
    if (error) raise(error, 'Could not update the order.')
    throw new Error('That order changed while saving. Refresh and try again.')
  }
  return result.order
}

export async function deleteOrder(orderId) {
  const [order, products] = await Promise.all([getOrder(orderId), listProducts()])
  const result = buildDeleteOrder(order, products)
  if (!result.ok) throw new Error(result.error)
  await writeStock(result.updates)
  const { error } = await db().from('orders').delete().eq('id', order.id)
  if (error) {
    await revertStock(result.updates)
    raise(error, 'Could not delete the order.')
  }
}

export async function signIn(email, password) {
  const { error } = await db().auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signUp(email, password) {
  const { data, error } = await db().auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  const { error } = await db().auth.signOut()
  if (error) throw new Error(error.message)
}

export async function currentSession() {
  const { data, error } = await db().auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export function watchAuth(callback) {
  const { data } = db().auth.onAuthStateChange(() => {
    callback()
  })
  return () => data.subscription.unsubscribe()
}
