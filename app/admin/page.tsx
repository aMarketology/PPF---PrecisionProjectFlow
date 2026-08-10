'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Shield, Users, Package, FileText, Building2, Loader2,
  Search, Trash2, Eye, ExternalLink, Layers, ChevronRight,
  Mail, UserPlus, Globe,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'users' | 'companies' | 'products' | 'services' | 'rfqs' | 'overview';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [inviteModal, setInviteModal] = useState<{ companyId: string; companyName: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [stats, setStats] = useState({ users: 0, companies: 0, products: 0, services: 0, rfqs: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      // Use RPC instead of direct profiles read (more reliable through RLS)
      const { data: isAdminResult } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!isAdminResult) { router.push('/'); toast.error('Access denied'); return; }
      setIsAdmin(true);
      
      // Also fetch profile for display
      const { data: profile } = await supabase.from('profiles').select('full_name, is_admin').eq('id', user.id).single();
      if (profile) setUser((prev: any) => ({ ...prev, profile }));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab === 'overview') return;
    loadData(activeTab);
  }, [activeTab, isAdmin]);

  const loadStats = async () => {
    const supabase = createClient();
    const tables = ['profiles', 'company_profiles', 'products', 'services', 'rfqs'];
    const results = await Promise.all(
      tables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }))
    );
    setStats({
      users: results[0].count || 0,
      companies: results[1].count || 0,
      products: results[2].count || 0,
      services: results[3].count || 0,
      rfqs: results[4].count || 0,
    });
  };

  const loadData = async (tab: Tab) => {
    setDataLoading(true);
    const supabase = createClient();
    try {
      let result;
      switch (tab) {
        case 'users':
          const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
          setData(profiles as any[] || []); break;
        case 'products':
          const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(50);
          setData(products as any[] || []); break;
        case 'companies':
          const { data: companies } = await supabase.from('company_profiles').select('*').order('created_at', { ascending: false }).limit(50);
          setData(companies as any[] || []); break;
        case 'rfqs':
          const { data: rfqs } = await supabase.from('rfqs').select('*, profiles!client_id(full_name)').order('created_at', { ascending: false }).limit(50);
          setData(rfqs as any[] || []); break;
        case 'services':
          const { data: services } = await supabase.from('services').select('*').order('created_at', { ascending: false }).limit(50);
          setData(services as any[] || []); break;
      }
    } catch (e) { console.error(e); } finally { setDataLoading(false); }
  };

  const handleDelete = async (tab: Tab, id: string) => {
    if (!confirm('Delete this item permanently?')) return;
    const supabase = createClient();
    const table = tab === 'companies' ? 'company_profiles' : tab === 'rfqs' ? 'rfqs' : tab === 'users' ? 'profiles' : tab;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    setData(prev => prev.filter(d => d.id !== id));
    loadStats();
  };

  const handleToggleActive = async (id: string, current: boolean, type: 'product' | 'service') => {
    const supabase = createClient();
    const table = type === 'product' ? 'products' : 'services';
    const col = type === 'product' ? 'is_active' : 'active';
    const { error } = await supabase.from(table).update({ [col]: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Toggled to ${!current ? 'active' : 'inactive'}`);
    setData(prev => prev.map(d => d.id === id ? { ...d, [col]: !current } : d));
  };

  const handleSendInvite = async () => {
    if (!inviteModal || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      // Find user by email
      const supabase = createClient();
      const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', inviteEmail.trim().toLowerCase()).single();
      
      if (!targetUser) { toast.error('User not found with that email'); return; }

      const res = await fetch('/api/messages/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: inviteModal.companyId, targetUserId: targetUser.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to send invite'); return; }
      toast.success(`Invite sent to ${inviteEmail} for ${inviteModal.companyName}`);
      setInviteModal(null);
      setInviteEmail('');
    } catch { toast.error('Failed to send invite'); }
    finally { setInviting(false); }
  };

  const filtered = data.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.title || d.name || d.full_name || d.company_name || d.email)?.toLowerCase().includes(q);
  });

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'companies', label: 'Companies', icon: Building2 },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'services', label: 'Services', icon: Layers },
    { key: 'rfqs', label: 'RFQs', icon: FileText },
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      {/* Top bar */}
      <div className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-lg">Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Site</Link>
            <span className="text-gray-500">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <div className="w-52 bg-gray-900 text-gray-400 flex flex-col flex-shrink-0">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); }}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                activeTab === tab.key ? 'bg-gray-800 text-white border-l-2 border-[#FF6B35]' : 'hover:bg-gray-800 hover:text-white border-l-2 border-transparent'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' ? (
            /* Overview Dashboard */
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Overview</h1>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  { label: 'Users', value: stats.users, color: 'blue' },
                  { label: 'Companies', value: stats.companies, color: 'cyan' },
                  { label: 'Products', value: stats.products, color: 'purple' },
                  { label: 'Services', value: stats.services, color: 'emerald' },
                  { label: 'RFQs', value: stats.rfqs, color: 'orange' },
                ].map(s => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(['users', 'companies', 'products', 'services', 'rfqs'] as Tab[]).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#003D82] hover:shadow-md transition-all text-left flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-gray-900 capitalize">{tab}</p>
                      <p className="text-sm text-gray-500 mt-1">Manage all {tab}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#003D82] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Table View */
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${activeTab}...`} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm" />
                </div>
                <span className="text-sm text-gray-500">{filtered.length} items</span>
              </div>

              {dataLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#003D82]" /></div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Name</th>
                        <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Details</th>
                        <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Status</th>
                        <th className="text-right px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">
                              {item.full_name || item.company_name || item.title || item.name || item.id?.slice(0,8)}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">
                              {item.email || item.profiles?.full_name || item.category || ''}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {item.user_type && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{item.user_type}</span>}
                              {item.status && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{item.status}</span>}
                              {item.price && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">${Number(item.price).toLocaleString()}</span>}
                              {item.is_admin && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Admin</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              (item.active || item.is_active) === false ? 'bg-gray-100 text-gray-500' :
                              item.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.status || ((item.active ?? item.is_active) !== false ? 'Active' : 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {activeTab === 'companies' && (
                                <button onClick={() => setInviteModal({ companyId: item.id, companyName: item.company_name || item.name })}
                                  className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600" title="Invite to claim">
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}
                              {(activeTab === 'products' || activeTab === 'services') && (
                                <button onClick={() => handleToggleActive(item.id, item.active ?? item.is_active ?? true, activeTab === 'products' ? 'product' : 'service')}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400" title="Toggle">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleDelete(activeTab, item.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No results</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#FF6B35]" /> Send Claim Invite
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Invite a user to claim <span className="font-semibold text-gray-800">{inviteModal.companyName}</span>. They'll get a DM with Accept/Decline buttons.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1">User Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="user@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setInviteModal(null); setInviteEmail(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSendInvite} disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
