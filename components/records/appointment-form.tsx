'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Field, Fieldset } from '@/components/records/field'
import { cardClass, inputClass, textareaClass } from '@/components/raft/form-styles'
import { ErrorState, LoadingState, Notice } from '@/components/raft/status'
import { Button } from '@/components/ui/button'
import { clean, emptyToNull, formatDateTime, personName, sortName, toDateTimeInput } from '@/lib/raft/format'
import {
  byId,
  combine,
  useAppointments,
  useClients,
  useCounselors,
  useEmployees,
  usePeople,
  useRefresh,
  useRooms,
  useScheduledFor,
} from '@/lib/raft/hooks'
import type { ScheduledFor } from '@/lib/raft/types'
import { supabase } from '@/lib/supabase'

type Props = { appointmentId: number | null; presetClientId: number | null; onSaved: (id: number) => void }

type Attendee = { clientid: number; kept: string; assignment: string; isNew: boolean }

const keptToInput = (kept: boolean | null | undefined) => (kept === true ? 'true' : kept === false ? 'false' : '')
const inputToKept = (value: string) => (value === 'true' ? true : value === 'false' ? false : null)

export function AppointmentForm(props: Props) {
  const people = usePeople()
  const clients = useClients()
  const counselors = useCounselors()
  const employees = useEmployees()
  const rooms = useRooms()
  const appointments = useAppointments()
  const scheduled = useScheduledFor()
  const { error, ready } = combine(people, clients, counselors, employees, rooms, appointments, scheduled)

  if (error) return <ErrorState error={error} />
  if (!ready) return <LoadingState />
  return <AppointmentFormInner {...props} />
}

