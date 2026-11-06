import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { SafetyLabel } from '../components/SafetyLabel'
import { StatusBadge } from '../components/Field'
import { useShop } from '../context/ShopContext'
import { FULFILMENT_LABELS, PAYMENT_LABELS } from '../lib/constants'
import { formatDate, formatMonth, labelFlavour, shortId } from '../lib/format'
import { centsToAmount, formatRM } from '../lib/money'
import {
  bestSellingFlavours,
  lowStockProducts,
  monthSales,
  recentMonthKeys,
  salesByMonth,
  unpaidOrders,
} from '../lib/metrics'
import { orderTotalCents } from '../lib/shop'

function moneyFromCents(cents) {
  return formatRM(centsToAmount(cents))
}

export function Dashboard() {
  const { products, orders } = useShop()
  const monthKeys = recentMonthKeys(new Date())
  const currentMonth = monthKeys[monthKeys.length - 1]
  const thisMonth = monthSales(orders, currentMonth)
  const months = salesByMonth(orders, monthKeys)
  const flavours = bestSellingFlavours(orders)
  const lowStock = lowStockProducts(products)
  const unpaid = unpaidOrders(orders)
  const maxMonth = Math.max(...months.map((month) => month.totalCents), 1)
  const maxFlavour = Math.max(...flavours.map((flavour) => flavour.quantity), 1)
  const recent = orders.slice(0, 6)

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        lede="Paid sales leave out cancelled and refunded orders. Stock still drops when an unpaid order is created."
      />
      <SafetyLabel />
      <section className="stats" aria-label="Shop summary">
        <article className="stat">
          <span>Paid this month</span>
          <strong>{moneyFromCents(thisMonth.totalCents)}</strong>
        </article>
        <article className="stat">
          <span>Paid orders this month</span>
          <strong>{thisMonth.orders}</strong>
        </article>
        <article className="stat">
          <span>Low stock</span>
          <strong>{lowStock.length}</strong>
          <Link to="/products?stock=low">5 or fewer left</Link>
        </article>
        <article className="stat">
          <span>Unpaid orders</span>
          <strong>{unpaid.length}</strong>
          <Link to="/orders?payment=unpaid">Still to collect</Link>
        </article>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Best-selling flavours</h2>
          <p className="hint">Counted from paid orders that were not cancelled.</p>
          {flavours.length === 0 ? (
            <p className="empty">No paid orders yet.</p>
          ) : (
            <div className="flavour-list">
              {flavours.map((flavour) => (
                <div className="flavour-row" key={flavour.flavour}>
                  <span>{labelFlavour(flavour.flavour)}</span>
                  <div className="flavour-track" aria-hidden="true">
                    <div
                      className="flavour-fill"
                      style={{ width: `${(flavour.quantity / maxFlavour) * 100}%` }}
                    />
                  </div>
                  <strong>
                    {flavour.quantity} sold
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Low stock</h2>
          <p className="hint">Toys with 5 or fewer left.</p>
          {lowStock.length === 0 ? (
            <p className="empty">No toys are at or below 5 in stock.</p>
          ) : (
            <ul className="plain-list">
              {lowStock.map((product) => (
                <li key={product.id}>
                  <div className="low-stock-copy">
                    <Link to="/products?stock=low">{product.name}</Link>
                    <span>{product.stockCount <= 0 ? 'Out of stock' : `${product.stockCount} left`}</span>
                  </div>
                  <SafetyLabel />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Sales by month</h2>
        <p className="hint">Malaysia time. Each bar is the paid total for that month.</p>
        <div className="bars-scroll">
          <div className="bars" role="img" aria-label="Paid sales for the last six months">
            {months.map((month) => (
              <div className="bar-col" key={month.month}>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${(month.totalCents / maxMonth) * 100}%` }}
                  />
                </div>
                <div className="bar-label">{formatMonth(month.month)}</div>
                <div className="bar-value">{moneyFromCents(month.totalCents)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Recent orders</h2>
        {recent.length === 0 ? (
          <p className="empty">
            No orders yet. <Link to="/orders/new">Create an order</Link>
          </p>
        ) : (
          <div className="record-list">
            {recent.map((order) => (
              <article className="record record-5" key={order.id}>
                <div>
                  <Link to={`/orders/${order.id}`}>{formatDate(order.createdAt)}</Link>
                  <div className="muted">
                    {order.customerName} · {shortId(order.id)}
                  </div>
                </div>
                <div>{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}</div>
                <strong>{moneyFromCents(orderTotalCents(order.items))}</strong>
                <StatusBadge kind={order.paymentStatus} label={PAYMENT_LABELS[order.paymentStatus]} />
                <StatusBadge kind={order.fulfilmentStatus} label={FULFILMENT_LABELS[order.fulfilmentStatus]} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
