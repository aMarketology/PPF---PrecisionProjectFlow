'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Search, Building2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';

interface Company {
  id: string;
  company_name: string;
  tagline: string;
  description: string;
  website: string;
  city: string;
  state: string;
  specialties: string[];
  certifications: string[];
  verified: boolean;
  is_claimed: boolean;
  verification_status: string;
}

export default function ClaimCompanyPage() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [claimReason, setClaimReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    checkUser();
    loadCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = companies.filter(company =>
        company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchQuery, companies]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('verified', true)
      .eq('is_claimed', false)
      .order('company_name');

    if (data) {
      setCompanies(data);
      setFilteredCompanies(data);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to claim a company');
      return;
    }

    if (!selectedCompany) {
      setError('Please select a company to claim');
      return;
    }

    if (claimReason.trim().length < 50) {
      setError('Please provide at least 50 characters explaining why you should be granted access');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Insert claim request
      const { error: claimError } = await supabase
        .from('company_claims')
        .insert({
          company_id: selectedCompany.id,
          user_id: user.id,
          claim_reason: claimReason,
          status: 'pending'
        });

      if (claimError) throw claimError;

      // Update company status to pending
      const { error: updateError } = await supabase
        .from('company_profiles')
        .update({ verification_status: 'pending' })
        .eq('id', selectedCompany.id);

      if (updateError) throw updateError;

      setSubmitted(true);
      setSelectedCompany(null);
      setClaimReason('');
      loadCompanies(); // Refresh list

    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Authentication Required</h1>
            <p className="text-lg text-slate-600 mb-8">
              You must be logged in to claim a company profile.
            </p>
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
            >
              Log In
            </a>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Claim Request Submitted!</h1>
            <p className="text-lg text-slate-600 mb-8">
              Your claim request has been submitted for review. Our team will verify your information and get back to you within 2-3 business days.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-2xl mx-auto mb-8">
              <h3 className="font-semibold text-slate-900 mb-3">What happens next?</h3>
              <ol className="text-left text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">1.</span>
                  <span>Our team reviews your claim request and verifies your identity</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">2.</span>
                  <span>We may contact you for additional verification documents</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">3.</span>
                  <span>Once approved, you'll gain full access to manage the company profile</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">4.</span>
                  <span>You can then connect Stripe, list products, and start receiving orders</span>
                </li>
              </ol>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
              >
                Claim Another Company
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Claim Your Company Profile
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Find your company in our marketplace and request access to manage its profile, products, and orders.
              </p>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by company name, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {filteredCompanies.length} unclaimed {filteredCompanies.length === 1 ? 'company' : 'companies'} available
            </p>
          </motion.div>

          {/* Companies Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {filteredCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                  selectedCompany?.id === company.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedCompany(company)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {company.company_name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">{company.tagline}</p>
                    <p className="text-sm text-slate-500">
                      {company.city}, {company.state}
                    </p>
                  </div>
                  {company.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {company.description}
                </p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {company.specialties.slice(0, 3).map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                    {company.specialties.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                        +{company.specialties.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  className={`w-full py-2 rounded-lg font-semibold transition-all ${
                    selectedCompany?.id === company.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {selectedCompany?.id === company.id ? 'Selected' : 'Select to Claim'}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Claim Form */}
          {selectedCompany && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Claim {selectedCompany.company_name}
              </h2>

              <form onSubmit={handleClaimSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Why should you be granted access to this company profile?
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    rows={6}
                    required
                    placeholder="Please explain your relationship to this company (e.g., employee, owner, authorized representative). Include your position, how long you've been with the company, and why you need access to manage this profile. Minimum 50 characters."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {claimReason.length} / 50 characters minimum
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Verification Required</h4>
                      <p className="text-sm text-blue-800">
                        Our team will review your claim and may request additional documentation such as:
                        business email verification, employee ID, business license, or authorization letter.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompany(null);
                      setClaimReason('');
                      setError('');
                    }}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || claimReason.length < 50}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Claim Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Empty State */}
          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No companies found</h3>
              <p className="text-slate-500">
                Try adjusting your search or check back later for new listings.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
