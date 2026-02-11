'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, 
  Filter, 
  Star, 
  Heart, 
  MapPin, 
  Clock, 
  DollarSign,
  ChevronDown,
  SlidersHorizontal,
  Loader
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  delivery_time_days: number;
  image_url: string;
  company_profiles: {
    id: string;
    company_name: string;
    city: string;
    state: string;
    is_verified: boolean;
  };
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            company_profiles (
              id,
              company_name,
              city,
              state,
              is_verified
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        setProducts(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Dummy image URLs for services
  const dummyImages = [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  ];


  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.company_profiles.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesLocation = selectedLocation === 'all' || 
                            product.company_profiles.state.toLowerCase() === selectedLocation.toLowerCase() ||
                            product.company_profiles.city.toLowerCase().includes(selectedLocation.toLowerCase());
      
      return matchesSearch && matchesCategory && matchesPrice && matchesLocation;
    });

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Already sorted by created_at from query
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, priceRange, sortBy, selectedLocation]);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  return (
    <>
      <Navigation />
      <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 min-h-screen pt-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Header */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Engineering Services Marketplace</h1>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `Browse ${products.length}+ professional services from real companies`}
            </p>
          </motion.div>

          {/* Search & Filter Bar */}
          <motion.div 
            className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl p-4 mb-6 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Main Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search engineering services, skills, or professionals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              
              <motion.button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all inline-flex items-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </motion.button>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">All Categories</option>
                {mockCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">All Locations</option>
                <option value="remote">Remote</option>
                <option value="usa">United States</option>
                <option value="europe">Europe</option>
                <option value="asia">Asia</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>

              <div className="flex items-center space-x-2 text-gray-700">
                <span className="text-sm">Price:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ''}
                  onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] || ''}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000])}
                  className="w-20 px-2 py-1 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-gray-200 pt-6 mt-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Price Range ($)
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Experience Level
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <option value="">All Levels</option>
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Delivery Time
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <option value="">Any Time</option>
                        <option value="1-3">1-3 days</option>
                        <option value="4-7">4-7 days</option>
                        <option value="1-2weeks">1-2 weeks</option>
                        <option value="2weeks+">2+ weeks</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results Counter */}
          <motion.div 
            className="flex items-center justify-between mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-gray-600">
              {loading ? 'Loading products...' : `Showing ${filteredProducts.length} of ${products.length} products`}
            </p>
          </motion.div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="h-10 w-10 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-9 gap-3">
            {filteredProducts.map((product, index) => (
              <Link key={product.id} href={`/marketplace/service/${product.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="group bg-white border border-gray-200 hover:border-blue-300 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-100 cursor-pointer h-full"
                  whileHover={{ y: -3, scale: 1.02 }}
                  style={{ aspectRatio: '5/4' }}
                >
                  <div className="h-full flex flex-col">
                    {/* Image Section */}
                    <div className="relative h-3/5 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Favorite Button */}
                      <motion.button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart 
                          className={`h-3 w-3 transition-colors ${
                            favorites.has(product.id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-600 hover:text-red-500'
                          }`}
                        />
                      </motion.button>

                      {/* Price Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                          ${(product.price / 100).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>

                      {/* Verified Badge */}
                      {product.company_profiles.is_verified && (
                        <div className="absolute bottom-2 right-2 flex items-center bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <Star className="h-3 w-3 text-blue-500 fill-current mr-1" />
                          <span className="text-xs font-medium text-gray-900">Verified</span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        
                        <div className="flex items-center mb-2">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-2">
                            <span className="text-white text-xs font-bold">
                              {product.company_profiles.company_name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600 truncate">{product.company_profiles.company_name}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{product.company_profiles.city}, {product.company_profiles.state}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{product.delivery_time_days}d</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                            {product.category.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
          )}

          {/* No Results */}
          {!loading && filteredProducts.length === 0 && (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No products found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or browse different categories to discover amazing services from real companies
              </p>
              <motion.button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange([0, 10000]);
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium inline-flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear all filters
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
