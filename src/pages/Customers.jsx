import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Field, SampleChip, StatusBadge } from '../components/Field'
import { Confirm, Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useShop } from '../context/ShopContext'
import { CHANNELS, FULFILMENT_LABELS, PAYMENT_LABELS } from '../lib/constants'
import { downloadCsv, toCsv } from '../lib/csv'
import { formatDate, matchesQuery, shortId } from '../lib/format'
import { centsToAmount, formatRM } from '../lib/money'
import { isSale, orderTotalCents } from '../lib/shop'

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  channel: 'Shopee',
  notes: '',
}

function spendFor(customerId, orders) {
  return orders
    .filter((order) => order.customerId === customerId && isSale(order))
    .reduce((sum, order) => sum + orderTotalCents(order.items), 0)
}

export function Customers() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { customers, orders, saveCustomer, deleteCustomer } = useShop()
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState('all')
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const visible = customers.filter((customer) => {
    if (channel !== 'all' && customer.channel !== channel) return false
    return matchesQuery(query, customer.name, customer.phone, customer.email, customer.notes)
  })

  const selected = customers.find((customer) => customer.id === customerId)
  const history = useMemo(
    () => orders.filter((order) => order.customerId === customerId),
    [orders, customerId],
  )

  function exportCsv() {
    const csv = toCsv(visible, [
      { header: 'Name', value: (customer) => customer.name },
      { header: 'Phone', value: (customer) => customer.phone },
      { header: 'Email', value: (customer) => customer.email },
      { header: 'Channel', value: (customer) => customer.channel },
      { header: 'Notes', value: (customer) => customer.notes },
      {
        header: 'Orders',
        value: (customer) => orders.filter((order) => order.customerId === customer.id).length,
      },
      {
        header: 'Paid sales (RM)',
        value: (customer) => (spendFor(customer.id, orders) / 100).toFixed(2),
      },
      { header: 'Sample', value: (customer) => (customer.isSample ? 'yes' : 'no') },
    ])
    downloadCsv('customers.csv', csv)
  }

  function openEditor(customer) {
    setFormError('')
    setEditing(
      customer
        ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            channel: customer.channel,
            notes: customer.notes,
          }
        : { ...emptyCustomer },
    )
  }

  async function onSave(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      await saveCustomer(editing)
      setEditing(null)
    } catch (error) {
      setFormError(error.message || 'Could not save the customer.')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setBusy(true)
    try {
      await deleteCustomer(pendingDelete.id)
      setPendingDelete(null)
      if (customerId) navigate('/customers')
    } catch (error) {
      setFormError(error.message || 'Could not delete the customer.')
    } finally {
      setBusy(false)
    }
  }

  if (customerId) {
    return (
      <div className="page">
        <PageHeader title={selected ? selected.name : 'Customer'} lede="Order history for this buyer.">
          <Link className="button secondary" to="/customers">
            All customers
          </Link>
        </PageHeader>
        {!selected ? (
          <p className="empty">That customer is not in the list.</p>
        ) : (
          <>
            <section className="panel detail-grid">
              <div>
                {selected.isSample ? <SampleChip /> : null}
                <p>
                  <strong>Phone.</strong> {selected.phone || 'No phone'}
                </p>
                <p>
                  <strong>Email.</strong> {selected.email || 'No email'}
                </p>
                <p>
                  <strong>Channel.</strong> {selected.channel}
                </p>
                <p>
                  <strong>Paid sales.</strong> {formatRM(centsToAmount(spendFor(selected.id, orders)))}
                </p>
                <p>
                  <strong>Notes.</strong> {selected.notes || 'No notes'}
                </p>
                <div className="card-actions">
                  <button type="button" className="button secondary" onClick={() => openEditor(selected)}>
                    Edit
                  </button>
                  {history.length === 0 ? (
                    <button type="button" className="button danger" onClick={() => setPendingDelete(selected)}>
                      Delete
                    </button>
                  ) : (
                    <p className="hint">This customer has orders, so the record stays.</p>
                  )}
                </div>
              </div>
            </section>
            <section className="panel">
              <h2>Order history</h2>
              {history.length === 0 ? (
                <p className="empty">No orders yet.</p>
              ) : (
                <div className="record-list">
                  {history.map((order) => (
                    <article className="record record-5" key={order.id}>
                      <div>
                        <Link to={`/orders/${order.id}`}>{formatDate(order.createdAt)}</Link>
                        <div className="muted">{shortId(order.id)}</div>
                      </div>
                      <div>{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}</div>
                      <strong>{formatRM(centsToAmount(orderTotalCents(order.items)))}</strong>
                      <StatusBadge kind={order.paymentStatus} label={PAYMENT_LABELS[order.paymentStatus]} />
                      <StatusBadge kind={order.fulfilmentStatus} label={FULFILMENT_LABELS[order.fulfilmentStatus]} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        {editing ? (
          <CustomerForm
            editing={editing}
            setEditing={setEditing}
            onSave={onSave}
            busy={busy}
            formError={formError}
            onClose={() => setEditing(null)}
          />
        ) : null}
        {pendingDelete ? (
          <Confirm
            title={`Delete ${pendingDelete.name}?`}
            body="This removes the customer from the shop."
            confirmLabel="Delete customer"
            danger
            busy={busy}
            error={formError}
            onConfirm={onDelete}
            onClose={() => setPendingDelete(null)}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title="Customers" lede="People and counters that buy from the shop.">
        <button type="button" className="button secondary" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="button" onClick={() => openEditor(null)}>
          Add customer
        </button>
      </PageHeader>
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, email, or notes"
          aria-label="Search customers"
        />
        <select aria-label="Filter by channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
          <option value="all">All channels</option>
          {CHANNELS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="empty">Nothing matches that search.</p>
      ) : (
        <div className="record-list panel">
          {visible.map((customer) => {
            const count = orders.filter((order) => order.customerId === customer.id).length
            return (
              <article className="record record-4" key={customer.id}>
                <div>
                  <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
                  {customer.isSample ? (
                    <div className="chip-row">
                      <SampleChip />
                    </div>
                  ) : null}
                  <div className="muted">{customer.channel}</div>
                </div>
                <div>
                  <div>{customer.phone || 'No phone'}</div>
                  <div className="muted">{customer.email || 'No email'}</div>
                </div>
                <div>
                  {count} {count === 1 ? 'order' : 'orders'}
                </div>
                <div>
                  <strong>{formatRM(centsToAmount(spendFor(customer.id, orders)))}</strong>
                  <div className="muted">Paid</div>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {editing ? (
        <CustomerForm
          editing={editing}
          setEditing={setEditing}
          onSave={onSave}
          busy={busy}
          formError={formError}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {pendingDelete ? (
        <Confirm
          title={`Delete ${pendingDelete.name}?`}
          body="This removes the customer from the shop."
          confirmLabel="Delete customer"
          danger
          busy={busy}
          error={formError}
          onConfirm={onDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  )
}

function CustomerForm({ editing, setEditing, onSave, busy, formError, onClose }) {
  return (
    <Modal title={editing.id ? 'Edit customer' : 'Add customer'} onClose={onClose}>
      <form onSubmit={onSave} className="form-grid">
        <Field label="Name">
          <input
            value={editing.name}
            onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            autoComplete="name"
            required
          />
        </Field>
        <div className="form-grid two">
          <Field label="Phone">
            <input
              value={editing.phone}
              onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
              autoComplete="tel"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={editing.email}
              onChange={(event) => setEditing({ ...editing, email: event.target.value })}
              autoComplete="email"
            />
          </Field>
        </div>
        <Field label="Channel">
          <select
            value={editing.channel}
            onChange={(event) => setEditing({ ...editing, channel: event.target.value })}
          >
            {CHANNELS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            value={editing.notes}
            onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
          />
        </Field>
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Save customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
