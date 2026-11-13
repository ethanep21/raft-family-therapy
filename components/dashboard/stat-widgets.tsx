import { cardClass } from '@/components/raft/form-styles'

export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <section className={cardClass} aria-label={title}>
      <h2 className="border-b px-5 py-4 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No records yet.</p>
      ) : (
        <ul className="flex flex-col gap-3 p-5">
          {rows.slice(0, 8).map((row) => (
            <li key={row.label}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate">{row.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.value}
                  <span className="sr-only"> of {total}</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {rows.length > 8 && <li className="text-xs text-muted-foreground">+ {rows.length - 8} more</li>}
        </ul>
      )}
    </section>
  )
}
