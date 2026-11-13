'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ErrorState, LoadingState } from '@/components/raft/status'
import { cardClass } from '@/components/raft/form-styles'
import { formatTime, parseTimestamp, personName, sameDay } from '@/lib/raft/format'
import { byId, combine, useAppointments, usePeople, useRooms, useScheduledFor } from '@/lib/raft/hooks'

export function TodayAppointments() {
  const appointments = useAppointments()
  const scheduled = useScheduledFor()
  const people = usePeople()
  const rooms = useRooms()
  const { error, ready } = combine(appointments, scheduled, people, rooms)

  const today = useMemo(() => {
    if (!ready) return []
    const now = new Date()
    const peopleById = byId(people.data, 'personid')
    const roomsById = byId(rooms.data, 'roomnumber')
    return (appointments.data ?? [])
      .filter((a) => {
        const d = parseTimestamp(a.appointmenttime)
        return d && sameDay(d, now)
      })
      .map((a) => ({
        ...a,
        counselor: personName(peopleById.get(a.counselorid), a.counselorid),
        room: roomsById.get(a.roomnumber)?.roomname?.trim() || `Room ${a.roomnumber}`,
        clients: (scheduled.data ?? [])
          .filter((s) => s.appointmentid === a.appointmentid)
          .map((s) => ({ id: s.clientid, name: personName(peopleById.get(s.clientid), s.clientid) })),
      }))
  }, [ready, appointments.data, scheduled.data, people.data, rooms.data])

  return (
    <section aria-labelledby="today-heading" className={cardClass}>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 id="today-heading" className="font-semibold">
          {"Today's appointments"}
        </h2>
        <span className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date())}
        </span>
      </div>
      <div className="p-5">
        {error ? (
          <ErrorState error={error} />
        ) : !ready ? (
          <LoadingState />
        ) : today.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointments are scheduled for today.</p>
        ) : (
          <ul className="divide-y">
            {today.map((a) => (
              <li key={a.appointmentid} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                <span className="w-20 font-medium tabular-nums">{formatTime(a.appointmenttime)}</span>
                <span className="flex-1 text-sm">
                  {a.clients.length === 0
                    ? 'No clients scheduled'
                    : a.clients.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && ', '}
                          <Link href={`/lookup?client=${c.id}`} className="font-medium hover:text-primary hover:underline">
                            {c.name}
                          </Link>
                        </span>
                      ))}
                </span>
                <span className="text-sm text-muted-foreground">
                  {a.counselor} · {a.room}
                  {a.duration ? ` · ${a.duration} min` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
