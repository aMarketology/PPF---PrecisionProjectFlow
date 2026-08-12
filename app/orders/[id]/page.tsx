'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { getUser } from '@/app/actions/auth';
import { useRouter, useParams } from 'next/navigation';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  FileText,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  Download,
  MessageSquare,
  ArrowLeft,
  MapPin,
} from 'lucide-react';

interface OrderDetail {
  id: string;
  order_number: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  platform_fee: number;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  buyer_notes: string | null;
  company_notes: string | null;
  shipping_carrier: string | null;
  shipping_tracking: string | null;
  shipping_label_url: string | null;
  shipping_address: any;
  estimated_delivery: string | null;
  products: {
    id: string;
    name: string;
    description: string;
    category: string;
    delivery_time_days: number;
    image_url: string | null;
  };
  company_profiles: {
    id: string;
    company_name: string;
    email: string;
    phone: string;
    website: string | null;
    city: string | null;
    state: string | null;
  };
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [params.id]);

  const loadOrderDetails = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        router.push('/login');
        return;
      }
      setUser(userData);

      // Fetch order details
      const { data: orderData, error } = await supabase
        .from('product_orders')
        .select(`
          *,
          products (
            id,
            name,
            description,
            category,
            delivery_time_days,
            image_url
          ),
          company_profiles (
            id,
            company_name,
            email,
            phone,
            website,
            city,
            state
          )
        `)
        .eq('id', params.id)
        .eq('buyer_id', userData.id)
        .single();

      if (error || !orderData) {
        console.error('Error fetching order:', error);
        router.push('/orders');
        return;
      }

      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order details:', error);
      router.push('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pending';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    const configs: Record<string, any> = {
      pending_payment: {
        icon: Clock,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        label: 'Pending Payment',
      },
      paid: {
        icon: CheckCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Paid',
      },
      in_progress: {
        icon: Package,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'In Progress',
      },
      shipped: {
        icon: Truck,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Shipped',
      },
      delivered: {
        icon: Truck,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'Delivered',
      },
      completed: {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Completed',
      },
    };
    return configs[status] || configs.paid;
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return null;
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  // Timeline data
  const timeline = [
    {
      status: 'created',
      label: 'Order Created',
      timestamp: order.created_at,
      completed: true,
    },
    {
      status: 'paid',
      label: 'Payment Confirmed',
      timestamp: order.paid_at,
      completed: !!order.paid_at,
    },
    {
      status: 'in_progress',
      label: 'Work In Progress',
      timestamp: null, // We can add this field later
      completed: ['in_progress', 'delivered', 'completed'].includes(order.status),
    },
    {
      status: 'delivered',
      label: 'Delivered',
      timestamp: order.delivered_at,
      completed: !!order.delivered_at,
    },
    {
      status: 'completed',
      label: 'Completed',
      timestamp: order.completed_at,
      completed: !!order.completed_at,
    },
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.push('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Orders</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Details</h1>
                <p className="text-gray-600">Order #{order.order_number}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bg}`}>
                <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Order Timeline
                </h2>
                <div className="space-y-4">
                  {timeline.map((step, index) => (
                    <div key={step.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        {index < timeline.length - 1 && (
                          <div
                            className={`w-0.5 h-12 ${
                              step.completed ? 'bg-green-200' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <p className={`font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        <p className="text-sm text-gray-500">
                          {step.timestamp ? formatDate(step.timestamp) : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Product Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Product Details
                </h2>
                <div className="flex gap-6">
                  {order.products.image_url ? (
                    <img
                      src={order.products.image_url}
                      alt={order.product_name}
                      className="w-32 h-32 object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Package className="w-16 h-16 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {order.product_name}
                    </h3>
                    <p className="text-gray-600 mb-3">{order.products.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {order.products.category}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {order.products.delivery_time_days} days delivery
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Shipping & Tracking */}
              {(order.shipping_carrier || order.shipping_tracking || order.shipped_at) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Shipping & Tracking
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {order.shipping_carrier && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Carrier</p>
                        <p className="font-bold text-gray-900">{order.shipping_carrier}</p>
                      </div>
                    )}
                    {order.shipping_tracking && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tracking Number</p>
                        <p className="font-mono font-bold text-[#003D82]">{order.shipping_tracking}</p>
                      </div>
                    )}
                    {order.shipped_at && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shipped On</p>
                        <p className="font-semibold text-gray-900">{formatDate(order.shipped_at)}</p>
                      </div>
                    )}
                    {order.estimated_delivery && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Est. Delivery</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(order.estimated_delivery + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                  {order.shipping_label_url && (
                    <a
                      href={order.shipping_label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" /> View Shipping Label
                    </a>
                  )}
                </motion.div>
              )}

              {/* Payment Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Payment Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Product Price:</span>
                    <span className="font-medium">{formatPrice(order.product_price)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Quantity:</span>
                    <span className="font-medium">× {order.quantity}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee:</span>
                    <span className="font-medium">{formatPrice(order.platform_fee)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total Paid:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                  {order.paid_at && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span>Paid on {formatDate(order.paid_at)}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Notes */}
              {order.buyer_notes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-blue-50 rounded-2xl p-6"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">Your Notes:</h3>
                  <p className="text-gray-700">{order.buyer_notes}</p>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Seller Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Seller
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {order.company_profiles.company_name}
                    </h3>
                    {(order.company_profiles.city || order.company_profiles.state) && (
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {order.company_profiles.city}, {order.company_profiles.state}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {order.company_profiles.email && (
                      <a
                        href={`mailto:${order.company_profiles.email}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Mail className="w-4 h-4" />
                        {order.company_profiles.email}
                      </a>
                    )}
                    {order.company_profiles.phone && (
                      <a
                        href={`tel:${order.company_profiles.phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Phone className="w-4 h-4" />
                        {order.company_profiles.phone}
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/messages?user=${order.company_profiles.id}`)}
                    className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Contact Seller
                  </button>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-2">
                  <button className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Invoice
                  </button>
                  <button className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5" />
                    Request Support
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
