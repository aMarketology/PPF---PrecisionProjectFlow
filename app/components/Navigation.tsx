'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, User, LogOut, Settings, Briefcase, Package, MessageSquare, Bell, Search, X, Coins, Layers, Shield } from 'lucide-react'
import { getUser, signOut } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ services: any[]; engineers: any[] }>({ services: [], engineers: [] })
  const [searchLoading, setSearchLoading] = useState(false)

  // Debounced live search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults({ services: [], engineers: [] }); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const supabase = createClient()
        const q = searchQuery.trim().toLowerCase()
        const [{ data: svcs }, { data: engs }] = await Promise.all([
          supabase.from('services')
            .select('id, title, category, price, images')
            .eq('active', true)
            .or(`title.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
            .limit(4),
          supabase.from('profiles')
            .select('id, full_name, company_name, avatar_url, location')
            .eq('user_type', 'engineer')
            .or(`full_name.ilike.%${q}%,company_name.ilike.%${q}%,bio.ilike.%${q}%`)
            .limit(3),
        ])
        setSearchResults({ services: svcs || [], engineers: engs || [] })
      } catch { /* silent */ } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults({ services: [], engineers: [] })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    closeSearch()
    window.location.href = `/marketplace?q=${encodeURIComponent(searchQuery.trim())}`
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUser()
        setUser(userData)
        if (userData?.id) {
          loadUnreadCount(userData.id)
          subscribeToUnread(userData.id)
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  async function loadUnreadCount(userId: string) {
    try {
      const supabase = createClient()
      // Get all conversation IDs this user is part of
      const { data: convs } = await supabase
        .from('user_conversations')
        .select('id')
        .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`)
      if (!convs || convs.length === 0) { setUnreadCount(0); return }
      const convIds = convs.map(c => c.id)
      const { count } = await supabase
        .from('user_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', userId)
      setUnreadCount(count ?? 0)
    } catch (e) {
      console.error('loadUnreadCount:', e)
    }
  }

  function subscribeToUnread(userId: string) {
    const supabase = createClient()
    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_messages' }, () => {
        loadUnreadCount(userId)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_messages' }, () => {
        loadUnreadCount(userId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        closeSearch()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-gray-100 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav Links + Search + Bell */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/" className="flex-shrink-0 mr-1">
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center">
                <Image
                  src="/Precision Project Flow Engineering Marketplace.png"
                  alt="Precision Project Flow"
                  width={90}
                  height={36}
                  className="h-9 w-auto"
                />
              </motion.div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-0.5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Marketplace', href: '/marketplace' },
                { label: 'RFQ Feed', href: '/rfq' },
                { label: 'Companies', href: '/companies' },
                { label: 'Blog', href: '/blog' },
                { label: 'Messages', href: '/messages' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    href={item.href}
                    className="px-2.5 py-2 text-sm font-medium rounded-lg transition-all text-gray-600 hover:text-[#003D82] hover:bg-blue-50 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Center/Right: Search + Bell + User */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            {/* ── Search ── */}
            <div ref={searchRef} className="relative">
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.form
                    key="search-open"
                    initial={{ width: 32, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 32, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSearchSubmit}
                    className="flex items-center bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg overflow-visible"
                  >
                    <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search services, engineers..."
                      className="flex-1 px-2 py-2 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                    />
                    {searchQuery ? (
                      <button type="button" onClick={() => setSearchQuery('')} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button type="button" onClick={closeSearch} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Results dropdown */}
                    <AnimatePresence>
                      {searchQuery.trim() && (searchLoading || searchResults.services.length > 0 || searchResults.engineers.length > 0) && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] w-80"
                        >
                          {searchLoading ? (
                            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                              <div className="w-3.5 h-3.5 border-2 border-[#003D82] border-t-transparent rounded-full animate-spin" />
                              Searching...
                            </div>
                          ) : (
                            <>
                              {searchResults.services.length > 0 && (
                                <div>
                                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Services</div>
                                  {searchResults.services.map(s => (
                                    <Link key={s.id} href={`/marketplace/service/${s.id}`} onClick={closeSearch}
                                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors group">
                                      <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                        {s.images?.[0] ? <img src={s.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#003D82] to-[#0066C0]" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#003D82]">{s.title}</p>
                                        <p className="text-xs text-gray-400 truncate">{s.category} · ${Number(s.price).toLocaleString()}</p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                              {searchResults.engineers.length > 0 && (
                                <div>
                                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50">Engineers</div>
                                  {searchResults.engineers.map(e => (
                                    <Link key={e.id} href={`/profiles/${e.id}`} onClick={closeSearch}
                                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors group">
                                      {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#003D82] to-[#0066C0] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">{(e.full_name || 'E').charAt(0).toUpperCase()}</div>}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#003D82]">{e.full_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{e.company_name || e.location || 'Engineer'}</p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              )}
                              <div className="border-t border-gray-100">
                                <button type="submit" className="w-full px-4 py-2.5 text-sm text-[#003D82] font-semibold hover:bg-blue-50 transition-colors text-left flex items-center gap-2">
                                  <Search className="w-3.5 h-3.5" /> See all results for &ldquo;{searchQuery}&rdquo;
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.form>
                ) : (
                  <motion.button
                    key="search-icon"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={openSearch}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    title="Search"
                  >
                    <Search className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* ── Notification Bell ── */}
            {user && (
              <Link href="/activity" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Activity Feed">
                <Bell className="w-5 h-5 text-gray-500" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )}
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User Menu Dropdown */}
            <motion.div
              ref={userMenuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              {user ? (
                <>
                  <motion.button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium text-sm px-3 py-1.5 rounded-lg transition-all min-w-[140px]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {user.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="truncate max-w-[140px]">{user.profile?.full_name || 'User'}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </motion.button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-slate-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {user.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{user.profile?.full_name || 'User'}</p>
                              {user.profile?.company_name && (
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                  {user.profile.company_name}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                            {user.profile?.user_type === 'engineer' ? 'Vendor' : 'Supplier'}
                          </span>
                        </div>
                        <div className="py-2">
                          {user.profile?.user_type === 'engineer' && (
                            <Link
                              href="/dashboard/engineer"
                              className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-[#003D82] to-[#005BB5] text-white hover:from-[#002960] hover:to-[#003D82] transition-colors font-medium mx-2 rounded-lg mb-2"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <Briefcase className="h-4 w-4" />
                              <span>Engineer Dashboard</span>
                            </Link>
                          )}
                          <Link
                            href={user.profile?.user_type === 'engineer' ? '/dashboard/engineer' : '/dashboard/client'}
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Briefcase className="h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            <span>Profile & Settings</span>
                          </Link>
                          <Link
                            href="/messages"
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Messages</span>
                            {unreadCount > 0 && (
                              <span className="ml-auto min-w-[20px] h-5 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/my-listings"
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Layers className="h-4 w-4" />
                            <span>My Listings</span>
                          </Link>
                          {user.profile?.is_admin && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-2.5 text-amber-700 hover:bg-amber-50 transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <Shield className="h-4 w-4" />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                          <Link
                            href="/tokens"
                            className="flex items-center gap-3 px-4 py-2.5 text-yellow-700 hover:bg-yellow-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span>Buy Tokens</span>
                          </Link>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={async () => {
                              await signOut()
                              setUser(null)
                              setUserMenuOpen(false)
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                // Signed Out - Get Started & Log In Buttons
                <div className="flex items-center gap-2">
                  <Link href="/get-started">
                    <motion.button
                      className="flex items-center gap-1.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Get Started
                    </motion.button>
                  </Link>

                  <Link href="/login">
                    <motion.button
                      className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-lg transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Log In
                    </motion.button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden flex flex-col gap-1.5 z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              className={`w-6 h-0.5 transition-all ${
                scrolled ? 'bg-gray-900' : 'bg-gray-900'
              }`}
              animate={{
                rotate: mobileMenuOpen ? 45 : 0,
                y: mobileMenuOpen ? 8 : 0,
              }}
            />
            <motion.div
              className={`w-6 h-0.5 transition-all ${
                scrolled ? 'bg-gray-900' : 'bg-gray-900'
              }`}
              animate={{
                opacity: mobileMenuOpen ? 0 : 1,
              }}
            />
            <motion.div
              className={`w-6 h-0.5 transition-all ${
                scrolled ? 'bg-gray-900' : 'bg-gray-900'
              }`}
              animate={{
                rotate: mobileMenuOpen ? -45 : 0,
                y: mobileMenuOpen ? -8 : 0,
              }}
            />
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 bg-white/95 backdrop-blur-lg rounded-lg mt-4 shadow-xl">
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Marketplace', href: '/marketplace' },
                  { label: 'RFQ Feed', href: '/rfq' },
                  { label: 'Companies', href: '/companies' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Messages', href: '/messages' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="block px-4 py-3 text-gray-900 hover:bg-blue-50 hover:text-blue-600 transition font-medium rounded"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                
                {user ? (
                  // Signed In Mobile Menu
                  <>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg mx-2">
                      <p className="font-semibold text-gray-900">{user.profile?.full_name || 'User'}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {user.profile?.user_type === 'engineer' ? 'Engineer' : 'Client'}
                      </span>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-3 text-gray-900 hover:bg-blue-50 hover:text-blue-600 transition font-medium rounded"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile & Settings</span>
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center gap-3 px-4 py-3 text-gray-900 hover:bg-blue-50 hover:text-blue-600 transition font-medium rounded"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button
                      onClick={async () => {
                        await signOut()
                        setUser(null)
                        setMobileMenuOpen(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 transition font-medium rounded"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  // Signed Out Mobile Menu
                  <>
                    <div className="px-4 pt-2 space-y-2">
                      <Link
                        href="/signup"
                        className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center font-semibold px-6 py-3 rounded-lg transition shadow-md"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                      <Link
                        href="/login"
                        className="block w-full bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 text-center font-semibold px-6 py-3 rounded-lg transition"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Log In
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
