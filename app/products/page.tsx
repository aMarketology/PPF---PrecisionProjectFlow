'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Package, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  DollarSign,
  Clock,
  AlertCircle,
  Loader
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { toast } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  delivery_time_days: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

export default function ProductsManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's company
      const { data: company } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) {
        toast.error('No company profile found');
        router.push('/profile');
        return;
      }

      setCompanyId(company.id);

      // Check Stripe Connect status
      const stripeResponse = await fetch(`/api/stripe/connect?companyId=${company.id}`);
      const stripeData = await stripeResponse.json();
      
      const connected = stripeData.connected && 
                       stripeData.account?.charges_enabled && 
                       stripeData.account?.payouts_enabled;
      setStripeConnected(connected);
      setCheckingStripe(false);

      // Load products
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(productsData || []);

    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      toast.success(currentStatus ? 'Product hidden' : 'Product activated');
      loadProducts();

    } catch (error: any) {
      console.error('Error toggling product:', error);
      toast.error('Failed to update product status');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      loadProducts();

    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const formatPrice = (price: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format(price);
  };

  if (loading || checkingStripe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Show Stripe Connect warning if not connected
  if (!stripeConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Stripe Connect Required
                </h1>
                
                <p className="text-gray-600 mb-6">
                  You need to connect your Stripe account before you can list products and accept payments.
                </p>

                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Why Stripe Connect?</h3>
                  <ul className="space-y-2 text-left text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Receive payments directly to your bank account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Secure payment processing with automatic payouts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>10% platform fee on each transaction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Full transparency and detailed reporting</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/settings/payments"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  Connect Stripe Account
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Products & Services</h1>
              <p className="text-gray-600">Manage your product listings and offerings</p>
            </div>
            <Link
              href="/products/create"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add New Product
            </Link>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No products yet</h2>
              <p className="text-gray-600 mb-6">
                Start selling by creating your first product or service listing.
              </p>
              <Link
                href="/products/create"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Product
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden ${
                    !product.is_active ? 'opacity-60' : ''
                  }`}
                >
                  {/* Product Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-blue-600" />
                    )}
                    {!product.is_active && (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                        Hidden
                      </div>
                    )}
                    {product.is_active && (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        Active
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {product.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Price</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </div>
                      
                      {product.delivery_time_days && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Delivery</span>
                          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {product.delivery_time_days} days
                          </span>
                        </div>
                      )}

                      {product.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Category</span>
                          <span className="text-sm font-medium text-gray-900">
                            {product.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/products/edit/${product.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => toggleProductStatus(product.id, product.is_active)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-all"
                      >
                        {product.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Show
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
