import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Field, SampleChip } from '../components/Field'
import { Confirm, Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { SafetyLabel } from '../components/SafetyLabel'
import { useShop } from '../context/ShopContext'
import { LOW_STOCK_AT, SAFETY_LABEL } from '../lib/constants'
import { downloadCsv, toCsv } from '../lib/csv'
import { matchesQuery, stockLabel } from '../lib/format'
import { productImageSrc } from '../lib/image'
import { formatRM } from '../lib/money'

const emptyProduct = {
  name: '',
  flavour: '',
  size: '',
  colour: '',
  imagePath: '',
  stockCount: '0',
  cost: '',
  price: '',
}

function ProductPhoto({ product }) {
  const [failed, setFailed] = useState(false)
  const src = productImageSrc(product.imagePath)
  if (!src || failed) {
    return (
      <div className="photo-fallback" aria-hidden="true">
        {product.name.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={`${product.name}, novelty squishy toy`}
      onError={() => setFailed(true)}
    />
  )
}

export function Products() {
  const { products, saveProduct, deleteProduct } = useShop()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [size, setSize] = useState('all')
  const [stock, setStock] = useState(params.get('stock') === 'low' ? 'low' : 'all')
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (params.get('stock') === 'low') setStock('low')
  }, [params])

  const sizes = useMemo(
    () => [...new Set(products.map((product) => product.size).filter(Boolean))].sort(),
    [products],
  )

  const visible = products.filter((product) => {
    if (size !== 'all' && product.size !== size) return false
    if (stock === 'low' && product.stockCount > LOW_STOCK_AT) return false
    if (stock === 'out' && product.stockCount > 0) return false
    return matchesQuery(query, product.name, product.flavour, product.colour, product.size)
  })

  function exportCsv() {
    const csv = toCsv(visible, [
      { header: 'Name', value: (product) => product.name },
      { header: 'Flavour', value: (product) => product.flavour },
      { header: 'Size', value: (product) => product.size },
      { header: 'Colour', value: (product) => product.colour },
      { header: 'Stock', value: (product) => product.stockCount },
      { header: 'Cost (RM)', value: (product) => product.cost.toFixed(2) },
      { header: 'Price (RM)', value: (product) => product.price.toFixed(2) },
      { header: 'Sample', value: (product) => (product.isSample ? 'yes' : 'no') },
      { header: 'Image', value: (product) => product.imagePath },
      { header: 'Safety label', value: () => SAFETY_LABEL },
    ])
    downloadCsv('products.csv', csv)
  }

  async function onSave(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      await saveProduct({ ...editing })
      setEditing(null)
    } catch (error) {
      setFormError(error.message || 'Could not save the product.')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setBusy(true)
    setFormError('')
    try {
      await deleteProduct(pendingDelete.id)
      setPendingDelete(null)
    } catch (error) {
      setFormError(error.message || 'Could not delete the product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Products"
        lede="Prices are in Malaysian ringgit. Flavour is the scent name on the toy."
      >
        <button type="button" className="button secondary" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="button" onClick={() => { setFormError(''); setEditing({ ...emptyProduct }) }}>
          Add product
        </button>
      </PageHeader>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, flavour, size, or colour"
          aria-label="Search products"
        />
        <select aria-label="Filter by size" value={size} onChange={(event) => setSize(event.target.value)}>
          <option value="all">All sizes</option>
          {sizes.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <select aria-label="Filter by stock" value={stock} onChange={(event) => setStock(event.target.value)}>
          <option value="all">All stock</option>
          <option value="low">Low stock (5 or fewer)</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="empty">Nothing matches that search.</p>
      ) : (
        <div className="product-grid">
          {visible.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-photo">
                <ProductPhoto product={product} />
                {product.isSample ? <SampleChip /> : null}
              </div>
              <div className="product-body">
                <h2>{product.name}</h2>
                <p className="meta">
                  {[product.flavour, product.size, product.colour].filter(Boolean).join(' · ') || 'No details yet'}
                </p>
                <p className={`stock-line ${product.stockCount <= 0 ? 'out' : product.stockCount <= LOW_STOCK_AT ? 'low' : 'ok'}`}>
                  {stockLabel(product.stockCount)}
                </p>
                <p className="price-line">
                  <strong>{formatRM(product.price)}</strong>
                  <span>Cost {formatRM(product.cost)}</span>
                </p>
                <SafetyLabel />
                <div className="card-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setFormError('')
                      setEditing({
                        id: product.id,
                        name: product.name,
                        flavour: product.flavour,
                        size: product.size,
                        colour: product.colour,
                        imagePath: product.imagePath,
                        stockCount: String(product.stockCount),
                        cost: String(product.cost),
                        price: String(product.price),
                      })
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="button danger" onClick={() => setPendingDelete(product)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <Modal title={editing.id ? 'Edit product' : 'Add product'} onClose={() => setEditing(null)}>
          <form onSubmit={onSave} className="form-grid">
            <Field label="Name">
              <input
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Flavour" hint="Scent name printed on the toy. Not a food.">
              <input
                value={editing.flavour}
                onChange={(event) => setEditing({ ...editing, flavour: event.target.value })}
              />
            </Field>
            <div className="form-grid two">
              <Field label="Size">
                <input
                  value={editing.size}
                  onChange={(event) => setEditing({ ...editing, size: event.target.value })}
                  placeholder="Medium"
                />
              </Field>
              <Field label="Colour">
                <input
                  value={editing.colour}
                  onChange={(event) => setEditing({ ...editing, colour: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Image" hint="A site path such as products/pickle-pete.jpg, or a full image address.">
              <input
                value={editing.imagePath}
                onChange={(event) => setEditing({ ...editing, imagePath: event.target.value })}
              />
            </Field>
            <div className="form-grid two">
              <Field label="Stock count">
                <input
                  inputMode="numeric"
                  value={editing.stockCount}
                  onChange={(event) => setEditing({ ...editing, stockCount: event.target.value })}
                  required
                />
              </Field>
              <Field label="Cost (RM)">
                <input
                  inputMode="decimal"
                  value={editing.cost}
                  onChange={(event) => setEditing({ ...editing, cost: event.target.value })}
                  required
                />
              </Field>
            </div>
            <Field label="Price (RM)">
              <input
                inputMode="decimal"
                value={editing.price}
                onChange={(event) => setEditing({ ...editing, price: event.target.value })}
                required
              />
            </Field>
            <SafetyLabel />
            <p className="hint">This warning is fixed. It shows on every product and cannot be edited.</p>
            {formError ? (
              <p className="form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={busy}>
                {busy ? 'Saving…' : 'Save product'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Confirm
          title={`Delete ${pendingDelete.name}?`}
          body="Past orders keep the toy name. Stock cannot go back onto a deleted toy."
          confirmLabel="Delete product"
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
