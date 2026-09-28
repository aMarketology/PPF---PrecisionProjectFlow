import { permanentRedirect } from 'next/navigation'

// Migrated: portfolio management now lives under /admin.
export default function PortfolioRedirect() {
  permanentRedirect('/admin/my-listings')
}
