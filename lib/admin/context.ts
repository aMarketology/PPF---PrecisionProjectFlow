import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared permission context for the /admin area.
 *
 * Every authenticated user gets a personal /admin panel. Super admins
 * (profiles.is_admin) additionally get platform-wide management pages.
 *
 * NOTE: the live `profiles` table has no `company_name` column — the company
 * name lives on `company_profiles`. Do not select profiles.company_name.
 */

export type CompanyRole = 'owner' | 'admin' | 'member';

export interface AdminCompany {
  id: string;
  company_name: string;
  slug: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  is_claimed: boolean;
  is_verified: boolean | null;
  role: CompanyRole;
}

export interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  user_type: 'client' | 'engineer' | string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  token_balance: number | null;
  is_admin: boolean | null;
  company_id: string | null;
  created_at: string | null;
}

export interface AdminContext {
  userId: string;
  profile: AdminProfile | null;
  isAdmin: boolean;
  /** Companies the user is an active member of, with their role. */
  companies: AdminCompany[];
  /** Companies where the user is owner or admin (can manage). */
  managedCompanies: AdminCompany[];
  /** True when the user can manage at least one company. */
  isCompanyManager: boolean;
  /**
   * The company used to label the user in the UI: their highest-privilege
   * managed company, otherwise their first membership. Null if none.
   */
  primaryCompany: AdminCompany | null;
  /** Short label for the header badge, derived from real permissions. */
  roleLabel: string;
  /** Longer human description of the user's access. */
  roleDescription: string;
}

/** Actions the UI can gate on. Enforcement still happens in RLS + server code. */
export type AdminAction =
  | 'view_platform'      // platform-wide admin pages
  | 'manage_platform'    // mutate platform-wide data
  | 'manage_company'     // edit a company profile / team
  | 'view_company';      // view company-scoped data

const ROLE_RANK: Record<CompanyRole, number> = { owner: 3, admin: 2, member: 1 };

export function can(ctx: AdminContext, action: AdminAction): boolean {
  switch (action) {
    case 'view_platform':
    case 'manage_platform':
      return ctx.isAdmin;
    case 'manage_company':
      return ctx.isAdmin || ctx.isCompanyManager;
    case 'view_company':
      return ctx.isAdmin || ctx.companies.length > 0;
    default:
      return false;
  }
}

function deriveIdentity(ctx: Omit<AdminContext, 'primaryCompany' | 'roleLabel' | 'roleDescription'>) {
  // Prefer the highest-privilege company the user can manage.
  const ranked = [...ctx.companies].sort(
    (a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role]
  );
  const primaryCompany = ranked[0] ?? null;

  if (ctx.isAdmin) {
    return {
      primaryCompany,
      roleLabel: 'Super Admin',
      roleDescription: 'Full platform access across every company and account.',
    };
  }

  if (primaryCompany && (primaryCompany.role === 'owner' || primaryCompany.role === 'admin')) {
    return {
      primaryCompany,
      roleLabel: primaryCompany.role === 'owner' ? 'Company Owner' : 'Company Admin',
      roleDescription: `Manages ${primaryCompany.company_name}.`,
    };
  }

  if (primaryCompany) {
    return {
      primaryCompany,
      roleLabel: 'Team Member',
      roleDescription: `Member of ${primaryCompany.company_name}.`,
    };
  }

  return {
    primaryCompany: null,
    roleLabel: ctx.profile?.user_type === 'engineer' ? 'Engineer' : 'Client',
    roleDescription: 'Personal account — not part of a company yet.',
  };
}

export async function loadAdminContext(supabase: SupabaseClient): Promise<AdminContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, user_type, bio, location, avatar_url, token_balance, is_admin, company_id, created_at')
    .eq('id', user.id)
    .single();

  const { data: memberships } = await supabase
    .from('company_members')
    .select('company_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const companyIds = (memberships ?? []).map(m => m.company_id);
  let companies: AdminCompany[] = [];

  if (companyIds.length > 0) {
    const { data: rows } = await supabase
      .from('company_profiles')
      .select('id, company_name, slug, industry, city, state, is_claimed, is_verified')
      .in('id', companyIds);

    const roleByCompany = new Map(
      (memberships ?? []).map(m => [m.company_id, m.role as CompanyRole])
    );

    companies = (rows ?? []).map(r => ({
      ...r,
      role: roleByCompany.get(r.id) ?? 'member',
    }));
  }

  const managedCompanies = companies.filter(c => c.role === 'owner' || c.role === 'admin');

  const base = {
    userId: user.id,
    profile: (profile as AdminProfile) ?? null,
    isAdmin: !!profile?.is_admin,
    companies,
    managedCompanies,
    isCompanyManager: managedCompanies.length > 0,
  };

  return { ...base, ...deriveIdentity(base) };
}

/** Paths that only super admins may access. */
export const SUPER_ADMIN_ONLY_PATHS = [
  '/admin/users',
  '/admin/companies',
  '/admin/claims',
  '/admin/products',
  '/admin/services',
  '/admin/orders',
  '/admin/rfqs',
  '/admin/reports',
  '/admin/settings',
];

export function isSuperAdminOnlyPath(pathname: string): boolean {
  return SUPER_ADMIN_ONLY_PATHS.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );
}
