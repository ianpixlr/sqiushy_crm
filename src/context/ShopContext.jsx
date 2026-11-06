import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { demoMode } from '../lib/api'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [booting, setBooting] = useState(true)
  const [email, setEmail] = useState('')

  const reload = useCallback(async () => {
    const next = await api.loadAll()
    setData(next)
    setLoadError('')
    return next
  }, [])

  useEffect(() => {
    let alive = true
    reload()
      .catch((error) => {
        if (alive) setLoadError(error.message || 'Could not load the shop.')
      })
      .finally(() => {
        if (alive) setBooting(false)
      })
    return () => {
      alive = false
    }
  }, [reload])

  useEffect(() => {
    if (demoMode) return undefined
    let alive = true
    api.currentSession().then((session) => {
      if (alive) setEmail(session?.user?.email || '')
    })
    return () => {
      alive = false
    }
  }, [])

  const mutate = useCallback(
    async (work) => {
      const result = await work()
      try {
        await reload()
      } catch (error) {
        setLoadError(error.message || 'The shop saved, but the list could not refresh.')
      }
      return result
    },
    [reload],
  )

  const value = useMemo(
    () => ({
      ready: Boolean(data),
      booting,
      loadError,
      products: data?.products ?? [],
      customers: data?.customers ?? [],
      orders: data?.orders ?? [],
      demoMode,
      email,
      refresh: reload,
      resetDemo: () => mutate(() => api.resetDemo()),
      saveProduct: (input) => mutate(() => api.saveProduct(input)),
      deleteProduct: (id) => mutate(() => api.deleteProduct(id)),
      saveCustomer: (input) => mutate(() => api.saveCustomer(input)),
      deleteCustomer: (id) => mutate(() => api.deleteCustomer(id)),
      createOrder: (input) => mutate(() => api.createOrder(input)),
      updateOrderStatus: (id, patch) => mutate(() => api.updateOrderStatus(id, patch)),
      deleteOrder: (id) => mutate(() => api.deleteOrder(id)),
      signOut: () => api.signOut(),
    }),
    [booting, data, email, loadError, mutate, reload],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error('The shop desk is not ready.')
  return value
}
