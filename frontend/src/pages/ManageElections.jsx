// frontend/src/pages/ManageElections.jsx
import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Calendar, Clock, Users, FileText, Edit2, Trash2, Play, Pause, CheckCircle, XCircle, Plus, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const ManageElections = () => {
  const { user } = useAuthStore()
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedElection, setSelectedElection] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  // Form state for create/edit - Use UPPERCASE for all enum values
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    election_type: 'NATIONAL',
    status: 'SCHEDULED',
    is_active: false
  })

  // Helper function to format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Fetch elections with vote counts
  const fetchElections = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/elections')
      if (response.data.success) {
        const electionsData = response.data.data || response.data.elections || []
        
        // Fetch vote counts for each election
        const electionsWithVotes = await Promise.all(
          electionsData.map(async (election) => {
            try {
              // Try to get vote stats for this election
              const statsResponse = await api.get(`/admin/votes/stats?election_id=${election.id}`)
              const voteCount = statsResponse.data?.data?.total_votes || 0
              return { ...election, votes_count: voteCount }
            } catch (error) {
              // If vote stats endpoint fails, default to 0
              console.log(`Could not fetch votes for election ${election.id}:`, error)
              return { ...election, votes_count: 0 }
            }
          })
        )
        
        setElections(electionsWithVotes)
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error)
      toast.error('Failed to load elections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchElections()
  }, [])

  // Create election
  const handleCreateElection = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        election_type: formData.election_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'SCHEDULED'
      }
      const response = await api.post('/admin/elections', payload)
      if (response.data.success) {
        toast.success('Election created successfully')
        setShowCreateModal(false)
        resetForm()
        fetchElections()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create election')
    }
  }

  // Update election
  const handleUpdateElection = async (e) => {
    e.preventDefault()
    try {
      const response = await api.put(`/admin/elections/${selectedElection.id}`, formData)
      if (response.data.success) {
        toast.success('Election updated successfully')
        setShowEditModal(false)
        setSelectedElection(null)
        resetForm()
        fetchElections()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update election')
    }
  }

  // Delete election with force delete support
  const handleDeleteElection = async (electionId, title, voteCount) => {
    console.log('Deleting election:', { electionId, title, voteCount });
    
    // If election has votes, ask for force delete confirmation
    if (voteCount > 0) {
      const confirmed = window.confirm(
        `⚠️ WARNING: This election has ${voteCount} vote(s) cast!\n\n` +
        `Deleting "${title}" will permanently remove:\n` +
        `- ${voteCount} vote(s)\n` +
        `- All candidates\n` +
        `- All positions\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Click OK to force delete anyway, or Cancel to keep the election.`
      );
      
      if (!confirmed) return;
      
      try {
        const response = await api.delete(`/admin/elections/${electionId}?force=true`);
        if (response.data.success) {
          toast.success(response.data.message);
          fetchElections();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete election');
      }
    } else {
      // Normal delete for elections with no votes
      const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This will also delete all associated candidates.`);
      if (!confirmed) return;
      
      try {
        const response = await api.delete(`/admin/elections/${electionId}`);
        if (response.data.success) {
          toast.success('Election deleted successfully');
          fetchElections();
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete election');
      }
    }
  }

  // Change election status
  const handleStatusChange = async (electionId, newStatus) => {
    try {
      const response = await api.patch(`/admin/elections/${electionId}/status`, {
        status: newStatus
      })
      if (response.data.success) {
        toast.success(`Election ${newStatus.toLowerCase()} successfully`)
        fetchElections()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      election_type: 'NATIONAL',
      status: 'SCHEDULED',
      is_active: false
    })
  }

  const editElection = (election) => {
    setSelectedElection(election)
    // Format dates for datetime-local input (YYYY-MM-DDThh:mm)
    const startDate = election.start_date ? election.start_date.slice(0, 16) : ''
    const endDate = election.end_date ? election.end_date.slice(0, 16) : ''
    setFormData({
      title: election.title,
      description: election.description || '',
      start_date: startDate,
      end_date: endDate,
      election_type: election.election_type?.toUpperCase() || 'NATIONAL',
      status: election.status?.toUpperCase() || 'SCHEDULED',
      is_active: election.is_active || false
    })
    setShowEditModal(true)
  }

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      CLOSED: 'bg-purple-100 text-purple-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getElectionTypeLabel = (type) => {
    const labels = {
      NATIONAL: 'National Election',
      STATE: 'State Election',
      DISTRICT: 'District Election',
      CHAPTER: 'Chapter Election',
      COMMITTEE: 'Committee Election'
    }
    return labels[type] || type
  }

  const filteredElections = elections.filter(election => 
    filterStatus === 'all' || election.status === filterStatus.toUpperCase()
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Elections</h1>
          <p className="text-gray-600 mt-1">Create, edit, and manage election events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Election
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Elections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredElections.map((election) => (
          <div key={election.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{election.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(election.status)}`}>
                  {election.status}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {election.description || 'No description provided'}
              </p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Start: {formatDateTime(election.start_date)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>End: {formatDateTime(election.end_date)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Type: {getElectionTypeLabel(election.election_type)}</span>
                </div>
                {election.votes_count > 0 && (
                  <div className="flex items-center text-sm text-orange-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{election.votes_count} vote(s) cast</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => editElection(election)}
                  className="flex-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center justify-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                
                {election.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange(election.id, 'SCHEDULED')}
                    className="flex-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center justify-center gap-1"
                  >
                    <Play className="h-3 w-3" />
                    Schedule
                  </button>
                )}
                
                {election.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleStatusChange(election.id, 'ACTIVE')}
                    className="flex-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded-md hover:bg-green-100 flex items-center justify-center gap-1"
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </button>
                )}
                
                {election.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange(election.id, 'PAUSED')}
                    className="flex-1 px-3 py-1.5 text-sm text-yellow-600 bg-yellow-50 rounded-md hover:bg-yellow-100 flex items-center justify-center gap-1"
                  >
                    <Pause className="h-3 w-3" />
                    Pause
                  </button>
                )}
                
                {election.status === 'PAUSED' && (
                  <button
                    onClick={() => handleStatusChange(election.id, 'ACTIVE')}
                    className="flex-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded-md hover:bg-green-100 flex items-center justify-center gap-1"
                  >
                    <Play className="h-3 w-3" />
                    Resume
                  </button>
                )}
                
                {(election.status === 'ACTIVE' || election.status === 'SCHEDULED') && (
                  <button
                    onClick={() => handleStatusChange(election.id, 'CLOSED')}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Close
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteElection(election.id, election.title, election.votes_count || 0)}
                  className="flex-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 flex items-center justify-center gap-1"
                  title={election.votes_count > 0 ? "Force delete election with votes" : "Delete election"}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredElections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No elections found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create your first election
          </button>
        </div>
      )}

      {/* Create Election Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Create New Election</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateElection} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ICAN National Election 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the election..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election Type *</label>
                <select
                  required
                  value={formData.election_type}
                  onChange={(e) => setFormData({...formData, election_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NATIONAL">National Election</option>
                  <option value="STATE">State Election</option>
                  <option value="DISTRICT">District Election</option>
                  <option value="CHAPTER">Chapter Election</option>
                  <option value="COMMITTEE">Committee Election</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Create Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Election Modal */}
      {showEditModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Election</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateElection} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election Type *</label>
                <select
                  required
                  value={formData.election_type}
                  onChange={(e) => setFormData({...formData, election_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NATIONAL">National Election</option>
                  <option value="STATE">State Election</option>
                  <option value="DISTRICT">District Election</option>
                  <option value="CHAPTER">Chapter Election</option>
                  <option value="COMMITTEE">Committee Election</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageElections