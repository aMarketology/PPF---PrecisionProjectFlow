import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared permission context for the /admin area.
 *
 * Every authenticated user gets a personal /admin panel. Super admins
 * (profiles.is_admin) additionally get platform-wide management pages.
 *
 * NOTE: the live `profiles` table has no `company_name` column - the company
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
  /** Every role/permission badge the user qualifies for. */
  badges: AdminBadge[];
}

export type BadgeTone = 'navy' | 'orange' | 'emerald' | 'amber' | 'purple' | 'gray';

export interface AdminBadge {
  /** Stable key for React lists. */
  key: string;
  label: string;
  tone: BadgeTone;
  /** Optional short explanation shown as a tooltip. */
  hint?: string;
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

/**
 * Builds the full badge set from real permissions. A user can hold several
 * roles at once (e.g. super admin AND owner of two companies), so we surface
 * every one rather than collapsing to a single label.
 */
function deriveBadges(
  ctx: Omit<AdminContext, 'primaryCompany' | 'roleLabel' | 'roleDescription' | 'badges'>,
  primaryCompany: AdminCompany | null
): AdminBadge[] {
  const badges: AdminBadge[] = [];

  if (ctx.isAdmin) {
    badges.push({
      key: 'super-admin',
      label: 'Super Admin',
      tone: 'orange',
      hint: 'Full platform access across every company and account.',
    });
  }

  // Company roles - one badge per company the user belongs to.
  // The primary company's name is already the header title, so its badge
  // shows just the role; other companies include the name for clarity.
  for (const c of ctx.companies) {
    const roleLabel =
      c.role === 'owner' ? 'Owner' : c.role === 'admin' ? 'Admin' : 'Member';
    const isPrimary = primaryCompany?.id === c.id;
    badges.push({
      key: `company-${c.id}`,
      label: isPrimary ? roleLabel : `${roleLabel} · ${c.company_name}`,
      tone: c.role === 'owner' ? 'navy' : c.role === 'admin' ? 'purple' : 'gray',
      hint: `You are ${c.role === 'owner' ? 'the owner' : `an ${c.role}`} of ${c.company_name}.`,
    });
  }

  // Account-type badge.
  if (ctx.profile?.user_type === 'engineer') {
    badges.push({ key: 'engineer', label: 'Engineer', tone: 'emerald', hint: 'Vendor / engineer account.' });
  } else if (ctx.profile?.user_type === 'client') {
    badges.push({ key: 'client', label: 'Client', tone: 'gray', hint: 'Client / buyer account.' });
  }

  // Capability badges.
  if (ctx.managedCompanies.length > 1) {
    badges.push({
      key: 'multi-company',
      label: `Manages ${ctx.managedCompanies.length} Companies`,
      tone: 'purple',
      hint: 'You can manage more than one company.',
    });
  }
  if (ctx.companies.length > 0 && ctx.managedCompanies.length === 0) {
    badges.push({
      key: 'team-member',
      label: 'Team Member',
      tone: 'gray',
      hint: 'You belong to a company but cannot manage it.',
    });
  }
  if (ctx.companies.length === 0 && !ctx.isAdmin) {
    badges.push({
      key: 'no-company',
      label: 'No Company',
      tone: 'amber',
      hint: 'You are not part of a company yet.',
    });
  }

  // De-duplicate by key, preserving order.
  const seen = new Set<string>();
  return badges.filter(b => (seen.has(b.key) ? false : (seen.add(b.key), true)));
}

function deriveIdentity(ctx: Omit<AdminContext, 'primaryCompany' | 'roleLabel' | 'roleDescription' | 'badges'>) {
  // Prefer the highest-privilege company the user can manage.
  const ranked = [...ctx.companies].sort(
    (a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role]
  );
  const primaryCompany = ranked[0] ?? null;

  const badges = deriveBadges(ctx, primaryCompany);

  if (ctx.isAdmin) {
    return {
      primaryCompany,
      roleLabel: 'Super Admin',
      roleDescription: 'Full platform access across every company and account.',
      badges,
    };
  }

  if (primaryCompany && (primaryCompany.role === 'owner' || primaryCompany.role === 'admin')) {
    return {
      primaryCompany,
      roleLabel: primaryCompany.role === 'owner' ? 'Company Owner' : 'Company Admin',
      roleDescription: `Manages ${primaryCompany.company_name}.`,
      badges,
    };
  }

  if (primaryCompany) {
    return {
      primaryCompany,
      roleLabel: 'Team Member',
      roleDescription: `Member of ${primaryCompany.company_name}.`,
      badges,
    };
  }

  return {
    primaryCompany: null,
    roleLabel: ctx.profile?.user_type === 'engineer' ? 'Engineer' : 'Client',
    roleDescription: 'Personal account - not part of a company yet.',
    badges,
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
