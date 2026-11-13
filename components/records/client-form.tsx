'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Field, Fieldset } from '@/components/records/field'
import { cardClass, inputClass } from '@/components/raft/form-styles'
import { Notice } from '@/components/raft/status'
import { Button } from '@/components/ui/button'
import { clean, emptyToNull, personName, sortName } from '@/lib/raft/format'
import { byId, useClients, usePeople, useRefresh } from '@/lib/raft/hooks'
import { supabase } from '@/lib/supabase'

type Props = { clientId: number | null; onSaved: (id: number) => void }

const PERSON_FIELDS = [
  { key: 'firstname', label: 'First name', max: 50, autoComplete: 'off' },
  { key: 'lastname', label: 'Last name', max: 50, autoComplete: 'off' },
  { key: 'phone', label: 'Phone', max: 14, autoComplete: 'off', type: 'tel' },
  { key: 'email', label: 'Email', max: 100, autoComplete: 'off', type: 'email' },
  { key: 'address', label: 'Street address', max: 50, autoComplete: 'off', wide: true },
  { key: 'city', label: 'City', max: 50, autoComplete: 'off' },
  { key: 'state', label: 'State', max: 2, autoComplete: 'off', hint: 'Two letters, e.g. VA' },
  { key: 'zip', label: 'ZIP', max: 10, autoComplete: 'off' },
] as const

type PersonKey = (typeof PERSON_FIELDS)[number]['key']

export function ClientForm({ clientId, onSaved }: Props) {
  const people = usePeople()
  const clients = useClients()
  const refresh = useRefresh()
  const peopleById = useMemo(() => byId(people.data, 'personid'), [people.data])
  const existingPerson = clientId != null ? peopleById.get(clientId) : undefined
  const existingClient = clientId != null ? clients.data?.find((c) => c.clientid === clientId) : undefined

  const [person, setPerson] = useState<Record<PersonKey, string>>(() => {
    const values = {} as Record<PersonKey, string>
    for (const f of PERSON_FIELDS) values[f.key] = clean(existingPerson?.[f.key])
    return values
  })
  const [foundOut, setFoundOut] = useState(clean(existingClient?.foundout))
  const [reminder, setReminder] = useState(clean(existingClient?.remindermethod))
  const [referredBy, setReferredBy] = useState(existingClient?.referredby != null ? String(existingClient.referredby) : '')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const foundOutOptions = useMemo(
    () => [...new Set((clients.data ?? []).map((c) => clean(c.foundout)).filter(Boolean))].sort(),
    [clients.data],
  )
  const reminderOptions = useMemo(
    () => [...new Set((clients.data ?? []).map((c) => clean(c.remindermethod)).filter(Boolean))].sort(),
    [clients.data],
  )
  const referrerOptions = useMemo(
    () =>
      (clients.data ?? [])
        .filter((c) => c.clientid !== clientId)
        .map((c) => ({ id: c.clientid, person: peopleById.get(c.clientid) }))
        .sort((a, b) => sortName(a.person).localeCompare(sortName(b.person))),
    [clients.data, clientId, peopleById],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(null)

    const personValues: Record<string, string | null> = {}
    for (const f of PERSON_FIELDS) personValues[f.key] = emptyToNull(person[f.key])
    if (personValues.state) personValues.state = personValues.state.toUpperCase()
    const clientValues = {
      foundout: emptyToNull(foundOut),
      remindermethod: emptyToNull(reminder),
      referredby: referredBy ? Number(referredBy) : null,
    }

    try {
      let id = clientId
      if (id == null) {
        const inserted = await supabase.from('person').insert(personValues).select('personid').single()
        if (inserted.error) throw inserted.error
        id = (inserted.data as { personid: number }).personid
        const client = await supabase.from('client').insert({ clientid: id, ...clientValues })
        if (client.error) throw client.error
      } else {
        const p = await supabase.from('person').update(personValues, { count: 'exact' }).eq('personid', id)
        if (p.error) throw p.error
        if (p.count === 0) throw new Error('The database did not update this person. You may not have permission.')
        const c = await supabase.from('client').update(clientValues, { count: 'exact' }).eq('clientid', id)
        if (c.error) throw c.error
        if (c.count === 0) throw new Error('The database did not update this client. You may not have permission.')
      }
      await refresh('person', 'client')
      setResult({ tone: 'success', text: clientId == null ? `Client #${id} was added.` : 'Changes saved.' })
      if (clientId == null) onSaved(id)
    } catch (err) {
      setResult({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong while saving.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} flex flex-col gap-6 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {clientId == null ? 'New client' : `Edit ${personName(existingPerson, clientId)}`}
        </h2>
        {clientId != null && (
          <Link href={`/lookup?client=${clientId}`} className="text-sm font-medium text-primary hover:underline">
            View in client lookup
          </Link>
        )}
      </div>

      <Fieldset legend="Contact information">
        {PERSON_FIELDS.map((f) => (
          <Field
            key={f.key}
            id={`person-${f.key}`}
            label={f.label}
            hint={'hint' in f ? f.hint : undefined}
            className={'wide' in f && f.wide ? 'sm:col-span-2' : undefined}
          >
            <input
              id={`person-${f.key}`}
              type={'type' in f ? f.type : 'text'}
              maxLength={f.max}
              autoComplete={f.autoComplete}
              required={f.key === 'firstname' || f.key === 'lastname'}
              value={person[f.key]}
              onChange={(e) => setPerson((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={inputClass}
            />
          </Field>
        ))}
      </Fieldset>

      <Fieldset legend="Client details">
        <Field id="client-foundout" label="How they found RAFT">
          <input
            id="client-foundout"
            list="foundout-options"
            maxLength={50}
            value={foundOut}
            onChange={(e) => setFoundOut(e.target.value)}
            className={inputClass}
          />
          <datalist id="foundout-options">
            {foundOutOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field id="client-reminder" label="Preferred reminder method">
          <input
            id="client-reminder"
            list="reminder-options"
            maxLength={50}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className={inputClass}
          />
          <datalist id="reminder-options">
            {reminderOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field id="client-referredby" label="Referred by" className="sm:col-span-2">
          <select
            id="client-referredby"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            className={inputClass}
          >
            <option value="">Nobody / not recorded</option>
            {referrerOptions.map(({ id, person: p }) => (
              <option key={id} value={id}>
                {personName(p, id)} (#{id})
              </option>
            ))}
          </select>
        </Field>
      </Fieldset>

      {result && <Notice tone={result.tone}>{result.text}</Notice>}

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? 'Saving…' : clientId == null ? 'Add client' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
