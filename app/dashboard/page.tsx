import type { Metadata } from 'next'
import { Dashboard } from '@/components/dashboard/dashboard'

export const metadata: Metadata = { title: 'Dashboard · RAFT Front Desk' }

export default function DashboardPage() {
  return <Dashboard />
}
