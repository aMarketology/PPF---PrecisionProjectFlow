'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Package, FileText, Building2, ShoppingCart,
  ChevronRight, Shield, Mail, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface Stats { users: number; companies: number; products: number; services: number; rfqs: number; orders?: number }

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, companies: 0, products: 0, services: 0, rfqs: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin?action=stats');
      const json = await res.json();
      if (json.users !== undefined) setStats(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sections = [
    { label: 'Users', value: stats.users, href: '/admin/users', icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Companies', value: stats.companies, href: '/admin/companies', icon: Building2, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Products', value: stats.products, href: '/admin/products', icon: Package, color: 'from-purple-500 to-purple-600' },
    { label: 'Services', value: stats.services, href: '/admin/services', icon: ShoppingCart, color: 'from-emerald-500 to-emerald-600' },
    { label: 'RFQs', value: stats.rfqs, href: '/admin/rfqs', icon: FileText, color: 'from-orange-500 to-orange-600' },
    { label: 'Orders', value: stats.orders ?? 0, href: '/admin/orders', icon: ShoppingCart, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Everything happening across Precision Project Flow, in one place.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {sections.map((s, i) => (
          <Link key={s.label} href={s.href}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#003D82] hover:shadow-md transition-all"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Manage Users', desc: 'View profiles, grant access, and moderate accounts', href: '/admin/users', icon: Users },
          { label: 'Manage Companies', desc: 'Send claim invites, toggle claims, message owners', href: '/admin/companies', icon: Building2 },
          { label: 'Review Claims', desc: 'Approve or reject pending company claims', href: '/admin/claims', icon: Shield },
          { label: 'Manage RFQs', desc: 'See all posted requests and message requestors', href: '/admin/rfqs', icon: FileText },
          { label: 'Manage Services', desc: 'Review and moderate service listings', href: '/admin/services', icon: ShoppingCart },
          { label: 'Super Admin', desc: 'Add/remove admins and send outreach invites', href: '/admin/settings', icon: Mail },
          { label: 'Orders', desc: 'Track purchases and fulfillment', href: '/admin/orders', icon: Package },
          { label: 'Reports', desc: 'Analytics and platform metrics', href: '/admin/reports', icon: BarChart3 },
        ].map((a, i) => (
          <Link key={a.label} href={a.href}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#003D82] hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#003D82]/10 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-[#003D82]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#003D82] transition-colors" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

