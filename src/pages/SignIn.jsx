import { useState } from 'react'
import { signIn, signUp } from '../lib/api'
import { usePageTitle } from '../usePageTitle'

export function SignIn() {
  usePageTitle('Sign in')
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'in') {
        await signIn(email.trim(), password)
      } else {
        const result = await signUp(email.trim(), password)
        if (result.needsConfirmation) {
          setNotice('Check your email to confirm the account, then sign in.')
          setMode('in')
        }
      }
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sign-in">
      <form className="sign-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>Sqiushy</strong>
            <span>Shop desk</span>
          </div>
        </div>
        <h1>{mode === 'in' ? 'Sign in' : 'Create an account'}</h1>
        <p className="lede">
          Novelty squishy toys. Use the email and password for your Supabase project.
        </p>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="notice">{notice}</p> : null}
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError('')
            setNotice('')
          }}
        >
          {mode === 'in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
