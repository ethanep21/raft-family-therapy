'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { PencilLine } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { cardClass } from '@/components/raft/form-styles'
import { ErrorState, LoadingState } from '@/components/raft/status'
import { buttonVariants } from '@/components/ui/button'
import { clean, formatDate, formatDateTime, keptLabel, parseTimestamp, personName } from '@/lib/raft/format'
import {
  byId,
  combine,
  useAppointments,
  useClients,
  useCounselors,
  useFamilies,
  useFamilyRoles,
  useMemberRoles,
  useMemberships,
  usePeople,
  useRooms,
  useScheduledFor,
} from '@/lib/raft/hooks'

type Props = { clientId: number; onSelectClient: (id: number) => void }

export function ClientDetail({ clientId, onSelectClient }: Props) {
  const { permissions } = useAuth()
  const people = usePeople()
  const clients = useClients()
  const counselors = useCounselors()
  const rooms = useRooms()
  const appointments = useAppointments()
  const scheduled = useScheduledFor()
  const families = useFamilies()
  const memberships = useMemberships()
  const memberRoles = useMemberRoles()
  const familyRoles = useFamilyRoles()
  const { error, ready } = combine(
    people,
    clients,
    counselors,
    rooms,
    appointments,
    scheduled,
    families,
    memberships,
    memberRoles,
    familyRoles,
  )

  const detail = useMemo(() => {
    if (!ready) return null
    const peopleById = byId(people.data, 'personid')
    const client = clients.data!.find((c) => c.clientid === clientId)
    if (!client) return undefined
    const counselorsById = byId(counselors.data, 'counselorid')
    const roomsById = byId(rooms.data, 'roomnumber')
    const appointmentsById = byId(appointments.data, 'appointmentid')
    const familiesById = byId(families.data, 'familyid')
    const roleNames = byId(familyRoles.data, 'roleid')

    const visits = scheduled
      .data!.filter((s) => s.clientid === clientId)
      .map((s) => {
        const appointment = appointmentsById.get(s.appointmentid)
        const counselor = appointment ? counselorsById.get(appointment.counselorid) : undefined
        const suffix = clean(counselor?.degreesuffix)
        return {
          scheduled: s,
          appointment,
          counselorName: appointment
            ? `${personName(peopleById.get(appointment.counselorid), appointment.counselorid)}${suffix ? `, ${suffix}` : ''}`
            : '',
          roomName: appointment
            ? roomsById.get(appointment.roomnumber)?.roomname?.trim() || `Room ${appointment.roomnumber}`
            : '',
          otherClients: scheduled
            .data!.filter((o) => o.appointmentid === s.appointmentid && o.clientid !== clientId)
            .map((o) => ({ id: o.clientid, name: personName(peopleById.get(o.clientid), o.clientid) })),
        }
      })
      .sort(
        (a, b) =>
          (parseTimestamp(b.appointment?.appointmenttime)?.getTime() ?? 0) -
          (parseTimestamp(a.appointment?.appointmenttime)?.getTime() ?? 0),
      )

    const familyRows = memberships
      .data!.filter((m) => m.memberid === clientId)
      .map((m) => ({
        membership: m,
        family: familiesById.get(m.familyid),
        roles: memberRoles
          .data!.filter((r) => r.familyid === m.familyid && r.memberid === clientId)
          .map((r) => roleNames.get(r.roleid)?.rolename?.trim() || `Role #${r.roleid}`),
      }))

    return {
      client,
      person: peopleById.get(clientId),
      referrer: client.referredby != null ? peopleById.get(client.referredby) : undefined,
      referrals: clients.data!.filter((c) => c.referredby === clientId).map((c) => ({
        id: c.clientid,
        name: personName(peopleById.get(c.clientid), c.clientid),
      })),
      visits,
      familyRows,
    }
  }, [
    ready,
    clientId,
    people.data,
    clients.data,
    counselors.data,
    rooms.data,
    appointments.data,
    scheduled.data,
    families.data,
    memberships.data,
    memberRoles.data,
    familyRoles.data,
  ])

  if (error) return <ErrorState error={error} />
  if (!ready || detail === null) return <LoadingState />
  if (!detail) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No client with ID #{clientId} was found.
      </p>
    )
  }

  const { client, person, referrer, referrals, visits, familyRows } = detail
  const now = Date.now()
  const address = [clean(person?.address), [clean(person?.city), clean(person?.state)].filter(Boolean).join(', '), clean(person?.zip)]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="contact-heading" className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 id="contact-heading" className="text-xl font-semibold">
              {personName(person, clientId)}
            </h2>
            <p className="text-sm text-muted-foreground">Client #{clientId}</p>
          </div>
          {permissions.editClients && (
            <Link href={`/records?client=${clientId}`} className={buttonVariants({ variant: 'outline' })}>
              <PencilLine data-icon="inline-start" aria-hidden="true" />
              Edit client
            </Link>
          )}
        </div>
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Phone" value={clean(person?.phone)} />
          <InfoItem label="Email" value={clean(person?.email)} />
          <InfoItem label="Address" value={address} />
          <InfoItem label="Preferred reminder" value={clean(client.remindermethod)} />
          <InfoItem label="How they found RAFT" value={clean(client.foundout)} />
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase">Referred by</dt>
            <dd className="mt-0.5 text-sm">
              {client.referredby != null ? (
                <button
                  type="button"
                  onClick={() => onSelectClient(client.referredby!)}
                  className="font-medium text-primary hover:underline"
                >
                  {personName(referrer, client.referredby)}
                </button>
              ) : (
                <span className="text-muted-foreground">Not recorded</span>
              )}
            </dd>
          </div>
          {referrals.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-muted-foreground uppercase">Has referred</dt>
              <dd className="mt-0.5 text-sm">
                {referrals.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ', '}
                    <button type="button" onClick={() => onSelectClient(r.id)} className="font-medium text-primary hover:underline">
                      {r.name}
                    </button>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="appointments-heading" className={cardClass}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="appointments-heading" className="font-semibold">
            Appointments <span className="font-normal text-muted-foreground">({visits.length})</span>
          </h2>
          {permissions.addAppointments && (
            <Link href={`/records?type=appointment&newFor=${clientId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              New appointment
            </Link>
          )}
        </div>
        {visits.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">This client has no appointments.</p>
        ) : (
          <ul className="divide-y">
            {visits.map(({ scheduled: s, appointment, counselorName, roomName, otherClients }) => {
              const upcoming = (parseTimestamp(appointment?.appointmenttime)?.getTime() ?? 0) >= now
              return (
                <li key={s.appointmentid} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{formatDateTime(appointment?.appointmenttime)}</span>
                    {upcoming && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Upcoming</span>
                    )}
                    <KeptBadge kept={s.kept} />
                    <Link
                      href={`/records?appointment=${s.appointmentid}`}
                      className="ml-auto text-sm font-medium text-primary hover:underline"
                    >
                      {permissions.editAppointmentDetails ? 'Edit' : 'Update notes'}
                      <span className="sr-only"> appointment #{s.appointmentid}</span>
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    #{s.appointmentid} · {appointment?.duration ? `${appointment.duration} min` : 'No duration'} ·{' '}
                    {counselorName} · {roomName}
                    {otherClients.length > 0 && ` · With ${otherClients.map((o) => o.name).join(', ')}`}
                  </p>
                  {permissions.seeAssignment && clean(s.assignment) && (
                    <p className="text-sm">
                      <span className="font-medium">Assignment: </span>
                      {clean(s.assignment)}
                    </p>
                  )}
                  {permissions.seeNotes && clean(appointment?.notes) && (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-line">
                      <span className="font-medium">Notes: </span>
                      {clean(appointment?.notes)}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="families-heading" className={cardClass}>
        <div className="border-b px-5 py-4">
          <h2 id="families-heading" className="font-semibold">
            Families <span className="font-normal text-muted-foreground">({familyRows.length})</span>
          </h2>
        </div>
        {familyRows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">This client does not belong to any family.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium">Family</th>
                  <th scope="col" className="px-5 py-2 font-medium">Roles</th>
                  <th scope="col" className="px-5 py-2 font-medium">Joined</th>
                  <th scope="col" className="px-5 py-2 font-medium">Family founded</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {familyRows.map(({ membership, family, roles }) => (
                  <tr key={membership.familyid}>
                    <td className="px-5 py-3 font-medium">{clean(family?.familyname) || `Family #${membership.familyid}`}</td>
                    <td className="px-5 py-3">
                      {roles.length === 0 ? (
                        <span className="text-muted-foreground">No role recorded</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <span key={r} className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                              {r}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{formatDate(membership.datejoined)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatDate(family?.datefounded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || <span className="text-muted-foreground">Not recorded</span>}</dd>
    </div>
  )
}

function KeptBadge({ kept }: { kept: boolean | null }) {
  const style =
    kept === true
      ? 'bg-primary/10 text-primary'
      : kept === false
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{keptLabel(kept)}</span>
}
