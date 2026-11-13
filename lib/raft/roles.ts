export type RaftRole = 'raft_admin' | 'raft_scheduler' | 'raft_counselor'

export const ROLE_LABELS: Record<RaftRole, string> = {
  raft_admin: 'Admin',
  raft_scheduler: 'Scheduler',
  raft_counselor: 'Counselor',
}

export function isRaftRole(value: unknown): value is RaftRole {
  return value === 'raft_admin' || value === 'raft_scheduler' || value === 'raft_counselor'
}

export function roleFromAccessToken(token: string | undefined): RaftRole | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const claims = JSON.parse(atob(padded)) as { role?: unknown }
    return isRaftRole(claims.role) ? claims.role : null
  } catch {
    return null
  }
}

export type Permissions = {
  seeWage: boolean
  seeNotes: boolean
  seeAssignment: boolean
  editClients: boolean
  addAppointments: boolean
  editAppointmentDetails: boolean
  scheduleClients: boolean
  editNotes: boolean
  editAssignment: boolean
  editKept: boolean
}

export function permissionsFor(role: RaftRole): Permissions {
  const admin = role === 'raft_admin'
  const scheduler = role === 'raft_scheduler'
  const counselor = role === 'raft_counselor'
  return {
    seeWage: admin,
    seeNotes: !scheduler,
    seeAssignment: !scheduler,
    editClients: !counselor,
    addAppointments: !counselor,
    editAppointmentDetails: !counselor,
    scheduleClients: !counselor,
    editNotes: admin || counselor,
    editAssignment: admin || counselor,
    editKept: true,
  }
}

export const PERSON_COLUMNS = 'personid,firstname,lastname,address,city,state,zip,phone,email'
export const CLIENT_COLUMNS = 'clientid,foundout,remindermethod,referredby'
export const COUNSELOR_COLUMNS = 'counselorid,degreesuffix'
export const ROOM_COLUMNS = 'roomnumber,roomname'
export const FAMILY_COLUMNS = 'familyid,familyname,datefounded'
export const MEMBER_IN_FAMILY_COLUMNS = 'familyid,memberid,datejoined'
export const MEMBER_ROLE_COLUMNS = 'familyid,memberid,roleid'
export const ROLE_COLUMNS = 'roleid,rolename'

export function employeeColumns(p: Permissions) {
  return ['employeeid', 'datehired', 'supervisorid', ...(p.seeWage ? ['wage'] : [])].join(',')
}

export function appointmentColumns(p: Permissions) {
  return [
    'appointmentid',
    'appointmenttime',
    'duration',
    'counselorid',
    'employeeid',
    'roomnumber',
    ...(p.seeNotes ? ['notes'] : []),
  ].join(',')
}

export function scheduledForColumns(p: Permissions) {
  return ['appointmentid', 'clientid', 'kept', ...(p.seeAssignment ? ['assignment'] : [])].join(',')
}
