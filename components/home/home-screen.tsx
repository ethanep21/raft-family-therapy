'use client'

import Link from 'next/link'
import { BarChart3, PencilLine, Search } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { TodayAppointments } from '@/components/home/today-appointments'
import { ROLE_LABELS } from '@/lib/raft/roles'

export function HomeScreen() {
  const { role, permissions } = useAuth()

  const destinations = [
    {
      href: '/lookup',
      title: 'Client lookup',
      description: 'Find a client and see their contact details, appointments and families.',
      icon: Search,
    },
    {
      href: '/dashboard',
      title: 'Dashboard',
      description: 'Key numbers about RAFT, calculated live from the database.',
      icon: BarChart3,
    },
    {
      href: '/records',
      title: 'Add or edit a record',
      description: permissions.editClients
        ? 'Add a new client or appointment, or change an existing one.'
        : 'Update session notes, assignments and attendance on an appointment.',
      icon: PencilLine,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Richmond Area Family Therapy</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">Welcome to the front desk</h1>
        <p className="mt-2 text-muted-foreground">
          You are signed in with the <strong className="font-medium text-foreground">{ROLE_LABELS[role]}</strong>{' '}
          role. Choose where you want to go.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {destinations.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold group-hover:text-primary">{title}</span>
              <span className="text-sm text-muted-foreground">{description}</span>
            </Link>
          </li>
        ))}
      </ul>

      <TodayAppointments />
    </div>
  )
}
