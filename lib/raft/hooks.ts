'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { selectAll } from './queries'
import {
  appointmentColumns,
  CLIENT_COLUMNS,
  COUNSELOR_COLUMNS,
  employeeColumns,
  FAMILY_COLUMNS,
  MEMBER_IN_FAMILY_COLUMNS,
  MEMBER_ROLE_COLUMNS,
  PERSON_COLUMNS,
  ROLE_COLUMNS,
  ROOM_COLUMNS,
  scheduledForColumns,
} from './roles'
import type {
  Appointment,
  Client,
  Counselor,
  Employee,
  Family,
  FamilyRole,
  MemberInFamily,
  MemberRole,
  Person,
  Room,
  ScheduledFor,
} from './types'

export const usePeople = () => useSWR('person', () => selectAll<Person>('person', PERSON_COLUMNS, ['personid']))
export const useClients = () => useSWR('client', () => selectAll<Client>('client', CLIENT_COLUMNS, ['clientid']))
export const useCounselors = () =>
  useSWR('counselor', () => selectAll<Counselor>('counselor', COUNSELOR_COLUMNS, ['counselorid']))
export const useRooms = () => useSWR('room', () => selectAll<Room>('room', ROOM_COLUMNS, ['roomnumber']))
export const useFamilies = () => useSWR('family', () => selectAll<Family>('family', FAMILY_COLUMNS, ['familyid']))
export const useMemberships = () =>
  useSWR('member_in_family', () =>
    selectAll<MemberInFamily>('member_in_family', MEMBER_IN_FAMILY_COLUMNS, ['familyid', 'memberid']),
  )
export const useMemberRoles = () =>
  useSWR('member_role', () =>
    selectAll<MemberRole>('member_role', MEMBER_ROLE_COLUMNS, ['familyid', 'memberid', 'roleid']),
  )
export const useFamilyRoles = () => useSWR('role', () => selectAll<FamilyRole>('role', ROLE_COLUMNS, ['roleid']))

export function useEmployees() {
  const { permissions } = useAuth()
  return useSWR('employee', () => selectAll<Employee>('employee', employeeColumns(permissions), ['employeeid']))
}

export function useAppointments() {
  const { permissions } = useAuth()
  return useSWR('appointment', () =>
    selectAll<Appointment>('appointment', appointmentColumns(permissions), ['appointmenttime', 'appointmentid']),
  )
}

export function useScheduledFor() {
  const { permissions } = useAuth()
  return useSWR('scheduledfor', () =>
    selectAll<ScheduledFor>('scheduledfor', scheduledForColumns(permissions), ['appointmentid', 'clientid']),
  )
}

type Loadable = { data?: unknown; error?: unknown; isLoading: boolean }

export function combine(...results: Loadable[]) {
  const error = results.find((r) => r.error)?.error as Error | undefined
  const ready = results.every((r) => r.data !== undefined)
  return { error, ready }
}

export function useRefresh() {
  const { mutate } = useSWRConfig()
  return useCallback((...keys: string[]) => Promise.all(keys.map((key) => mutate(key))), [mutate])
}

export function byId<T, K extends keyof T>(rows: T[] | undefined, key: K) {
  const map = new Map<T[K], T>()
  for (const row of rows ?? []) map.set(row[key], row)
  return map
}
