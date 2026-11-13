import { labelClass } from '@/components/raft/form-styles'
import { cn } from '@/lib/utils'

type FieldProps = {
  id: string
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export function Field({ id, label, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold text-muted-foreground uppercase">{legend}</legend>
      {children}
    </fieldset>
  )
}
