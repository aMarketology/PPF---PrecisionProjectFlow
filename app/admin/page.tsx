'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Package, FileText, Building2, ShoppingCart,
  ChevronRight, Shield, Mail, BarChart3, Loader2, Wrench,
  MapPin, BadgeCheck, Coins,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loadAdminContext, can, type AdminContext } from '@/lib/admin/context';
import { RoleBadgeList } from '@/app/admin/components/RoleBadges';

interface Stats { users: number; companies: number; products: number; services: number; rfqs: number; orders?: number }
interface PersonalStats { products: number; services: number; rfqs: number; offers: number }

export default function AdminOverviewPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null);
  const [stats, setStats] = useState<Stats>({ users: 0, companies: 0, products: 0, services: 0, rfqs: 0, orders: 0 });
  const [personal, setPersonal] = useState<PersonalStats>({ products: 0, services: 0, rfqs: 0, offers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const context = await loadAdminContext(supabase);
      setCtx(context);
      if (!context) { setLoading(false); return; }

      const companyIds = context.companies.map(c => c.id);

      const [servicesRes, rfqsRes, offersRes, productsRes] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('provider_id', context.userId),
        supabase.from('rfqs').select('*', { count: 'exact', head: true }).eq('client_id', context.userId),
        supabase.from('rfq_offers').select('*', { count: 'exact', head: true }).eq('vendor_id', context.userId),
        companyIds.length
          ? supabase.from('products').select('*', { count: 'exact', head: true }).in('company_id', companyIds)
          : Promise.resolve({ count: 0 } as any),
      ]);
      setPersonal({
        services: servicesRes.count ?? 0,
        rfqs: rfqsRes.count ?? 0,
        offers: offersRes.count ?? 0,
        products: productsRes.count ?? 0,
      });

      if (context.isAdmin) {
        try {
          const res = await fetch('/api/admin?action=stats');
          const json = await res.json();
          if (json.users !== undefined) setStats(json);
        } catch (e) { console.error(e); }
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>;
  }

  if (!ctx) return null;

  const roleLabel = ctx.roleLabel;

  const personalCards = [
    { label: 'My Company', value: ctx.companies.length, href: '/admin/company', icon: Building2 },
    { label: 'Products', value: personal.products, href: '/admin/my-listings', icon: Package },
    { label: 'Services', value: personal.services, href: '/admin/my-listings', icon: Wrench },
    { label: 'My RFQs', value: personal.rfqs, href: '/admin/my-rfqs', icon: FileText },
    { label: 'Offers Sent', value: personal.offers, href: '/admin/my-rfqs', icon: ShoppingCart },
  ];

  const platformSections = [
    { label: 'Users', value: stats.users, href: '/admin/users', icon: Users },
    { label: 'Companies', value: stats.companies, href: '/admin/companies', icon: Building2 },
    { label: 'Products', value: stats.products, href: '/admin/products', icon: Package },
    { label: 'Services', value: stats.services, href: '/admin/services', icon: ShoppingCart },
    { label: 'RFQs', value: stats.rfqs, href: '/admin/rfqs', icon: FileText },
    { label: 'Orders', value: stats.orders ?? 0, href: '/admin/orders', icon: ShoppingCart },
  ];

  const StatCard = ({ label, value, href, icon: Icon, delay }: any) => (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-[#003D82]/30 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-[#003D82]/10 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-[#003D82]" />
        </div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </motion.div>
    </Link>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Account header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-8 h-8 text-[#003D82]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold text-gray-900">
                {ctx.profile?.full_name || 'My Account'}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs text-[#003D82] bg-[#003D82]/10 border border-[#003D82]/20 px-2.5 py-1 rounded-full font-semibold">
                <BadgeCheck className="w-3 h-3" /> {roleLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
              <span>{ctx.profile?.email}</span>
              {ctx.profile?.location && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{ctx.profile.location}</span>
              )}
              <span className="flex items-center gap-1.5"><Coins className="w-4 h-4" />{ctx.profile?.token_balance ?? 0} tokens</span>
            </div>
            {/* All roles & permissions this account holds */}
            <RoleBadgeList badges={ctx.badges} max={6} />
          </div>
        </div>
      </div>

      {/* Personal stat cards */}
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <LayoutDashboardIcon /> My Activity
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {personalCards.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.04} />
        ))}
      </div>

      {/* Companies list */}
      {ctx.companies.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#003D82]" /> My Companies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {ctx.companies.map(c => (
              <Link key={c.id} href={`/companies/${c.slug || c.id}`}>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-[#003D82]/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#003D82]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{c.company_name}</p>
                      <p className="text-xs text-gray-500">{[c.city, c.state].filter(Boolean).join(', ') || c.industry || '-'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 capitalize">{c.role}</span>
                    {c.is_verified && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Platform overview - super admins only */}
      {can(ctx, 'view_platform') && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#003D82]" /> Platform Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
            {platformSections.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 0.04} />
            ))}
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#003D82]" /> Platform Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              { label: 'Manage Users', desc: 'View profiles, grant access, and moderate accounts', href: '/admin/users', icon: Users },
              { label: 'Manage Companies', desc: 'Send claim invites, toggle claims, message owners', href: '/admin/companies', icon: Building2 },
              { label: 'Review Claims', desc: 'Approve or reject pending company claims', href: '/admin/claims', icon: Shield },
              { label: 'Manage RFQs', desc: 'See all posted requests and message requestors', href: '/admin/rfqs', icon: FileText },
              { label: 'Manage Services', desc: 'Review and moderate service listings', href: '/admin/services', icon: ShoppingCart },
              { label: 'Super Admin', desc: 'Add/remove admins and send outreach invites', href: '/admin/settings', icon: Mail },
              { label: 'Orders', desc: 'Track purchases and fulfillment', href: '/admin/orders', icon: Package },
              { label: 'Reports', desc: 'Analytics and platform metrics', href: '/admin/reports', icon: BarChart3 },
            ]).map((a, i) => (
              <Link key={a.label} href={a.href}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-[#003D82]/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#003D82]/10 flex items-center justify-center">
                      <a.icon className="w-5 h-5 text-[#003D82]" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{a.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#003D82] transition-colors" />
                </motion.div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LayoutDashboardIcon() {
  return <Users className="w-5 h-5 text-[#003D82]" />;
}

