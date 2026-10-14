'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  ExternalLink,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import StripeOnboardingSteps from '@/app/components/StripeOnboardingSteps';

interface StripeAccount {
  id: string;
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string | null;
  default_currency: string | null;
}

export default function PaymentsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's company
      const { data: companies } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!companies) {
        toast.error('No company profile found');
        return;
      }

      setCompanyId(companies.id);

      // Get Stripe account status
      const response = await fetch(`/api/stripe/connect?companyId=${companies.id}`);
      const data = await response.json();

      if (data.connected && data.account) {
        setStripeAccount(data.account);
      }

    } catch (error: any) {
      console.error('Error loading payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!companyId) return;

    setConnecting(true);
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          action: 'create_link'
        })
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create onboarding link');
      }

    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast.error(error.message || 'Failed to connect Stripe account');
      setConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!companyId) return;

    setRefreshing(true);
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          action: 'refresh_status'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account status updated');
        await loadPaymentSettings();
      } else {
        throw new Error(data.error || 'Failed to refresh status');
      }

    } catch (error: any) {
      console.error('Error refreshing status:', error);
      toast.error(error.message || 'Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
  };

  const isFullyOnboarded = stripeAccount?.charges_enabled && 
                           stripeAccount?.payouts_enabled && 
                           stripeAccount?.details_submitted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Settings</h1>
            <p className="text-gray-600">Manage your Stripe Connect account to receive payments</p>
          </div>

          {/* Step-by-step onboarding */}
          <StripeOnboardingSteps />

          {loading ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-2xl shadow-xl">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Stripe Account Status Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isFullyOnboarded ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {isFullyOnboarded ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <CreditCard className="w-6 h-6 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Stripe Connect</h2>
                      <p className="text-gray-600">
                        {stripeAccount ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {stripeAccount && (
                    <button
                      onClick={handleRefreshStatus}
                      disabled={refreshing}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                    >
                      {refreshing ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Refresh Status
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!stripeAccount ? (
                  /* Not Connected */
                  <div className="space-y-6">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Connect your Stripe account to start accepting payments
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Stripe Connect allows you to securely receive payments directly to your account. 
                        Your customers' payments will be processed through our platform, and funds will be 
                        automatically transferred to your Stripe account.
                      </p>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Secure payment processing</span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Automatic payouts to your bank account</span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>10% platform fee on each transaction</span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span>Full transparency and reporting</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleConnectStripe}
                      disabled={connecting}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {connecting ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Connect with Stripe
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Connected */
                  <div className="space-y-6">
                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl border-2 ${
                        stripeAccount.charges_enabled 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {stripeAccount.charges_enabled ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          )}
                          <span className="font-semibold text-gray-900">Charges</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {stripeAccount.charges_enabled ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border-2 ${
                        stripeAccount.payouts_enabled 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {stripeAccount.payouts_enabled ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          )}
                          <span className="font-semibold text-gray-900">Payouts</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {stripeAccount.payouts_enabled ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl border-2 ${
                        stripeAccount.details_submitted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {stripeAccount.details_submitted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          )}
                          <span className="font-semibold text-gray-900">Details</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {stripeAccount.details_submitted ? 'Submitted' : 'Incomplete'}
                        </p>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Account ID</p>
                          <p className="font-mono text-sm font-medium text-gray-900">
                            {stripeAccount.stripe_account_id}
                          </p>
                        </div>
                        {stripeAccount.country && (
                          <div>
                            <p className="text-sm text-gray-600">Country</p>
                            <p className="font-medium text-gray-900">
                              {stripeAccount.country.toUpperCase()}
                            </p>
                          </div>
                        )}
                        {stripeAccount.default_currency && (
                          <div>
                            <p className="text-sm text-gray-600">Currency</p>
                            <p className="font-medium text-gray-900">
                              {stripeAccount.default_currency.toUpperCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Needed */}
                    {!isFullyOnboarded && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Action Required
                            </h3>
                            <p className="text-gray-700 mb-4">
                              Your Stripe account setup is incomplete. Please complete the onboarding 
                              process to start accepting payments.
                            </p>
                            <button
                              onClick={handleConnectStripe}
                              disabled={connecting}
                              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all"
                            >
                              {connecting ? (
                                <>
                                  <Loader className="w-5 h-5 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  Complete Setup
                                  <ExternalLink className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {isFullyOnboarded && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Ready to Accept Payments!
                            </h3>
                            <p className="text-gray-700">
                              Your Stripe account is fully set up and you can now accept payments. 
                              Create products and start selling on the marketplace!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Platform Fee Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fees & Payouts</h2>
                    <p className="text-gray-600">How payments work</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Platform Fee</h3>
                      <p className="text-gray-600">
                        We charge a <strong>10% platform fee</strong> on each successful transaction. 
                        This covers payment processing, platform maintenance, and support.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Automatic Payouts</h3>
                      <p className="text-gray-600">
                        Funds are automatically transferred to your bank account according to Stripe's 
                        payout schedule (typically 2-7 business days).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Example</h3>
                      <p className="text-gray-600">
                        If a customer pays $100 for your service:<br />
                        • Platform fee: $10<br />
                        • You receive: $90
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
