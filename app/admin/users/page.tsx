'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  user_type: 'client' | 'engineer'
  company_name: string | null
  location: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'client' | 'engineer'>('all')

  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data)
      }
      setLoading(false)
    }

    loadUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || user.user_type === filterType
    
    return matchesSearch && matchesType
  })

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (!error) {
      setUsers(users.filter(u => u.id !== userId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Users</option>
          <option value="engineer">Engineers</option>
          <option value="client">Clients</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Engineers</p>
          <p className="text-2xl font-bold text-blue-400">{users.filter(u => u.user_type === 'engineer').length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Clients</p>
          <p className="text-2xl font-bold text-green-400">{users.filter(u => u.user_type === 'client').length}</p>
        </div>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="hover:bg-gray-700/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.full_name || 'No name'}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        user.user_type === 'engineer' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {user.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {user.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="text-blue-400 hover:text-blue-300 text-sm">
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
