import { permanentRedirect } from 'next/navigation';

// Migrated: company management now lives at /admin/company.
export default function CompanyDashboardRedirect() {
  permanentRedirect('/admin/company');
}