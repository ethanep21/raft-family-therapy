'use client'

import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SWRConfig } from 'swr'
import { AppShell } from '@/components/app-shell'
import { SignInScreen } from '@/components/auth/sign-in-screen'
import { Button } from '@/components/ui/button'
import { permissionsFor, roleFromAccessToken, type Permissions, type RaftRole } from '@/lib/raft/roles'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: Session
  role: RaftRole
  permissions: Permissions
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside a signed-in screen')
  return value
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    router.replace('/')
  }, [router])

  const role = useMemo(() => roleFromAccessToken(session?.access_token), [session?.access_token])

  const value = useMemo<AuthContextValue | null>(
    () => (session && role ? { session, role, permissions: permissionsFor(role), signOut } : null),
    [session, role, signOut],
  )

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground" role="status">
        Checking your session…
      </div>
    )
  }

  if (!session) return <SignInScreen />

  if (!value) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">No RAFT staff role</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You signed in as {session.user.email}, but your account does not have a RAFT role (Admin, Scheduler or
            Counselor). Ask an administrator to assign one in Supabase.
          </p>
          <Button className="mt-4" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </main>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      <SWRConfig
        key={session.user.id}
        value={{ provider: () => new Map(), revalidateOnFocus: false, shouldRetryOnError: false }}
      >
        <AppShell>{children}</AppShell>
      </SWRConfig>
    </AuthContext.Provider>
  )
}
