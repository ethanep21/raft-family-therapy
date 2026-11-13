'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ClientDetail } from '@/components/lookup/client-detail'
import { cardClass, inputClass } from '@/components/raft/form-styles'
import { ErrorState, LoadingState, PageHeader } from '@/components/raft/status'
import { clean, personName, sortName } from '@/lib/raft/format'
import { byId, combine, useClients, usePeople } from '@/lib/raft/hooks'
import { cn } from '@/lib/utils'

export function ClientLookup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = Number(searchParams.get('client')) || null
  const [query, setQuery] = useState('')

  const clients = useClients()
  const people = usePeople()
  const { error, ready } = combine(clients, people)

  const rows = useMemo(() => {
    const peopleById = byId(people.data, 'personid')
    return (clients.data ?? [])
      .map((c) => ({ client: c, person: peopleById.get(c.clientid) }))
      .sort((a, b) => sortName(a.person).localeCompare(sortName(b.person)))
  }, [clients.data, people.data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const digits = q.replace(/\D/g, '')
    return rows.filter(({ client, person }) => {
      const text = [personName(person), clean(person?.email), String(client.clientid)].join(' ').toLowerCase()
      const phone = clean(person?.phone).replace(/\D/g, '')
      return text.includes(q) || (digits.length >= 3 && phone.includes(digits))
    })
  }, [rows, query])

  function select(id: number) {
    router.replace(`/lookup?client=${id}`, { scroll: false })
  }

  return (
    <div>
      <PageHeader
        title="Client lookup"
        description="Search by name, email, phone number or client ID, then pick a client to see their details."
      />
      {error ? (
        <ErrorState error={error} />
      ) : !ready ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <section aria-label="Find a client" className={cn(cardClass, 'flex flex-col self-start lg:sticky lg:top-6')}>
            <div className="border-b p-3">
              <label htmlFor="client-search" className="sr-only">
                Search clients
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="client-search"
                  type="search"
                  placeholder="Search clients"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={cn(inputClass, 'pl-9')}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {filtered.length} of {rows.length} clients
              </p>
            </div>
            <ul className="max-h-[60svh] overflow-y-auto p-1">
              {filtered.map(({ client, person }) => {
                const active = client.clientid === selectedId
                return (
                  <li key={client.clientid}>
                    <button
                      type="button"
                      onClick={() => select(client.clientid)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      <span className="font-medium">{personName(person, client.clientid)}</span>
                      <span className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {clean(person?.phone) || clean(person?.email) || `Client #${client.clientid}`}
                      </span>
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">No clients match that search.</li>
              )}
            </ul>
          </section>

          {selectedId ? (
            <ClientDetail clientId={selectedId} onSelectClient={select} />
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select a client from the list to see their contact information, appointments and families.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
