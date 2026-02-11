'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, FileText, Building2, User, Mail, Calendar } from 'lucide-react';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';

interface ClaimRequest {
  id: string;
  company_id: string;
  user_id: string;
  claim_reason: string;
  status: string;
  created_at: string;
  company: {
    company_name: string;
    city: string;
    state: string;
    website: string;
  };
  user: {
    email: string;
    profile: {
      full_name: string;
    };
  };
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    checkAdmin();
    loadClaims();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    // TODO: Add actual admin check in production
  };

  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_claims')
        .select(`
          id,
          company_id,
          user_id,
          claim_reason,
          status,
          created_at,
          company:company_profiles(company_name, city, state, website),
          user:profiles(full_name, email:auth.users(email))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Format the data since Supabase returns nested objects
      const formattedData = data?.map((claim: any) => ({
        ...claim,
        company: claim.company,
        user: {
          email: claim.user?.email || 'Unknown',
          profile: {
            full_name: claim.user?.full_name || 'Unknown User'
          }
        }
      })) || [];

      setClaims(formattedData);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClaim = async (claimId: string, newStatus: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) return;

      // Update claim status
      const { error: claimError } = await supabase
        .from('company_claims')
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (claimError) throw claimError;

      if (newStatus === 'approved') {
        // Update company profile
        const { error: companyError } = await supabase
          .from('company_profiles')
          .update({
            is_claimed: true,
            claimed_at: new Date().toISOString(),
            claimed_by: claim.user_id,
            verification_status: 'verified'
          })
          .eq('id', claim.company_id);

        if (companyError) throw companyError;
      } else {
        // If rejected, set company back to unclaimed
        const { error: companyError } = await supabase
          .from('company_profiles')
          .update({
            verification_status: 'rejected'
          })
          .eq('id', claim.company_id);

        if (companyError) throw companyError;
      }

      // Reload claims
      await loadClaims();
      setSelectedClaim(null);
      setAdminNotes('');

      alert(`Claim ${newStatus}! ${newStatus === 'approved' ? 'User now has access to manage this company.' : 'Company set back to unclaimed status.'}`);
    } catch (error: any) {
      alert('Error updating claim: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Denied</h1>
            <p className="text-lg text-slate-600">You must be logged in as an administrator to view this page.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const approvedClaims = claims.filter(c => c.status === 'approved');
  const rejectedClaims = claims.filter(c => c.status === 'rejected');

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Company Claim Review</h1>
            <p className="text-lg text-slate-600">
              Review and approve company ownership claims
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-600">{pendingClaims.length}</p>
                </div>
                <Clock className="w-12 h-12 text-amber-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{approvedClaims.length}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{rejectedClaims.length}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Claims List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">All Claims</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-slate-600">Loading claims...</p>
              </div>
            ) : claims.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-600">No claims to review yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-bold text-slate-900">
                            {claim.company?.company_name || 'Unknown Company'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            claim.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            claim.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {claim.status}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User className="w-4 h-4" />
                            <span>{claim.user?.profile?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4" />
                            <span>{claim.user?.email || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="w-4 h-4" />
                            <span>{claim.company?.city}, {claim.company?.state}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-2">
                          {claim.claim_reason}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Review Claim</h2>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {selectedClaim.company?.company_name}
                </h3>
                <p className="text-sm text-slate-600">
                  {selectedClaim.company?.city}, {selectedClaim.company?.state}
                </p>
                {selectedClaim.company?.website && (
                  <a
                    href={selectedClaim.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedClaim.company.website}
                  </a>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Claimant Information</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700">Name:</span>
                    <span className="text-slate-900">{selectedClaim.user?.profile?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700">Email:</span>
                    <span className="text-slate-900">{selectedClaim.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700">Submitted:</span>
                    <span className="text-slate-900">
                      {new Date(selectedClaim.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Claim Reason */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Justification</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedClaim.claim_reason}</p>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedClaim.status === 'pending' && (
                <div>
                  <label className="block text-lg font-bold text-slate-900 mb-3">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Add any notes about this decision..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              )}

              {/* Actions */}
              {selectedClaim.status === 'pending' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleUpdateClaim(selectedClaim.id, 'approved')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {processing ? 'Processing...' : 'Approve Claim'}
                  </button>
                  <button
                    onClick={() => handleUpdateClaim(selectedClaim.id, 'rejected')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    {processing ? 'Processing...' : 'Reject Claim'}
                  </button>
                </div>
              )}

              {selectedClaim.status !== 'pending' && (
                <div className={`p-4 rounded-lg ${
                  selectedClaim.status === 'approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <p className="font-semibold">
                    This claim has been {selectedClaim.status}.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </>
  );
}
