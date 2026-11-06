import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Confirm } from './Modal'
import { useShop } from '../context/ShopContext'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/products', label: 'Products' },
  { to: '/customers', label: 'Customers' },
  { to: '/orders', label: 'Orders' },
]

export function Layout() {
  const shop = useShop()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  async function resetDemo() {
    setResetting(true)
    setResetError('')
    try {
      await shop.resetDemo()
      setConfirmReset(false)
    } catch (error) {
      setResetError(error.message || 'Could not reset the sample shop.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>Sqiushy</strong>
            <span>Novelty toys</span>
          </div>
        </div>
        <nav className="nav" aria-label="Shop sections">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="aside-foot">
          {shop.demoMode ? (
            <p>Saved in this browser.</p>
          ) : (
            <>
              <p>{shop.email || 'Signed in'}</p>
              <button type="button" className="button secondary" onClick={() => shop.signOut()}>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>
      <div className="main-wrap">
        <main id="content" className="main">
          {shop.demoMode ? (
            <div className="demo-banner">
              <p>
                <strong>Demo mode.</strong> Changes stay in this browser until you connect Supabase. Sample
                records are marked Sample.
              </p>
              <button type="button" className="button secondary" onClick={() => setConfirmReset(true)}>
                Reset sample data
              </button>
            </div>
          ) : null}
          {resetError ? (
            <p className="form-error" role="alert">
              {resetError}
            </p>
          ) : null}
          {shop.loadError ? (
            <p className="form-error" role="alert">
              {shop.loadError}{' '}
              <button type="button" className="text-button" onClick={() => shop.refresh()}>
                Try again
              </button>
            </p>
          ) : null}
          {shop.ready ? <Outlet /> : shop.booting ? <p className="boot">Loading the shop…</p> : null}
        </main>
      </div>
      {confirmReset ? (
        <Confirm
          title="Reset sample data?"
          body="This replaces everything in this browser with the original sample shop."
          confirmLabel="Reset sample data"
          danger
          busy={resetting}
          onConfirm={resetDemo}
          onClose={() => setConfirmReset(false)}
        />
      ) : null}
    </div>
  )
}
