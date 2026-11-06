import { useEffect, useState } from 'react'
import { currentSession, watchAuth } from '../lib/api'
import { SignIn } from '../pages/SignIn'

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [failed, setFailed] = useState('')

  useEffect(() => {
    let alive = true
    currentSession()
      .then((next) => {
        if (alive) setSession(next)
      })
      .catch((error) => {
        if (alive) setFailed(error.message || 'Could not check sign-in.')
      })
    let unsubscribe = () => {}
    watchAuth(() => {
      currentSession()
        .then((next) => {
          if (alive) setSession(next)
        })
        .catch(() => {})
    }).then((stop) => {
      unsubscribe = stop
      if (!alive) stop()
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  if (failed) {
    return (
      <p className="boot" role="alert">
        {failed}
      </p>
    )
  }
  if (session === undefined) return <p className="boot">Checking sign-in…</p>
  if (!session) return <SignIn />
  return children
}
