'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createClient } from '@/lib/supabase/client';
import { Loader, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import CheckoutForm from './CheckoutForm';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image_url: string | null;
  company_profiles: {
    company_name: string;
  };
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeCheckout();
  }, [productId]);

  const initializeCheckout = async () => {
    try {
      setLoading(true);

      // Check if user is logged in
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Please login to continue');
        router.push(`/login?redirect=/checkout/${productId}`);
        return;
      }

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          company_profiles (
            company_name
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (productError || !productData) {
        toast.error('Product not found');
        router.push('/marketplace/products');
        return;
      }

      setProduct(productData);

      // Create payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
    } catch (error: any) {
      console.error('Error initializing checkout:', error);
      toast.error(error.message || 'Failed to initialize checkout');
      router.push(`/marketplace/product/${productId}`);
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
          <p className="text-slate-400">Preparing your checkout...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product || !clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#1e293b',
        colorText: '#f1f5f9',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Back Button */}
        <Link 
          href={`/marketplace/product/${productId}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Product
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary - Left Side */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sticky top-4"
            >
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
              
              {/* Product Info */}
              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-700">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {product.company_profiles.company_name}
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                    {product.category}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span>{formatPrice(product.price, product.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Processing Fee</span>
                  <span>Included</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(product.price, product.currency)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-700/50 rounded-lg p-3">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </motion.div>
          </div>

          {/* Payment Form - Right Side */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>
              
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm 
                  productId={productId}
                  amount={product.price}
                  currency={product.currency}
                />
              </Elements>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
