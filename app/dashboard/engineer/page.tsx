import { permanentRedirect } from 'next/navigation'

// Migrated: the engineer dashboard now lives at /admin.
export default function EngineerDashboardRedirect() {
  permanentRedirect('/admin')
}