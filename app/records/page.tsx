import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RecordEditor } from '@/components/records/record-editor'

export const metadata: Metadata = { title: 'Add or edit a record · RAFT Front Desk' }

export default function RecordsPage() {
  return (
    <Suspense>
      <RecordEditor />
    </Suspense>
  )
}
