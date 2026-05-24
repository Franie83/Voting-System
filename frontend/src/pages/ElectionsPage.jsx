import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Vote, Clock, BarChart3, ChevronRight, Filter, RefreshCw } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ElectionsPage = () => {
  const { user } = useAuthStore()
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Check if user is admin - check both role field and the role value
  const userRole = user?.role?.toLowerCase() || ''
  const isAdmin = userRole === 'super_admin' || userRole === 'election_admin'

  useEffect(() => {
    console.log('=== ElectionsPage Debug ===')
    console.log('User object:', user)
    console.log('User role:', user?.role)
    console.log('Is admin:', isAdmin)
    fetchElections()
  }, [user])

  const fetchElections = async () => {
    setLoading(true)
    try {
      let response
      let url = ''
      
      // If user is admin, get all elections from admin endpoint
      if (isAdmin) {
        url = '/admin/elections'
        console.log('Fetching from admin endpoint:', url)
        response = await api.get(url)
      } else {
        // Regular user only sees active elections
        url = '/voting/elections/active'
        console.log('Fetching from voting endpoint:', url)
        response = await api.get(url)
      }
      
      console.log('API Response status:', response.status)
      console.log('API Response data:', response.data)
      
      if (response.data.success) {
        // Handle both response structures
        const electionsData = response.data.data || response.data.elections || []
        console.log('Elections loaded count:', electionsData.length)
        console.log('First election:', electionsData[0])
        setElections(electionsData)
      } else {
        console.error('API returned success false:', response.data)
        setElections([])
      }
    } catch (error) {
      console.error('Error fetching elections:', error)
      toast.error('Failed to load elections')
      setElections([])
    } finally {
      setLoading(false)
    }
  }

  const filteredElections = filter === 'all' 
    ? elections 
    : elections.filter(e => e.status?.toLowerCase() === filter.toLowerCase())

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading elections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Managing all elections' : 'View active elections'}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={fetchElections}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="input-field py-2 w-40 border rounded-lg px-3"
            >
              <option value="all">All Elections</option>
              <option value="active">Active</option>
              <option value="scheduled">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {elections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <Vote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No elections found</p>
          {isAdmin && (
            <Link 
              to="/admin/elections/create" 
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Election
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElections.map(election => (
            <ElectionCard key={election.id} election={election} />
          ))}
        </div>
      )}

      {elections.length > 0 && filteredElections.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No elections match the selected filter.</p>
        </div>
      )}
    </div>
  )
}

const ElectionCard = ({ election }) => {
  // Convert status to lowercase for display
  const status = (election.status?.toLowerCase() || 'unknown')
  
  // FIXED: Removed duplicate "scheduled" key
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    scheduled: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    closed: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  // Format election type for display
  const electionType = (election.election_type?.toLowerCase() || 'election')
  const displayType = electionType.charAt(0).toUpperCase() + electionType.slice(1)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{election.title}</h3>
          <p className="text-sm text-gray-500 capitalize">{displayType} Election</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
          {status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>
            {election.start_date ? new Date(election.start_date).toLocaleDateString() : 'TBD'} - 
            {election.end_date ? new Date(election.end_date).toLocaleDateString() : 'TBD'}
          </span>
        </div>
      </div>

      <Link 
        to={`/elections/${election.id}`}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        View Details
        <ChevronRight className="h-4 w-4 ml-1" />
      </Link>
    </div>
  )
}

export default ElectionsPage