import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Vote, UserCheck, Activity, Shield, PlusCircle } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, pending: 0, suspended: 0 },
    elections: { total: 0, active: 0, scheduled: 0, completed: 0 },
    candidates: { total: 0, approved: 0, pending: 0 }
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        navigate('/login')
        return
      }

      // Fetch stats
      const statsResponse = await api.get('/admin/dashboard/stats')
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data)
      }

      setLoading(false)
    } catch (error) {
      console.error('Dashboard error:', error)
      toast.error('Failed to load dashboard data')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={() => navigate('/admin/elections/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Create Election</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{stats.users.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <span className="text-green-600 font-semibold">{stats.users.active}</span>
              <p className="text-gray-500">Active</p>
            </div>
            <div>
              <span className="text-yellow-600 font-semibold">{stats.users.pending}</span>
              <p className="text-gray-500">Pending</p>
            </div>
            <div>
              <span className="text-red-600 font-semibold">{stats.users.suspended}</span>
              <p className="text-gray-500">Suspended</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 w-full text-blue-600 text-sm hover:underline"
          >
            Manage Users →
          </button>
        </div>

        {/* Elections Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Elections</p>
              <p className="text-2xl font-bold">{stats.elections.total}</p>
            </div>
            <Vote className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <span className="text-green-600 font-semibold">{stats.elections.active}</span>
              <p className="text-gray-500">Active</p>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">{stats.elections.scheduled}</span>
              <p className="text-gray-500">Scheduled</p>
            </div>
            <div>
              <span className="text-gray-600 font-semibold">{stats.elections.completed}</span>
              <p className="text-gray-500">Completed</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/elections')}
            className="mt-4 w-full text-blue-600 text-sm hover:underline"
          >
            Manage Elections →
          </button>
        </div>

        {/* Candidates Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Candidates</p>
              <p className="text-2xl font-bold">{stats.candidates.total}</p>
            </div>
            <UserCheck className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
            <div>
              <span className="text-green-600 font-semibold">{stats.candidates.approved}</span>
              <p className="text-gray-500">Approved</p>
            </div>
            <div>
              <span className="text-yellow-600 font-semibold">{stats.candidates.pending}</span>
              <p className="text-gray-500">Pending</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/candidates')}
            className="mt-4 w-full text-blue-600 text-sm hover:underline"
          >
            Manage Candidates →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm">Manage Users</p>
          </button>
          <button
            onClick={() => navigate('/admin/elections/create')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <PlusCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Create Election</p>
          </button>
          <button
            onClick={() => navigate('/admin/candidates')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <UserCheck className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-sm">Manage Candidates</p>
          </button>
          <button
            onClick={() => navigate('/audit')}
            className="p-4 border rounded-lg hover:bg-gray-50 text-center"
          >
            <Activity className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm">Audit Logs</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard