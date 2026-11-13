export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>}
    </div>
  )
}

export function LoadingState({ label = 'Loading from the database…' }: { label?: string }) {
  return (
    <p role="status" className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  )
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">The database returned an error.</p>
      <p className="mt-1 text-muted-foreground">{error.message}</p>
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: React.ReactNode }) {
  const styles = {
    success: 'border-primary/30 bg-primary/5 text-foreground',
    error: 'border-destructive/30 bg-destructive/5 text-destructive',
    info: 'border-border bg-muted text-muted-foreground',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  )
}
