'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { inputClass, labelClass } from '@/components/raft/form-styles'
import { supabase } from '@/lib/supabase'

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setPending(false)
    if (signInError) {
      const invalid =
        signInError.code === 'invalid_credentials' || /invalid login credentials/i.test(signInError.message)
      setError(invalid ? 'That email or password is incorrect. Please try again.' : signInError.message)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium tracking-wide text-primary">RAFT</p>
          <h1 className="mt-1 text-2xl font-semibold text-balance">Richmond Area Family Therapy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Front desk sign in</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-10" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
