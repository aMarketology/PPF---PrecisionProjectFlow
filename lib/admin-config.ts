// Admin configuration
// Add your email address here to be the platform owner/admin

export const ADMIN_EMAILS: string[] = [
  'precisionprojectflow@gmail.com',
]

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}

// Admin roles for future expansion
export type AdminRole = 'owner' | 'moderator' | 'support'

export interface AdminUser {
  email: string
  role: AdminRole
}

// You can expand this to include more granular permissions
export const ADMIN_PERMISSIONS = {
  owner: ['all'],
  moderator: ['users', 'services', 'orders', 'reports'],
  support: ['users', 'orders', 'messages'],
} as const
