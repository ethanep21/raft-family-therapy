import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ClientLookup } from '@/components/lookup/client-lookup'

export const metadata: Metadata = { title: 'Client lookup · RAFT Front Desk' }

export default function LookupPage() {
  return (
    <Suspense>
      <ClientLookup />
    </Suspense>
  )
}
