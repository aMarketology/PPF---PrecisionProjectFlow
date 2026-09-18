'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Mail, Building2, MapPin, Calendar, Shield,
  ShieldAlert, CheckCircle2, XCircle, Clock, MessageSquare,
  Package, FileText, Users, Loader2, ExternalLink,
  Star, Briefcase, Hash, Phone,
} from 'lucide-react';
import Link from 'next/link';

interface UserDetail {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    company_name: string | null;
    bio: string | null;
    location: string | null;
    user_type: 'client' | 'engineer';
    is_admin: boolean | null;
    is_verified: boolean | null;
    token_balance: number;
    created_at: string;
    updated_at?: string;
  };
  memberships: Array<{
    id: string;
    company_id: string;
    role: string;
    status: string;
    created_at: string;
    company: { id: string; company_name: string } | null;
  }>;
  ownedCompanies: Array<{ id: string; company_name: string }>;
  authData: {
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    confirmed_at: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  recentRfqs: Array<{ id: string; title: string; status: string; created_at: string }>;
  recentServices: Array<{ id: string; title: string; category: string; active: boolean; created_at: string }>;
  messagesSent: number;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserDetail();
  }, [id]);

  const loadUserDetail = async () => {
    try {
      const res = await fetch(`/api/admin?action=user-detail&id=${id}`);
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to load user');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'User not found'}</p>
        <button onClick={() => router.push('/admin/users')}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>
      </div>
    );
  }

  const { profile, memberships, ownedCompanies, authData, recentRfqs, recentServices, messagesSent } = data;
  const activeMemberships = memberships.filter(m => m.status === 'active');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => router.push('/admin/users')}
        className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* ── Profile Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              (profile.full_name?.charAt(0) || profile.email.charAt(0)).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-white">
                {profile.full_name || 'No Name'}
              </h1>
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold border border-amber-500/30">
                  <ShieldAlert className="w-3 h-3" /> Super Admin
                </span>
              )}
              {profile.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                profile.user_type === 'engineer'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                <Briefcase className="w-3 h-3" /> {profile.user_type}
              </span>
              {profile.company_name && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                  <Building2 className="w-3 h-3" /> {profile.company_name}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#003D82]/20 text-[#5B9BD5] rounded-full text-xs font-medium">
                🪙 {profile.token_balance ?? 0} tokens
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/profiles/${profile.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Profile
            </Link>
            <Link href={`/messages?with=${profile.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#003D82] hover:bg-[#002960] text-white rounded-lg text-xs font-medium transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Link>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-400 leading-relaxed border-t border-gray-700 pt-4">{profile.bio}</p>
        )}
      </motion.div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Account Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-500" /> Account Details
            </h2>
            <dl className="space-y-3 text-sm">
              {[
                { label: 'User ID', value: profile.id, mono: true },
                { label: 'Joined', value: formatDate(profile.created_at), icon: Calendar },
                { label: 'Last Sign In', value: formatDate(authData?.last_sign_in_at ?? null), icon: Clock },
                { label: 'Email Verified', value: authData?.email_confirmed_at ? formatDate(authData.email_confirmed_at) : 'Not verified', icon: authData?.email_confirmed_at ? CheckCircle2 : XCircle },
                { label: 'Phone', value: authData?.phone || '—', icon: Phone },
                { label: 'Messages Sent', value: `${messagesSent}`, icon: MessageSquare },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center">
                  <dt className="text-gray-500 flex items-center gap-1.5">
                    {row.icon && <row.icon className="w-3.5 h-3.5" />}{row.label}
                  </dt>
                  <dd className={`text-gray-200 ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Owned Companies */}
          {ownedCompanies.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Owned Companies
              </h2>
              <div className="space-y-2">
                {ownedCompanies.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-750 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-white font-medium text-sm">{c.company_name}</span>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">Owner</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Company Memberships */}
          {activeMemberships.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Team Memberships
              </h2>
              <div className="space-y-2">
                {activeMemberships.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-750 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        m.role === 'owner' ? 'bg-amber-500/20' :
                        m.role === 'admin' ? 'bg-blue-500/20' : 'bg-gray-600'
                      }`}>
                        {m.role === 'owner' ? <Star className="w-4 h-4 text-amber-400" /> :
                         m.role === 'admin' ? <Shield className="w-4 h-4 text-blue-400" /> :
                         <User className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">
                          {m.company?.company_name || 'Unknown Company'}
                        </span>
                        <p className="text-gray-500 text-xs">{m.role} · joined {new Date(m.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      m.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                      m.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-600 text-gray-400'
                    }`}>{m.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent RFQs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" /> Recent RFQs
            </h2>
            {recentRfqs.length === 0 ? (
              <p className="text-gray-500 text-sm">No RFQs posted</p>
            ) : (
              <div className="space-y-2">
                {recentRfqs.map(rfq => (
                  <Link key={rfq.id} href={`/rfq/${rfq.id}`} target="_blank"
                    className="flex items-center justify-between p-3 bg-gray-750 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                        {rfq.title}
                      </p>
                      <p className="text-gray-500 text-xs">{new Date(rfq.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      rfq.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                      rfq.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      rfq.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{rfq.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Services (engineers only) */}
          {profile.user_type === 'engineer' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" /> Recent Services
              </h2>
              {recentServices.length === 0 ? (
                <p className="text-gray-500 text-sm">No services listed</p>
              ) : (
                <div className="space-y-2">
                  {recentServices.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between p-3 bg-gray-750 rounded-xl border border-gray-700">
                      <div>
                        <p className="text-white text-sm font-medium">{svc.title}</p>
                        <p className="text-gray-500 text-xs">{svc.category}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        svc.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>{svc.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* All memberships including pending/removed */}
          {memberships.filter(m => m.status !== 'active').length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" /> Other Memberships
              </h2>
              <div className="space-y-2">
                {memberships.filter(m => m.status !== 'active').map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-750 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      {m.status === 'invited' ? <Mail className="w-4 h-4 text-yellow-400" /> :
                       m.status === 'removed' ? <XCircle className="w-4 h-4 text-red-400" /> :
                       <Clock className="w-4 h-4 text-gray-400" />}
                      <span className="text-gray-300 text-sm">{m.company?.company_name || 'Unknown'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      m.status === 'invited' ? 'bg-yellow-500/20 text-yellow-400' :
                      m.status === 'removed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-600 text-gray-400'
                    }`}>{m.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}