function AppointmentFormInner({ appointmentId, presetClientId, onSaved }: Props) {
  const { permissions } = useAuth()
  const refresh = useRefresh()
  const people = usePeople().data!
  const clients = useClients().data!
  const counselors = useCounselors().data!
  const employees = useEmployees().data!
  const rooms = useRooms().data!
  const appointments = useAppointments().data!
  const scheduled = useScheduledFor().data!

  const peopleById = useMemo(() => byId(people, 'personid'), [people])
  const existing = appointmentId != null ? appointments.find((a) => a.appointmentid === appointmentId) : undefined
  const existingRows = useMemo(
    () => scheduled.filter((s) => s.appointmentid === appointmentId),
    [scheduled, appointmentId],
  )
  const isNew = appointmentId == null
  const canEditDetails = isNew ? permissions.addAppointments : permissions.editAppointmentDetails

  const [time, setTime] = useState(toDateTimeInput(existing?.appointmenttime))
  const [duration, setDuration] = useState(existing?.duration != null ? String(existing.duration) : '50')
  const [counselorId, setCounselorId] = useState(existing ? String(existing.counselorid) : '')
  const [employeeId, setEmployeeId] = useState(existing ? String(existing.employeeid) : '')
  const [roomNumber, setRoomNumber] = useState(existing ? String(existing.roomnumber) : '')
  const [notes, setNotes] = useState(clean(existing?.notes))
  const [attendees, setAttendees] = useState<Attendee[]>(() =>
    isNew
      ? presetClientId != null
        ? [{ clientid: presetClientId, kept: '', assignment: '', isNew: true }]
        : []
      : existingRows.map((s) => ({
          clientid: s.clientid,
          kept: keptToInput(s.kept),
          assignment: clean(s.assignment),
          isNew: false,
        })),
  )
  const [clientToAdd, setClientToAdd] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const nameOf = (id: number) => personName(peopleById.get(id), id)
  const sortedBy = <T,>(rows: T[], idOf: (row: T) => number) =>
    [...rows].sort((a, b) => sortName(peopleById.get(idOf(a))).localeCompare(sortName(peopleById.get(idOf(b)))))

  const availableClients = sortedBy(
    clients.filter((c) => !attendees.some((a) => a.clientid === c.clientid)),
    (c) => c.clientid,
  )

  function updateAttendee(clientid: number, patch: Partial<Attendee>) {
    setAttendees((prev) => prev.map((a) => (a.clientid === clientid ? { ...a, ...patch } : a)))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(null)

    try {
      const detailValues = {
        appointmenttime: time ? `${time}:00` : null,
        duration: duration ? Number(duration) : null,
        counselorid: Number(counselorId),
        employeeid: Number(employeeId),
        roomnumber: Number(roomNumber),
      }
      let id = appointmentId

      if (id == null) {
        const values = permissions.editNotes ? { ...detailValues, notes: emptyToNull(notes) } : detailValues
        const inserted = await supabase.from('appointment').insert(values).select('appointmentid').single()
        if (inserted.error) throw inserted.error
        id = (inserted.data as { appointmentid: number }).appointmentid
      } else {
        const values: Record<string, unknown> = {}
        if (canEditDetails) Object.assign(values, detailValues)
        if (permissions.editNotes && emptyToNull(notes) !== emptyToNull(existing?.notes ?? '')) {
          values.notes = emptyToNull(notes)
        }
        if (Object.keys(values).length > 0) {
          const updated = await supabase
            .from('appointment')
            .update(values, { count: 'exact' })
            .eq('appointmentid', id)
          if (updated.error) throw updated.error
          if (updated.count === 0) throw new Error('The database did not update this appointment.')
        }
      }

      const original = new Map<number, ScheduledFor>(existingRows.map((s) => [s.clientid, s]))
      for (const a of attendees) {
        const kept = inputToKept(a.kept)
        const assignment = emptyToNull(a.assignment)
        if (a.isNew) {
          const row: Record<string, unknown> = { appointmentid: id, clientid: a.clientid, kept }
          if (permissions.editAssignment) row.assignment = assignment
          const inserted = await supabase.from('scheduledfor').insert(row)
          if (inserted.error) throw inserted.error
          continue
        }
        const before = original.get(a.clientid)
        const values: Record<string, unknown> = {}
        if (permissions.editKept && kept !== (before?.kept ?? null)) values.kept = kept
        if (permissions.editAssignment && assignment !== emptyToNull(before?.assignment ?? '')) {
          values.assignment = assignment
        }
        if (Object.keys(values).length === 0) continue
        const updated = await supabase
          .from('scheduledfor')
          .update(values, { count: 'exact' })
          .eq('appointmentid', id)
          .eq('clientid', a.clientid)
        if (updated.error) throw updated.error
        if (updated.count === 0) throw new Error(`The database did not update the booking for ${nameOf(a.clientid)}.`)
      }

      await refresh('appointment', 'scheduledfor')
      setResult({ tone: 'success', text: isNew ? `Appointment #${id} was added.` : 'Changes saved.' })
      if (isNew) onSaved(id)
      else setAttendees((prev) => prev.map((a) => ({ ...a, isNew: false })))
    } catch (err) {
      setResult({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong while saving.' })
    } finally {
      setPending(false)
    }
  }

  const room = existing ? rooms.find((r) => r.roomnumber === existing.roomnumber) : undefined

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} flex flex-col gap-6 p-5`}>
      <h2 className="text-lg font-semibold">{isNew ? 'New appointment' : `Appointment #${appointmentId}`}</h2>

      {canEditDetails ? (
        <Fieldset legend="Appointment details">
          <Field id="appt-time" label="Date and time">
            <input
              id="appt-time"
              type="datetime-local"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="appt-duration" label="Duration (minutes)">
            <input
              id="appt-duration"
              type="number"
              min={1}
              max={600}
              step={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="appt-counselor" label="Counselor">
            <select
              id="appt-counselor"
              required
              value={counselorId}
              onChange={(e) => setCounselorId(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Choose a counselor
              </option>
              {sortedBy(counselors, (c) => c.counselorid).map((c) => (
                <option key={c.counselorid} value={c.counselorid}>
                  {nameOf(c.counselorid)}
                  {clean(c.degreesuffix) ? `, ${clean(c.degreesuffix)}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field id="appt-room" label="Room">
            <select
              id="appt-room"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Choose a room
              </option>
              {rooms.map((r) => (
                <option key={r.roomnumber} value={r.roomnumber}>
                  {clean(r.roomname) || `Room ${r.roomnumber}`} (#{r.roomnumber})
                </option>
              ))}
            </select>
          </Field>
          <Field id="appt-employee" label="Booked by (employee)" className="sm:col-span-2">
            <select
              id="appt-employee"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Choose an employee
              </option>
              {sortedBy(employees, (e) => e.employeeid).map((e) => (
                <option key={e.employeeid} value={e.employeeid}>
                  {nameOf(e.employeeid)} (#{e.employeeid})
                </option>
              ))}
            </select>
          </Field>
        </Fieldset>
      ) : (
        existing && (
          <dl className="grid gap-4 rounded-lg bg-muted p-4 text-sm sm:grid-cols-4">
            <Summary label="When" value={formatDateTime(existing.appointmenttime)} />
            <Summary label="Duration" value={existing.duration ? `${existing.duration} min` : 'Not recorded'} />
            <Summary label="Counselor" value={nameOf(existing.counselorid)} />
            <Summary label="Room" value={clean(room?.roomname) || `Room ${existing.roomnumber}`} />
          </dl>
        )
      )}

      {permissions.seeNotes && (
        <Field
          id="appt-notes"
          label="Session notes"
          hint={permissions.editNotes ? `${notes.length} / 3000 characters` : 'You can read but not change notes.'}
        >
          <textarea
            id="appt-notes"
            maxLength={3000}
            rows={5}
            readOnly={!permissions.editNotes}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={textareaClass}
          />
        </Field>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-muted-foreground uppercase">Clients</legend>
        {attendees.length === 0 && <p className="text-sm text-muted-foreground">No clients are scheduled yet.</p>}
        <ul className="flex flex-col gap-3">
          {attendees.map((a) => (
            <li key={a.clientid} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_12rem]">
              <p className="font-medium sm:col-span-2">
                {nameOf(a.clientid)} <span className="font-normal text-muted-foreground">#{a.clientid}</span>
                {a.isNew && (
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    Will be added
                  </span>
                )}
              </p>
              {permissions.seeAssignment && (
                <Field id={`assign-${a.clientid}`} label="Assignment">
                  <textarea
                    id={`assign-${a.clientid}`}
                    maxLength={2000}
                    rows={2}
                    readOnly={!permissions.editAssignment}
                    value={a.assignment}
                    onChange={(e) => updateAttendee(a.clientid, { assignment: e.target.value })}
                    className={`${textareaClass} min-h-16`}
                  />
                </Field>
              )}
              <Field
                id={`kept-${a.clientid}`}
                label="Attendance"
                className={permissions.seeAssignment ? undefined : 'sm:col-span-2 sm:max-w-48'}
              >
                <select
                  id={`kept-${a.clientid}`}
                  disabled={!permissions.editKept}
                  value={a.kept}
                  onChange={(e) => updateAttendee(a.clientid, { kept: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Not recorded</option>
                  <option value="true">Kept</option>
                  <option value="false">Missed</option>
                </select>
              </Field>
            </li>
          ))}
        </ul>

        {permissions.scheduleClients && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field id="add-client" label="Add a client to this appointment" className="flex-1">
              <select
                id="add-client"
                value={clientToAdd}
                onChange={(e) => setClientToAdd(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a client</option>
                {availableClients.map((c) => (
                  <option key={c.clientid} value={c.clientid}>
                    {nameOf(c.clientid)} (#{c.clientid})
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              disabled={!clientToAdd}
              onClick={() => {
                setAttendees((prev) => [...prev, { clientid: Number(clientToAdd), kept: '', assignment: '', isNew: true }])
                setClientToAdd('')
              }}
            >
              Add client
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Records cannot be deleted, so saved clients stay on the appointment.</p>
      </fieldset>

      {result && <Notice tone={result.tone}>{result.text}</Notice>}

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? 'Saving…' : isNew ? 'Add appointment' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
