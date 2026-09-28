import { permanentRedirect } from 'next/navigation'

// Migrated: the client dashboard now lives at /admin.
export default function ClientDashboardRedirect() {
  permanentRedirect('/admin')
}
