'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Package,
  Clock,
  DollarSign,
  MapPin,
  Building2,
  ShoppingCart,
  CheckCircle,
  Globe,
  Mail,
  Phone,
  Loader
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  delivery_time_days: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  company_profiles: {
    id: string;
    company_name: string;
    description: string | null;
    city: string | null;
    state: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    specialties: string[] | null;
    logo_url: string | null;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          company_profiles (
            id,
            company_name,
            description,
            city,
            state,
            website,
            email,
            phone,
            specialties,
            logo_url
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Product not found');
        router.push('/marketplace/products');
        return;
      }

      setProduct(data);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
      router.push('/marketplace/products');
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

  const handleBuyNow = async () => {
    setPurchasing(true);
    
    // Check if user is logged in
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please login to purchase products');
      router.push(`/login?redirect=/marketplace/product/${productId}`);
      return;
    }

    // Redirect to checkout page
    router.push(`/checkout/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Back Button */}
        <Link 
          href="/marketplace/products"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-800">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-slate-600" />
                </div>
              )}
            </div>

            {/* Company Info Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-start gap-4">
                {product.company_profiles.logo_url ? (
                  <img
                    src={product.company_profiles.logo_url}
                    alt={product.company_profiles.company_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {product.company_profiles.company_name}
                  </h3>
                  
                  {product.company_profiles.description && (
                    <p className="text-slate-400 text-sm mb-3">
                      {product.company_profiles.description}
                    </p>
                  )}

                  {/* Company Details */}
                  <div className="space-y-2">
                    {product.company_profiles.city && product.company_profiles.state && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{product.company_profiles.city}, {product.company_profiles.state}</span>
                      </div>
                    )}
                    
                    {product.company_profiles.website && (
                      <a
                        href={product.company_profiles.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Visit Website</span>
                      </a>
                    )}
                    
                    {product.company_profiles.email && (
                      <a
                        href={`mailto:${product.company_profiles.email}`}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{product.company_profiles.email}</span>
                      </a>
                    )}
                    
                    {product.company_profiles.phone && (
                      <a
                        href={`tel:${product.company_profiles.phone}`}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{product.company_profiles.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Specialties */}
                  {product.company_profiles.specialties && product.company_profiles.specialties.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2">Specialties:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.company_profiles.specialties.map((specialty, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Category Badge */}
            <div>
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                {product.category}
              </span>
            </div>

            {/* Product Name */}
            <h1 className="text-4xl font-bold text-white leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-white">
                {formatPrice(product.price, product.currency)}
              </span>
              <span className="text-slate-400 text-lg">
                {product.currency.toUpperCase()}
              </span>
            </div>

            {/* Key Features */}
            <div className="flex flex-wrap gap-4">
              {product.delivery_time_days && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span>{product.delivery_time_days} days delivery</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Verified Company</span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Description
              </h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* What's Included Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                What's Included
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Professional engineering deliverables</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Detailed project documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Revisions as needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Direct communication with engineering team</span>
                </li>
              </ul>
            </div>

            {/* Purchase Button */}
            <div className="sticky bottom-0 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <button
                onClick={handleBuyNow}
                disabled={purchasing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
              >
                {purchasing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Buy Now - {formatPrice(product.price, product.currency)}
                  </>
                )}
              </button>
              
              <p className="text-center text-sm text-slate-400 mt-3">
                Secure payment powered by Stripe
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
