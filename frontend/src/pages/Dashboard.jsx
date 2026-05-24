// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  Vote, Calendar, CheckCircle, Bell, Eye, 
  TrendingUp, Users, Clock, AlertCircle, Receipt 
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    active_elections: 0,
    upcoming_elections: 0,
    completed_elections: 0,
    total_votes: 0
  })
  const [recentElections, setRecentElections] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchRecentElections()
    fetchNotifications()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Try to get dashboard stats
      const response = await api.get('/dashboard/stats')
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.log('Dashboard stats endpoint not available yet')
      // Set default values
      setStats({
        active_elections: 0,
        upcoming_elections: 0,
        completed_elections: 0,
        total_votes: 0
      })
    }
  }

  const fetchRecentElections = async () => {
    try {
      const response = await api.get('/elections')
      if (response.data.success) {
        const elections = response.data.data || response.data.elections || []
        setRecentElections(elections.slice(0, 5))
      }
    } catch (error) {
      console.log('Failed to fetch elections:', error)
      setRecentElections([])
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications')
      if (response.data.success) {
        setNotifications(response.data.data || [])
      }
    } catch (error) {
      console.log('Failed to fetch notifications:', error)
      setNotifications([])
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name?.split(' ')[0] || 'User'}</h1>
        <p className="text-blue-100 mt-1">
          Membership: {user?.membership_number || 'N/A'} | District: {user?.district || 'N/A'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Elections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_elections || 0}</p>
            </div>
            <Vote className="h-8 w-8 text-green-500" />
          </div>
          <Link to="/elections" className="mt-4 text-sm text-blue-600 hover:underline inline-block">
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Upcoming Elections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming_elections || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Elections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed_elections || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
            <Bell className="h-8 w-8 text-purple-500" />
          </div>
          <Link to="/notifications" className="mt-4 text-sm text-blue-600 hover:underline inline-block">
            View all →
          </Link>
        </div>
      </div>

      {/* Recent Elections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Elections</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentElections.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No elections available at the moment.
            </div>
          ) : (
            recentElections.map((election) => (
              <div key={election.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{election.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {election.start_date && new Date(election.start_date).toLocaleDateString()} - 
                      {election.end_date && new Date(election.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/elections/${election.id}`}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Link to="/elections" className="text-sm text-blue-600 hover:underline">
            View all elections →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/elections"
            className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">View Elections</span>
          </Link>
          <Link
            to="/results"
            className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <span className="text-sm font-medium text-gray-700">View Results</span>
          </Link>
          <Link
            to="/my-receipts"
            className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Receipt className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">My Receipts</span>
          </Link>
          <Link
            to="/profile"
            className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Profile Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard