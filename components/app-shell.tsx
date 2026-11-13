'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/lib/raft/roles'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/lookup', label: 'Client lookup' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/records', label: 'Add or edit' },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/\/$/, '') || '/'
  const { session, role, signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-primary">RAFT</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Front desk</span>
          </Link>
          <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors',
                        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium">
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  {ROLE_LABELS[role]}
                </span>
                <span className="ml-2 hidden max-w-48 truncate align-middle text-muted-foreground md:inline-block">
                  {session.user.email}
                </span>
              </p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut data-icon="inline-start" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
