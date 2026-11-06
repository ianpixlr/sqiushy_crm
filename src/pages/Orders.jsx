import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SampleChip, StatusBadge } from '../components/Field'
import { Confirm } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { SafetyLabel } from '../components/SafetyLabel'
import { useShop } from '../context/ShopContext'
import { FULFILMENT_LABELS, FULFILMENT_STATUSES, PAYMENT_LABELS, PAYMENT_STATUSES } from '../lib/constants'
import { downloadCsv, toCsv } from '../lib/csv'
import { formatDate, matchesQuery, shortId } from '../lib/format'
import { centsToAmount, formatRM } from '../lib/money'
import { lineTotalCents, orderTotalCents } from '../lib/shop'

function itemSummary(order) {
  return order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')
}

export function Orders() {
  const { orderId } = useParams()
  if (orderId) return <OrderDetail key={orderId} orderId={orderId} />
  return <OrderList />
}

function OrderList() {
  const { orders } = useShop()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [payment, setPayment] = useState(params.get('payment') || 'all')
  const [fulfilment, setFulfilment] = useState('all')

  const visible = orders.filter((order) => {
    if (payment !== 'all' && order.paymentStatus !== payment) return false
    if (fulfilment !== 'all' && order.fulfilmentStatus !== fulfilment) return false
    return matchesQuery(
      query,
      order.customerName,
      order.id,
      ...order.items.map((item) => item.productName),
      ...order.items.map((item) => item.flavour),
    )
  })

  function exportCsv() {
    const csv = toCsv(visible, [
      { header: 'Order', value: (order) => order.id },
      { header: 'Date', value: (order) => formatDate(order.createdAt) },
      { header: 'Customer', value: (order) => order.customerName },
      { header: 'Payment', value: (order) => PAYMENT_LABELS[order.paymentStatus] },
      { header: 'Fulfilment', value: (order) => FULFILMENT_LABELS[order.fulfilmentStatus] },
      { header: 'Items', value: (order) => itemSummary(order) },
      { header: 'Total (RM)', value: (order) => (orderTotalCents(order.items) / 100).toFixed(2) },
      { header: 'Sample', value: (order) => (order.isSample ? 'yes' : 'no') },
    ])
    downloadCsv('orders.csv', csv)
  }

  return (
    <div className="page">
      <PageHeader title="Orders" lede="Cancelling an order puts the toys back in stock.">
        <button type="button" className="button secondary" onClick={exportCsv}>
          Export CSV
        </button>
        <Link className="button" to="/orders/new">
          New order
        </Link>
      </PageHeader>
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer, toy, or order id"
          aria-label="Search orders"
        />
        <select aria-label="Filter by payment" value={payment} onChange={(event) => setPayment(event.target.value)}>
          <option value="all">All payments</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by fulfilment"
          value={fulfilment}
          onChange={(event) => setFulfilment(event.target.value)}
        >
          <option value="all">All fulfilment</option>
          {FULFILMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {FULFILMENT_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="empty">Nothing matches that search.</p>
      ) : (
        <div className="record-list panel">
          {visible.map((order) => (
            <article className="record record-5" key={order.id}>
              <div>
                <Link to={`/orders/${order.id}`}>{formatDate(order.createdAt)}</Link>
                {order.isSample ? (
                  <div className="chip-row">
                    <SampleChip />
                  </div>
                ) : null}
                <div className="muted">
                  {order.customerName} · {shortId(order.id)}
                </div>
              </div>
              <div>{itemSummary(order)}</div>
              <strong>{formatRM(centsToAmount(orderTotalCents(order.items)))}</strong>
              <StatusBadge kind={order.paymentStatus} label={PAYMENT_LABELS[order.paymentStatus]} />
              <StatusBadge kind={order.fulfilmentStatus} label={FULFILMENT_LABELS[order.fulfilmentStatus]} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderDetail({ orderId }) {
  const { orders, updateOrderStatus, deleteOrder } = useShop()
  const navigate = useNavigate()
  const order = orders.find((entry) => entry.id === orderId)
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || 'unpaid')
  const [fulfilmentStatus, setFulfilmentStatus] = useState(order?.fulfilmentStatus || 'pending')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!order) return
    setPaymentStatus(order.paymentStatus)
    setFulfilmentStatus(order.fulfilmentStatus)
  }, [order?.id, order?.paymentStatus, order?.fulfilmentStatus])

  if (!order) {
    return (
      <div className="page">
        <PageHeader title="Order" lede="That order is not in the list.">
          <Link className="button secondary" to="/orders">
            All orders
          </Link>
        </PageHeader>
      </div>
    )
  }

  const payment = paymentStatus || order.paymentStatus
  const fulfilment = fulfilmentStatus || order.fulfilmentStatus

  async function onUpdate(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      await updateOrderStatus(order.id, { paymentStatus: payment, fulfilmentStatus: fulfilment })
    } catch (error) {
      setFormError(error.message || 'Could not update the order.')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setBusy(true)
    setFormError('')
    try {
      await deleteOrder(order.id)
      navigate('/orders')
    } catch (error) {
      setFormError(error.message || 'Could not delete the order.')
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={formatDate(order.createdAt)}
        lede={`${order.customerName} · ${shortId(order.id)}`}
      >
        <Link className="button secondary" to="/orders">
          All orders
        </Link>
      </PageHeader>
      {order.isSample ? (
        <p className="chip-row">
          <SampleChip /> Sample order
        </p>
      ) : null}
      <section className="panel">
        <h2>Toys</h2>
        <p className="hint">Line items stay as they were when the order was created. Cancel and create a new order to change them.</p>
        <div className="line-list">
          {order.items.map((item) => (
            <article key={item.id} className="line-item">
              <div>
                <strong>{item.productName}</strong>
                <div className="muted">{item.flavour || 'No flavour set'}</div>
              </div>
              <div>
                {item.quantity} × {formatRM(item.unitPrice)}
              </div>
              <strong>{formatRM(centsToAmount(lineTotalCents(item)))}</strong>
              <SafetyLabel />
            </article>
          ))}
        </div>
        <p className="total-line">
          Total <strong>{formatRM(centsToAmount(orderTotalCents(order.items)))}</strong>
        </p>
      </section>
      <form className="panel form-grid" onSubmit={onUpdate}>
        <h2>Status</h2>
        <div className="form-grid two">
          <label className="field">
            <span>Payment status</span>
            <select value={payment} onChange={(event) => setPaymentStatus(event.target.value)}>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fulfilment status</span>
            <select value={fulfilment} onChange={(event) => setFulfilmentStatus(event.target.value)}>
              {FULFILMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {FULFILMENT_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {fulfilment === 'cancelled' && order.fulfilmentStatus !== 'cancelled' ? (
          <p className="hint">Cancelling puts these toys back in stock.</p>
        ) : null}
        {order.fulfilmentStatus === 'cancelled' && fulfilment !== 'cancelled' ? (
          <p className="hint">Moving this order out of cancelled takes the toys out of stock again.</p>
        ) : null}
        {payment === 'refunded' ? (
          <p className="hint">Refunded only changes the payment. Cancel the order if the toys come back into stock.</p>
        ) : null}
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" className="button danger" onClick={() => setConfirmDelete(true)}>
            Delete order
          </button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Update status'}
          </button>
        </div>
      </form>
      {confirmDelete ? (
        <Confirm
          title="Delete this order?"
          body={
            order.fulfilmentStatus === 'cancelled'
              ? 'The toys were already returned to stock when the order was cancelled.'
              : 'The toys go back into stock.'
          }
          confirmLabel="Delete order"
          danger
          busy={busy}
          error={formError}
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </div>
  )
}
