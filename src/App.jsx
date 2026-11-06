import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'
import { Layout } from './components/Layout'
import { PageHeader } from './components/PageHeader'
import { ShopProvider } from './context/ShopContext'
import { demoMode } from './lib/api'
import { routerBasename } from './lib/basename'
import { Customers } from './pages/Customers'
import { Dashboard } from './pages/Dashboard'
import { OrderForm } from './pages/OrderForm'
import { Orders } from './pages/Orders'
import { Products } from './pages/Products'

function NotFound() {
  return <PageHeader title="Page not found" lede="That page is not part of the shop desk." />
}

function ShopRoutes() {
  return (
    <ShopProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:orderId" element={<Orders />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ShopProvider>
  )
}

export default function App() {
  const routes = <ShopRoutes />
  return (
    <BrowserRouter basename={routerBasename()}>
      {demoMode ? routes : <AuthGate>{routes}</AuthGate>}
    </BrowserRouter>
  )
}
