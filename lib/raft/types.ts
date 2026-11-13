export type Person = {
  personid: number
  firstname: string | null
  lastname: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
}

export type Client = {
  clientid: number
  foundout: string | null
  remindermethod: string | null
  referredby: number | null
}

export type Counselor = {
  counselorid: number
  degreesuffix: string | null
}

export type Employee = {
  employeeid: number
  datehired: string | null
  supervisorid: number
  wage?: number | string | null
}

export type Room = {
  roomnumber: number
  roomname: string | null
}

export type Appointment = {
  appointmentid: number
  appointmenttime: string | null
  duration: number | null
  counselorid: number
  employeeid: number
  roomnumber: number
  notes?: string | null
}

export type ScheduledFor = {
  appointmentid: number
  clientid: number
  kept: boolean | null
  assignment?: string | null
}

export type Family = {
  familyid: number
  familyname: string | null
  datefounded: string | null
}

export type MemberInFamily = {
  familyid: number
  memberid: number
  datejoined: string | null
}

export type MemberRole = {
  familyid: number
  memberid: number
  roleid: number
}

export type FamilyRole = {
  roleid: number
  rolename: string | null
}
