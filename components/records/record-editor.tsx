'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { AppointmentForm } from '@/components/records/appointment-form'
import { ClientForm } from '@/components/records/client-form'
import { Field } from '@/components/records/field'
import { cardClass, inputClass } from '@/components/raft/form-styles'
import { ErrorState, LoadingState, Notice, PageHeader } from '@/components/raft/status'
import { formatDateTime, personName, sortName } from '@/lib/raft/format'
import { byId, combine, useAppointments, useClients, usePeople, useScheduledFor } from '@/lib/raft/hooks'
import { cn } from '@/lib/utils'

type RecordType = 'client' | 'appointment'

export function RecordEditor() {
  const { permissions } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const appointmentParam = Number(params.get('appointment')) || null
  const clientParam = Number(params.get('client')) || null
  const newFor = Number(params.get('newFor')) || null
  const requestedType: RecordType =
    params.get('type') === 'appointment' || appointmentParam || newFor ? 'appointment' : 'client'
  const type: RecordType = permissions.editClients ? requestedType : 'appointment'

  const people = usePeople()
  const clients = useClients()
  const appointments = useAppointments()
  const scheduled = useScheduledFor()
  const { error, ready } = combine(people, clients, appointments, scheduled)

  const clientOptions = useMemo(() => {
    const peopleById = byId(people.data, 'personid')
    return (clients.data ?? [])
      .map((c) => ({ id: c.clientid, person: peopleById.get(c.clientid) }))
      .sort((a, b) => sortName(a.person).localeCompare(sortName(b.person)))
      .map(({ id, person }) => ({ id, label: `${personName(person, id)} (#${id})` }))
  }, [people.data, clients.data])

  const appointmentOptions = useMemo(() => {
    const peopleById = byId(people.data, 'personid')
    return [...(appointments.data ?? [])]
      .sort((a, b) => (b.appointmenttime ?? '').localeCompare(a.appointmenttime ?? ''))
      .map((a) => {
        const names = (scheduled.data ?? [])
          .filter((s) => s.appointmentid === a.appointmentid)
          .map((s) => personName(peopleById.get(s.clientid), s.clientid))
        return {
          id: a.appointmentid,
          label: `#${a.appointmentid} · ${formatDateTime(a.appointmenttime)}${names.length ? ` · ${names.join(', ')}` : ''}`,
        }
      })
  }, [people.data, appointments.data, scheduled.data])

  function go(next: Record<string, string | number | null>) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) if (value != null && value !== '') search.set(key, String(value))
    const qs = search.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const selectedId = type === 'client' ? clientParam : appointmentParam
  const exists =
    selectedId == null ||
    (type === 'client' ? clientOptions.some((o) => o.id === selectedId) : appointmentOptions.some((o) => o.id === selectedId))
  const canCreate = type === 'client' ? permissions.editClients : permissions.addAppointments

  return (
    <div>
      <PageHeader
        title="Add or edit a record"
        description={
          permissions.editClients
            ? 'Add a new client or appointment, or pick an existing one to change it.'
            : 'As a counselor you can update session notes, assignments and attendance on existing appointments.'
        }
      />

      {permissions.editClients && (
        <div role="tablist" aria-label="Record type" className="mb-6 inline-flex rounded-lg border bg-card p-1">
          {(['client', 'appointment'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => go({ type: t })}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                type === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState error={error} />
      ) : !ready ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-6">
          <div className={cn(cardClass, 'p-5')}>
            <Field
              id="record-picker"
              label={type === 'client' ? 'Client to edit' : 'Appointment to edit'}
              hint={canCreate ? 'Choose “New” to add a record instead.' : undefined}
            >
              <select
                id="record-picker"
                className={inputClass}
                value={selectedId ?? ''}
                onChange={(e) =>
                  go(type === 'client' ? { type, client: e.target.value } : { type, appointment: e.target.value })
                }
              >
                <option value="">
                  {canCreate ? (type === 'client' ? 'New client' : 'New appointment') : 'Select an appointment'}
                </option>
                {(type === 'client' ? clientOptions : appointmentOptions).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {!exists ? (
            <Notice tone="error">No {type} with ID #{selectedId} was found.</Notice>
          ) : type === 'client' ? (
            <ClientForm
              key={clientParam ?? 'new'}
              clientId={clientParam}
              onSaved={(id) => go({ type: 'client', client: id })}
            />
          ) : selectedId == null && !canCreate ? (
            <Notice tone="info">Select an appointment above to update its notes, assignments or attendance.</Notice>
          ) : (
            <AppointmentForm
              key={`${appointmentParam ?? 'new'}-${newFor ?? ''}`}
              appointmentId={appointmentParam}
              presetClientId={newFor}
              onSaved={(id) => go({ type: 'appointment', appointment: id })}
            />
          )}
        </div>
      )}
    </div>
  )
}
