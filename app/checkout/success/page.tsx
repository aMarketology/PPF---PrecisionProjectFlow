'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Download, ArrowRight, Loader, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface OrderDetails {
  id: string;
  product: {
    name: string;
    description: string;
    image_url: string | null;
    company_profiles: {
      company_name: string;
      email: string;
    };
  };
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentIntentId = searchParams.get('payment_intent');
  const productId = searchParams.get('product_id');

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentIntentId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [paymentIntentId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch the unified ledger order by Stripe payment intent id.
      const { data: order, error: orderError } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Fetch product details (product orders carry a product lineage).
      let product: any = null;
      if (order.order_type === 'product') {
        const { data: p } = await supabase
          .from('products')
          .select(`name, description, image_url, company_profiles (company_name, email)`)
          .eq('id', productId)
          .single();
        product = p;
      }

      setOrder({
        id: order.id,
        product: product
          ? {
              name: product.name,
              description: product.description,
              image_url: product.image_url,
              company_profiles: product.company_profiles?.[0] ?? { company_name: 'Vendor', email: '' },
            }
          : { name: 'Order', description: '', image_url: null, company_profiles: { company_name: 'Vendor', email: '' } },
        amount: Number(order.total_amount),
        currency: order.currency,
        status: order.status,
        created_at: order.created_at,
      });

    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-slate-400">Loading your order...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 rounded-full mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            Thank you for your purchase
          </p>
          <p className="text-slate-400">
            Your order has been confirmed and the company has been notified.
          </p>
        </motion.div>

        {/* Order Details Card */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Order Details</h2>
            
            {/* Product Info */}
            <div className="flex gap-4 mb-6 pb-6 border-b border-slate-700">
              {order.product.image_url ? (
                <img
                  src={order.product.image_url}
                  alt={order.product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-500" />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg mb-1">
                  {order.product.name}
                </h3>
                <p className="text-sm text-slate-400 mb-2">
                  by {order.product.company_profiles.company_name}
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(order.amount, order.currency)}
                </p>
              </div>
            </div>

            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Order ID</p>
                <p className="text-slate-300 font-mono">{order.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Status</p>
                <p className="text-green-400 font-semibold capitalize">{order.status}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Payment Method</p>
                <p className="text-slate-300">Credit Card</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Date</p>
                <p className="text-slate-300">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* What Happens Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-4">What Happens Next?</h3>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p>The company has been notified of your purchase</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p>You'll receive a confirmation email shortly</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p>The company will contact you to begin work</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p>Track your order status in your dashboard</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/orders"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            View My Orders
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href="/marketplace/products"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue Shopping
          </Link>
        </motion.div>

        {/* Support Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12 text-slate-400 text-sm"
        >
          <p>Need help? Contact support or reach out to the company directly.</p>
          {order?.product.company_profiles.email && (
            <p className="mt-2">
              Company Email:{' '}
              <a
                href={`mailto:${order.product.company_profiles.email}`}
                className="text-blue-400 hover:text-blue-300"
              >
                {order.product.company_profiles.email}
              </a>
            </p>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
