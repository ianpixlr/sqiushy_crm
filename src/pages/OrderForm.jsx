import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { SafetyLabel } from '../components/SafetyLabel'
import { useShop } from '../context/ShopContext'
import { parseWholeNumber } from '../lib/format'
import { centsToAmount, formatRM } from '../lib/money'
import { newId } from '../lib/records'
import { orderTotalCents, planCreateOrderStock } from '../lib/shop'

function blankLine() {
  return { key: newId(), productId: '', quantity: '1', unitPrice: '' }
}

export function OrderForm() {
  const { products, customers, createOrder } = useShop()
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [lines, setLines] = useState([blankLine()])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const draftItems = lines
    .filter((line) => line.productId)
    .map((line) => ({
      productId: line.productId,
      quantity: parseWholeNumber(line.quantity),
      unitPrice: line.unitPrice,
    }))
    .filter((line) => line.quantity && line.quantity > 0)

  const priced = draftItems.every((item) => item.unitPrice !== '' && Number(item.unitPrice) >= 0)
  const preview = draftItems.length && priced ? orderTotalCents(draftItems.map((item) => ({
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
  }))) : null

  const stockPlan = draftItems.length
    ? planCreateOrderStock(
        products,
        draftItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      )
    : null

  function updateLine(key, patch) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function chooseProduct(key, productId) {
    const product = products.find((entry) => entry.id === productId)
    updateLine(key, { productId, unitPrice: product ? String(product.price) : '' })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      const order = await createOrder({
        customerId,
        paymentStatus,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      })
      navigate(`/orders/${order.id}`)
    } catch (error) {
      setFormError(error.message || 'Could not create the order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="New order" lede="Creating an order takes the toys out of stock. It starts as pending.">
        <Link className="button secondary" to="/orders">
          All orders
        </Link>
      </PageHeader>
      {customers.length === 0 || products.length === 0 ? (
        <p className="empty">
          Add a <Link to="/customers">customer</Link> and a <Link to="/products">product</Link> before creating an order.
        </p>
      ) : (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <div className="form-grid two">
            <Field label="Customer">
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
                <option value="">Choose a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment status">
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
          </div>

          <fieldset className="lines">
            <legend>Toys on this order</legend>
            {lines.map((line) => {
              const product = products.find((entry) => entry.id === line.productId)
              const quantity = parseWholeNumber(line.quantity)
              const others = lines.reduce((sum, entry) => {
                if (entry.key === line.key || entry.productId !== line.productId) return sum
                const used = parseWholeNumber(entry.quantity)
                return sum + (used && used > 0 ? used : 0)
              }, 0)
              const left = product && quantity ? product.stockCount - others - quantity : null
              return (
                <div className="line-editor" key={line.key}>
                  <Field label="Product">
                    <select value={line.productId} onChange={(event) => chooseProduct(line.key, event.target.value)} required>
                      <option value="">Choose a toy</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} ({entry.stockCount} in stock)
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quantity">
                    <input
                      inputMode="numeric"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Price each (RM)">
                    <input
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                      required
                    />
                  </Field>
                  <button type="button" className="text-button" onClick={() => setLines(lines.filter((entry) => entry.key !== line.key))}>
                    Remove
                  </button>
                  {product ? (
                    <div className="line-extra">
                      <p className={left != null && left < 0 ? 'form-error' : 'hint'}>
                        {left != null && left < 0
                          ? `Not enough ${product.name}. ${Math.max(product.stockCount - others, 0)} can go on this line.`
                          : `${product.stockCount} in stock now.`}
                      </p>
                      <SafetyLabel />
                    </div>
                  ) : null}
                </div>
              )
            })}
            <button type="button" className="button secondary" onClick={() => setLines([...lines, blankLine()])}>
              Add another toy
            </button>
          </fieldset>

          <p className="total-line">
            Total{' '}
            <strong>{preview == null ? '—' : formatRM(centsToAmount(preview))}</strong>
          </p>
          {stockPlan && !stockPlan.ok ? (
            <p className="form-error" role="alert">
              {stockPlan.error}
            </p>
          ) : null}
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="form-actions">
            <button type="submit" className="button" disabled={busy || (stockPlan && !stockPlan.ok)}>
              {busy ? 'Saving…' : 'Create order'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
