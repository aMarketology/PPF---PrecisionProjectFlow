'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import {
  Building2, Users, UserPlus, UserMinus, Settings2, Loader2, Search, X,
  Mail, Shield, Trash2, Crown, MessageSquare, Hash, ArrowLeft,
  MapPin, Globe, Phone, Tag, Edit3, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface CompanyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'removed';
  created_at: string;
  profile: { full_name: string; email: string; avatar_url?: string | null; user_type: string };
}

interface CompanyProfile {
  id: string;
  company_name: string;
  slug: string | null;
  industry: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  specialties: string[] | null;
  is_verified: boolean;
  owner_id: string;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');

  // Invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [leavingCompany, setLeavingCompany] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      loadCompany(user.id);
    });
  }, [companyId]);

  const loadCompany = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: comp } = await supabase.from('company_profiles')
        .select('*').eq('id', companyId).single();
      if (!comp) { toast.error('Company not found'); router.push('/companies'); return; }
      setCompany(comp);
      setIsOwner(comp.owner_id === userId);

      // Load members
      const { data: mems } = await supabase.from('company_members')
        .select('id, user_id, role, status, created_at')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (mems) {
        // Check if current user is admin
        const myMembership = mems.find(m => m.user_id === userId);
        if (myMembership?.role === 'admin') setIsAdmin(true);

        // Fetch profiles for all members
        const withProfiles = await Promise.all(mems.map(async (m) => {
          const { data: prof } = await supabase.from('profiles')
            .select('full_name, email, avatar_url, user_type').eq('id', m.user_id).single();
          return { ...m, profile: prof || { full_name: 'Unknown', email: '', user_type: 'engineer' } };
        }));
        setMembers(withProfiles);
      }
    } catch (err: any) {
      console.error('loadCompany:', err);
      toast.error('Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async () => {
    if (inviteSearch.length < 2) { setInviteResults([]); return; }
    setInviteSearching(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email, user_type, avatar_url')
        .ilike('full_name', `%${inviteSearch}%`)
        .neq('id', user.id)
        .limit(10);
      // Filter out existing members
      const existingIds = new Set(members.map(m => m.user_id));
      setInviteResults((data || []).filter(u => !existingIds.has(u.id)));
    } finally { setInviteSearching(false); }
  }, [inviteSearch, members, user]);

  useEffect(() => { searchUsers(); }, [inviteSearch, searchUsers]);

  const handleInvite = async (targetUserId: string) => {
    setInviting(targetUserId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('invite_company_member', {
        p_company_id: companyId,
        p_user_id: targetUserId,
        p_role: 'member',
      });
      if (error) throw error;
      if (data === 'active') {
        toast.success('Team member added!');
        loadCompany(user.id);
        setInviteSearch('');
        setInviteResults([]);
      } else {
        toast.error(data || 'Failed to invite');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite');
    } finally {
      setInviting(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('company_members')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
      toast.success(`${memberName} removed`);
      loadCompany(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string, memberName: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('company_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
      toast.success(`${memberName} is now ${newRole}`);
      loadCompany(user.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleLeaveCompany = async () => {
    if (!company) return;
    if (!window.confirm(`Leave ${company.company_name}? You will lose access to its team channels.`)) return;

    setLeavingCompany(true);
    try {
      const response = await fetch(`/api/companies/${company.id}/leave`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to leave company');
      toast.success(`You left ${company.company_name}`);
      router.push('/companies');
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave company');
    } finally {
      setLeavingCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!company) return null;

  const canManage = isOwner || isAdmin;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <Link href="/companies" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Directory
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">{company.company_name}</h1>
              <p className="text-blue-200">{company.industry || 'Company'} · {[company.city, company.state].filter(Boolean).join(', ') || 'No location'}</p>
            </div>
            {company.is_verified && (
              <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0">
            <button onClick={() => setActiveTab('overview')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-[#003D82] text-[#003D82]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Building2 className="w-4 h-4 inline mr-1.5" /> Overview
            </button>
            <button onClick={() => setActiveTab('team')}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'team' ? 'border-[#003D82] text-[#003D82]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Users className="w-4 h-4 inline mr-1.5" /> Team ({members.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Company Info Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Company Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {company.industry && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{company.industry}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#003D82] hover:underline truncate">{company.website}</a>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{company.email}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{[company.city, company.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  {company.description && (
                    <p className="mt-4 text-sm text-gray-600 leading-relaxed">{company.description}</p>
                  )}
                  {company.specialties && company.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {company.specialties.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-[#003D82] text-xs font-medium rounded-full border border-blue-100">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Link href="/messages"
                      className="flex items-center gap-3 w-full px-4 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all text-sm">
                      <MessageSquare className="w-4 h-4" /> Open Team Chat
                    </Link>
                    {canManage && (
                      <button onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-3 w-full px-4 py-3 border-2 border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white font-semibold rounded-xl transition-all text-sm">
                        <UserPlus className="w-4 h-4" /> Invite Team Member
                      </button>
                    )}
                    <Link href={`/companies/${company.slug || company.id}`}
                      className="flex items-center gap-3 w-full px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all text-sm">
                      <Building2 className="w-4 h-4" /> View Public Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLeaveCompany}
                      disabled={leavingCompany}
                      className="flex items-center gap-3 w-full px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-all text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {leavingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                      Leave Company
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
                    <p className="text-sm text-gray-500">{members.length} active member{members.length !== 1 ? 's' : ''}</p>
                  </div>
                  {canManage && (
                    <button onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-all text-sm">
                      <UserPlus className="w-4 h-4" /> Invite Member
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {member.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{member.profile.full_name}</p>
                          {member.role === 'owner' && <span title="Owner"><Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /></span>}
                          {member.role === 'admin' && <span title="Admin"><Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /></span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{member.profile.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        member.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        member.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {member.role}
                      </span>
                      {canManage && member.role !== 'owner' && (
                        <div className="flex items-center gap-1">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value, member.profile.full_name)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-[#003D82]/30"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleRemoveMember(member.id, member.profile.full_name)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove member">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                      <p className="text-sm">No team members yet</p>
                      {canManage && <p className="text-xs mt-1">Invite your team to collaborate</p>}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInviteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                <p className="text-gray-500 text-sm mt-0.5">Search for a user to add to {company.company_name}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
                    placeholder="Search by name..." autoFocus
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {inviteSearching ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#003D82] animate-spin" /></div>
                  ) : inviteResults.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">
                      {inviteSearch.length >= 2 ? 'No users found' : 'Type to search for users'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {inviteResults.map(u => (
                        <button key={u.id} onClick={() => handleInvite(u.id)} disabled={inviting === u.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors disabled:opacity-50">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          {inviting === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#003D82]" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-[#FF6B35]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowInviteModal(false)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}