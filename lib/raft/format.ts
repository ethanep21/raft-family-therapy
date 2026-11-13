import type { Person } from './types'

export function clean(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function personName(person: Person | undefined, fallbackId?: number) {
  if (!person) return fallbackId != null ? `#${fallbackId}` : 'Unknown'
  const name = [clean(person.firstname), clean(person.lastname)].filter(Boolean).join(' ')
  return name || `#${person.personid}`
}

export function sortName(person: Person | undefined) {
  if (!person) return ''
  return `${clean(person.lastname)} ${clean(person.firstname)}`.toLowerCase()
}

/** Appointment times are `timestamp` without time zone, so read them as local wall-clock time. */
export function parseTimestamp(ts: string | null | undefined) {
  if (!ts) return null
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
}

export function parseDate(value: string | null | undefined) {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function formatDateTime(ts: string | null | undefined) {
  const d = parseTimestamp(ts)
  return d ? dateTimeFormat.format(d) : 'No time set'
}

export function formatTime(ts: string | null | undefined) {
  const d = parseTimestamp(ts)
  return d ? timeFormat.format(d) : 'No time'
}

export function formatDate(value: string | null | undefined) {
  const d = parseDate(value)
  return d ? dateFormat.format(d) : 'Not recorded'
}

export function toDateTimeInput(ts: string | null | undefined) {
  if (!ts) return ''
  return ts.replace(' ', 'T').slice(0, 16)
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function keptLabel(kept: boolean | null) {
  if (kept === true) return 'Kept'
  if (kept === false) return 'Missed'
  return 'Not recorded'
}

export function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
