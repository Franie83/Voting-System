// frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Users, Vote, UserCheck, Activity, Shield, PlusCircle, 
  Calendar, FileText, Settings, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, TrendingUp, Award, Eye, 
  Receipt, Search, Trash2, Upload, X, Moon, Sun
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import BulkUploadAssociationMembers from '../components/BulkUploadAssociationMembers'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, pending: 0, suspended: 0 },
    elections: { total: 0, active: 0, scheduled: 0, completed: 0, cancelled: 0 },
    candidates: { total: 0, approved: 0, pending: 0, rejected: 0 },
    votes: { total: 0, turnout: 0 }
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentElections, setRecentElections] = useState([])
  const [showResetModal, setShowResetModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [resetElectionId, setResetElectionId] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [voteStats, setVoteStats] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
    fetchRecentActivities()
    fetchRecentElections()
    fetchVoteStats()
    
    // Check initial dark mode
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('darkMode', isDark)
    setIsDarkMode(isDark)
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        navigate('/login')
        return
      }

      const statsResponse = await api.get('/admin/dashboard/stats')
      if (statsResponse.data.success) {
        const data = statsResponse.data.data
        setStats({
          users: data.users || { total: 0, active: 0, pending: 0, suspended: 0 },
          elections: data.elections || { total: 0, active: 0, scheduled: 0, completed: 0, cancelled: 0 },
          candidates: data.candidates || { total: 0, approved: 0, pending: 0, rejected: 0 },
          votes: data.votes || { total: 0, turnout: 0 }
        })
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/admin/activities/recent')
      if (response.data.success) {
        setRecentActivities(response.data.data || [])
      }
    } catch (error) {
      console.log('Recent activities endpoint not available yet')
      setRecentActivities([])
    }
  }

  const fetchRecentElections = async () => {
    try {
      const response = await api.get('/admin/elections/recent')
      if (response.data.success) {
        setRecentElections(response.data.data || [])
      }
    } catch (error) {
      console.log('Recent elections endpoint not available yet')
      setRecentElections([])
    }
  }

  const fetchVoteStats = async () => {
    try {
      const response = await api.get('/admin/votes/stats')
      if (response.data.success) {
        setVoteStats(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch vote stats:', error)
    }
  }

  const handleResetVotes = async () => {
    if (resetConfirm !== 'RESET VOTES') {
      toast.error('Please type "RESET VOTES" to confirm')
      return
    }
    
    try {
      const response = await api.post('/admin/votes/reset', {
        election_id: resetElectionId || null,
        confirm: true
      })
      
      if (response.data.success) {
        toast.success(response.data.message)
        setShowResetModal(false)
        setResetConfirm('')
        setResetElectionId('')
        fetchVoteStats()
        fetchDashboardData()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset votes')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'text-green-600 bg-green-100',
      scheduled: 'text-blue-600 bg-blue-100',
      completed: 'text-gray-600 bg-gray-100',
      cancelled: 'text-red-600 bg-red-100',
      paused: 'text-yellow-600 bg-yellow-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage elections, users, and monitor system activity</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/elections/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Create Election</span>
          </Link>
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          <Link
            to="/system/settings"
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.total}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-green-600 dark:text-green-400 font-semibold">{stats.users.active}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Active</span>
            </div>
            <div>
              <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{stats.users.pending}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Pending</span>
            </div>
            <div>
              <span className="text-red-600 dark:text-red-400 font-semibold">{stats.users.suspended}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Suspended</span>
            </div>
          </div>
          <Link
            to="/admin/users"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            Manage Users →
          </Link>
        </div>

        {/* Elections Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Vote className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.elections.total}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Elections</h3>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-green-600 dark:text-green-400 font-semibold">{stats.elections.active}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Active</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{stats.elections.scheduled}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Scheduled</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">{stats.elections.completed}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Completed</span>
            </div>
          </div>
          <Link
            to="/admin/elections"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            Manage Elections →
          </Link>
        </div>

        {/* Candidates Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.candidates.total}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Candidates</h3>
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-green-600 dark:text-green-400 font-semibold">{stats.candidates.approved}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Approved</span>
            </div>
            <div>
              <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{stats.candidates.pending}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Pending</span>
            </div>
            <div>
              <span className="text-red-600 dark:text-red-400 font-semibold">{stats.candidates.rejected || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Rejected</span>
            </div>
          </div>
          <Link
            to="/admin/candidates"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            Manage Candidates →
          </Link>
        </div>

        {/* Voter Turnout Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.votes?.turnout || 0}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Voter Turnout</h3>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full" 
                style={{ width: `${stats.votes?.turnout || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {stats.votes?.total || 0} votes cast
            </p>
          </div>
          <Link
            to="/results"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            View Results →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <Link
            to="/admin/users"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Users</p>
          </Link>
          <Link
            to="/admin/elections/create"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <PlusCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Create Election</p>
          </Link>
          <Link
            to="/admin/elections"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Elections</p>
          </Link>
          <Link
            to="/admin/candidates"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <UserCheck className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Candidates</p>
          </Link>
          <Link
            to="/verify"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Search className="h-6 w-6 mx-auto mb-2 text-teal-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Verify Vote</p>
          </Link>
          {/* Bulk Upload Button - NEW */}
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk Upload</p>
          </button>
          {/* Reset Votes Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Trash2 className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reset Votes</p>
          </button>
          <Link
            to="/monitoring/audit"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <Activity className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Audit Logs</p>
          </Link>
          <Link
            to="/results"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
          >
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Results</p>
          </Link>
        </div>
      </div>

      {/* Recent Elections & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Elections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Recent Elections
          </h2>
          {recentElections.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No elections created yet</p>
          ) : (
            <div className="space-y-3">
              {recentElections.map((election) => (
                <div key={election.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{election.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(election.start_date).toLocaleDateString()} - {new Date(election.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(election.status)}`}>
                      {election.status}
                    </span>
                    <Link
                      to={`/admin/elections/${election.id}/edit`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/admin/elections"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            View All Elections →
          </Link>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            Recent Activities
          </h2>
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activities</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/monitoring/audit"
            className="mt-4 block text-center text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            View All Activities →
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm font-medium text-green-700 dark:text-green-400">API Status</span>
            <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
              <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Database</span>
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
              <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Last Backup</span>
            <span className="text-sm text-purple-700 dark:text-purple-400">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Votes Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-red-600">Reset Votes</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone!</p>
            </div>
            
            <div className="p-6 space-y-4">
              {voteStats && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current vote statistics:</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{voteStats.total_votes}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total votes cast by {voteStats.unique_voters} voters</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Election (Optional)
                </label>
                <select
                  value={resetElectionId}
                  onChange={(e) => setResetElectionId(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Elections</option>
                  {voteStats?.elections?.map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({e.votes} votes)</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type <span className="font-mono text-red-600">RESET VOTES</span> to confirm
                </label>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                  placeholder="RESET VOTES"
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="p-6 border-t dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false)
                  setResetConfirm('')
                  setResetElectionId('')
                }}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResetVotes}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reset Votes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal - NEW */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Upload Association Members</h2>
              <button 
                onClick={() => setShowBulkUploadModal(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <BulkUploadAssociationMembers 
                onComplete={() => {
                  setShowBulkUploadModal(false)
                  toast.success('Upload completed!')
                  fetchDashboardData()
                }}
                onClose={() => setShowBulkUploadModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard