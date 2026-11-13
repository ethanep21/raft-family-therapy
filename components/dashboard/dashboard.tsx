'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Breakdown, StatCard } from '@/components/dashboard/stat-widgets'
import { ErrorState, LoadingState, PageHeader } from '@/components/raft/status'
import { clean, parseTimestamp, personName } from '@/lib/raft/format'
import {
  byId,
  combine,
  useAppointments,
  useClients,
  useCounselors,
  useEmployees,
  useFamilies,
  useFamilyRoles,
  useMemberRoles,
  useMemberships,
  usePeople,
  useRooms,
  useScheduledFor,
} from '@/lib/raft/hooks'

function countBy<T>(rows: T[], keyOf: (row: T) => string) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1)
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

const percent = (part: number, whole: number) => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`)
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function Dashboard() {
  const { permissions } = useAuth()
  const people = usePeople()
  const clients = useClients()
  const counselors = useCounselors()
  const employees = useEmployees()
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
    employees,
    rooms,
    appointments,
    scheduled,
    families,
    memberships,
    memberRoles,
    familyRoles,
  )

  const stats = useMemo(() => {
    if (!ready) return null
    const peopleById = byId(people.data, 'personid')
    const roomsById = byId(rooms.data, 'roomnumber')
    const roleNames = byId(familyRoles.data, 'roleid')
    const appts = appointments.data!
    const sched = scheduled.data!
    const now = new Date()
    const times = appts.map((a) => parseTimestamp(a.appointmenttime))
    const upcoming = times.filter((t) => t && t >= now).length
    const thisMonth = times.filter(
      (t) => t && t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth(),
    ).length
    const durations = appts.map((a) => a.duration).filter((d): d is number => typeof d === 'number')
    const recorded = sched.filter((s) => s.kept !== null)
    const kept = recorded.filter((s) => s.kept).length
    const wages = permissions.seeWage
      ? employees.data!.map((e) => Number(e.wage)).filter((w) => Number.isFinite(w))
      : []

    return {
      clients: clients.data!.length,
      counselors: counselors.data!.length,
      employees: employees.data!.length,
      families: families.data!.length,
      rooms: rooms.data!.length,
      appointments: appts.length,
      upcoming,
      thisMonth,
      avgDuration: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null,
      keptRate: percent(kept, recorded.length),
      kept,
      missed: recorded.length - kept,
      unrecorded: sched.length - recorded.length,
      bookings: sched.length,
      referred: clients.data!.filter((c) => c.referredby != null).length,
      avgFamilySize: families.data!.length ? (memberships.data!.length / families.data!.length).toFixed(1) : '—',
      byCounselor: countBy(appts, (a) => personName(peopleById.get(a.counselorid), a.counselorid)),
      byRoom: countBy(appts, (a) => clean(roomsById.get(a.roomnumber)?.roomname) || `Room ${a.roomnumber}`),
      foundOut: countBy(clients.data!, (c) => clean(c.foundout) || 'Not recorded'),
      reminders: countBy(clients.data!, (c) => clean(c.remindermethod) || 'Not recorded'),
      familyRoles: countBy(memberRoles.data!, (r) => clean(roleNames.get(r.roleid)?.rolename) || `Role #${r.roleid}`),
      wages: wages.length
        ? {
            average: wages.reduce((s, w) => s + w, 0) / wages.length,
            min: Math.min(...wages),
            max: Math.max(...wages),
            count: wages.length,
          }
        : null,
    }
  }, [
    ready,
    permissions.seeWage,
    people.data,
    clients.data,
    counselors.data,
    employees.data,
    rooms.data,
    appointments.data,
    scheduled.data,
    families.data,
    memberships.data,
    memberRoles.data,
    familyRoles.data,
  ])

  return (
    <div>
      <PageHeader title="Dashboard" description="Every number below is calculated from the RAFT database when the page loads." />
      {error ? (
        <ErrorState error={error} />
      ) : !stats ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Totals" className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Clients" value={stats.clients} detail={`${stats.referred} referred by another client`} />
            <StatCard label="Appointments" value={stats.appointments} detail={`${stats.upcoming} upcoming`} />
            <StatCard
              label="Attendance kept"
              value={stats.keptRate}
              detail={`${stats.kept} kept · ${stats.missed} missed · ${stats.unrecorded} not recorded`}
            />
            <StatCard label="Families" value={stats.families} detail={`${stats.avgFamilySize} members on average`} />
            <StatCard label="This month" value={stats.thisMonth} detail="Appointments in the current month" />
            <StatCard
              label="Average length"
              value={stats.avgDuration != null ? `${stats.avgDuration} min` : '—'}
              detail={`${stats.bookings} client bookings in total`}
            />
            <StatCard label="Counselors" value={stats.counselors} detail={`${stats.employees} employees`} />
            <StatCard label="Rooms" value={stats.rooms} detail="Available for sessions" />
          </section>

          {stats.wages && (
            <section aria-label="Wages" className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Average wage" value={money.format(stats.wages.average)} detail={`Across ${stats.wages.count} employees`} />
              <StatCard label="Lowest wage" value={money.format(stats.wages.min)} detail="Admin only" />
              <StatCard label="Highest wage" value={money.format(stats.wages.max)} detail="Admin only" />
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Breakdown title="Appointments by counselor" rows={stats.byCounselor} />
            <Breakdown title="Appointments by room" rows={stats.byRoom} />
            <Breakdown title="How clients found RAFT" rows={stats.foundOut} />
            <Breakdown title="Preferred reminder method" rows={stats.reminders} />
            <Breakdown title="Roles held in families" rows={stats.familyRoles} />
          </div>
        </div>
      )}
    </div>
  )
}
