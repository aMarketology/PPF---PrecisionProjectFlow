'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { getUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  Send,
  Search,
  Filter,
  Download,
  Eye,
  MessageSquare,
  MoreVertical,
  Calendar,
  BarChart3,
  X,
  Loader2,
} from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Order {
  id: string;
  order_number: string;
  product_name: string;
  product_price: number;
  total_amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  buyer_id: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
  products: {
    name: string;
    category: string;
  };
}

const statusConfig = {
  paid: { color: 'bg-blue-100 text-blue-700', label: 'Paid' },
  in_progress: { color: 'bg-purple-100 text-purple-700', label: 'In Progress' },
  shipped: { color: 'bg-indigo-100 text-indigo-700', label: 'Shipped' },
  delivered: { color: 'bg-orange-100 text-orange-700', label: 'Delivered' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  refunded: { color: 'bg-gray-100 text-gray-700', label: 'Refunded' },
};

export default function SalesDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Shipping modal
  const [shipModal, setShipModal] = useState<{ open: boolean; orderId: string; orderNumber: string }>({ open: false, orderId: '', orderNumber: '' });
  const [shipForm, setShipForm] = useState({ carrier: '', tracking: '', estDelivery: '' });
  const [shipping, setShipping] = useState(false);

  const openShipModal = (order: Order) => {
    setShipModal({ open: true, orderId: order.id, orderNumber: order.order_number });
    setShipForm({ carrier: '', tracking: '', estDelivery: '' });
  };

  const handleShip = async () => {
    if (!shipForm.carrier && !shipForm.tracking) {
      alert('Please enter at least a carrier or tracking number');
      return;
    }
    setShipping(true);
    try {
      const res = await fetch(`/api/orders/${shipModal.orderId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'shipped',
          shipping: {
            carrier: shipForm.carrier || null,
            tracking: shipForm.tracking || null,
            estimatedDelivery: shipForm.estDelivery || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ship order');
      setShipModal({ open: false, orderId: '', orderNumber: '' });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setShipping(false);
    }
  };

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthRevenue: 0,
    pendingPayouts: 0,
    totalOrders: 0,
    averageOrder: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        router.push('/login');
        return;
      }
      setUser(userData);

      // Get company profile
      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('owner_id', userData.id)
        .single();

      if (!companyData) {
        router.push('/profile');
        return;
      }
      setCompany(companyData);

      // Get all orders for this company's products
      const { data: ordersData, error } = await supabase
        .from('product_orders')
        .select(`
          *,
          profiles!product_orders_buyer_id_fkey (
            full_name,
            email,
            phone
          ),
          products (
            name,
            category
          )
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(ordersData || []);
        calculateStats(ordersData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const now = new Date();
    const thisMonth = ordersData.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === now.getMonth() && 
             orderDate.getFullYear() === now.getFullYear();
    });

    const completedOrders = ordersData.filter(
      o => !['cancelled', 'refunded'].includes(o.status)
    );

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + parseFloat((o.total_amount - o.platform_fee).toString()),
      0
    );

    const monthRevenue = thisMonth
      .filter(o => !['cancelled', 'refunded'].includes(o.status))
      .reduce((sum, o) => sum + parseFloat((o.total_amount - o.platform_fee).toString()), 0);

    const pendingPayouts = ordersData
      .filter(o => ['paid', 'in_progress', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + parseFloat((o.total_amount - o.platform_fee).toString()), 0);

    setStats({
      totalRevenue,
      monthRevenue,
      pendingPayouts,
      totalOrders: completedOrders.length,
      averageOrder: totalRevenue / (completedOrders.length || 1),
    });
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.order_number.toLowerCase().includes(term) ||
          o.product_name.toLowerCase().includes(term) ||
          o.profiles.full_name?.toLowerCase().includes(term) ||
          o.profiles.email?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Reload data
      await loadData();
      alert(data.message || 'Order status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update order status');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sales dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
            <p className="text-gray-600">{company?.company_name} - Manage your orders and revenue</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
          >
            {/* Total Revenue */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">All time earnings</p>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">This Month</span>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.monthRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Revenue in {new Date().toLocaleString('en-US', { month: 'long' })}</p>
            </div>

            {/* Pending Payouts */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pending</span>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.pendingPayouts)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Orders in progress</p>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Orders</span>
                <Package className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500 mt-1">Completed orders</p>
            </div>

            {/* Average Order */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Order</span>
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.averageOrder)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Average order value</p>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders, customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none"
                >
                  <option value="all">All Orders</option>
                  <option value="paid">Paid</option>
                  <option value="in_progress">In Progress</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Export Button */}
              <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
            </div>
          </motion.div>

          {/* Orders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No orders found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const statusStyle = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.paid;
                      const yourEarnings = parseFloat((order.total_amount - order.platform_fee).toString());

                      return (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{order.order_number}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {order.profiles.full_name || 'N/A'}
                              </div>
                              <div className="text-gray-500">{order.profiles.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{order.product_name}</div>
                              <div className="text-gray-500">{order.products.category}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-bold text-gray-900">{formatPrice(yourEarnings)}</div>
                              <div className="text-gray-500 text-xs">
                                (Customer paid: {formatPrice(order.total_amount)})
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.color}`}>
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/orders/sales/${order.id}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {order.status === 'paid' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'in_progress')}
                                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                >
                                  Start Work
                                </button>
                              )}
                              
                              {order.status === 'in_progress' && (
                                <button
                                  onClick={() => openShipModal(order)}
                                  className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1"
                                >
                                  <Truck className="w-3 h-3" /> Ship
                                </button>
                              )}
                              
                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'completed')}
                                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Shipping Modal ── */}
          {shipModal.open && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShipModal({ open: false, orderId: '', orderNumber: '' })}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">Ship Order</h2>
                    <p className="text-sm text-gray-500">{shipModal.orderNumber}</p>
                  </div>
                  <button onClick={() => setShipModal({ open: false, orderId: '', orderNumber: '' })} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Carrier</label>
                    <select value={shipForm.carrier} onChange={e => setShipForm(p => ({ ...p, carrier: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/20 outline-none">
                      <option value="">Select carrier...</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                      <option value="USPS">USPS</option>
                      <option value="DHL">DHL</option>
                      <option value="Freight">Freight / LTL</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tracking Number</label>
                    <input type="text" value={shipForm.tracking} onChange={e => setShipForm(p => ({ ...p, tracking: e.target.value }))}
                      placeholder="e.g. 1Z999AA10123456784"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/20 outline-none font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Delivery Date</label>
                    <input type="date" value={shipForm.estDelivery} onChange={e => setShipForm(p => ({ ...p, estDelivery: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/20 outline-none" />
                  </div>
                  <button onClick={handleShip} disabled={shipping || (!shipForm.carrier && !shipForm.tracking)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl disabled:opacity-50 transition-all text-base">
                    {shipping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {shipping ? 'Shipping...' : 'Mark as Shipped'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
