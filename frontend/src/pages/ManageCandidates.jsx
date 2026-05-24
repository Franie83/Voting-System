// frontend/src/pages/ManageCandidates.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, UserCheck, Mail, Phone, MapPin, Search, Filter, X, Calendar, Users, ChevronDown, Save, Camera, Image as ImageIcon, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const ManageCandidates = () => {
  const [candidates, setCandidates] = useState([])
  const [elections, setElections] = useState([])
  const [users, setUsers] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [filterElection, setFilterElection] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [showNewPositionInput, setShowNewPositionInput] = useState(false)
  
  // Image states
  const [candidatePhoto, setCandidatePhoto] = useState(null)
  const [candidatePhotoPreview, setCandidatePhotoPreview] = useState(null)
  const [editCandidatePhoto, setEditCandidatePhoto] = useState(null)
  const [editCandidatePhotoPreview, setEditCandidatePhotoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const editFileInputRef = useRef(null)
  
  // User search dropdown states
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [editUserSearchTerm, setEditUserSearchTerm] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showEditUserDropdown, setShowEditUserDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editSelectedUser, setEditSelectedUser] = useState(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const dropdownRef = useRef(null)
  const editDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    election_id: '',
    user_id: '',
    position: '',
    manifesto: ''
  })

  const [editFormData, setEditFormData] = useState({
    election_id: '',
    user_id: '',
    position: '',
    manifesto: ''
  })

  useEffect(() => {
    fetchCandidates()
    fetchElections()
    fetchUsers()
    fetchPositions()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false)
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target)) {
        setShowEditUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/candidates')
      if (response.data.success) {
        const candidatesList = response.data.data || response.data.candidates || []
        
        // Fetch vote counts for each candidate using the dedicated endpoint
        const candidatesWithVotes = await Promise.all(
          candidatesList.map(async (candidate) => {
            try {
              // Use the dedicated vote-count endpoint
              const voteResponse = await api.get(`/admin/candidates/${candidate.id}/vote-count`)
              const voteCount = voteResponse.data?.data?.vote_count || 0
              return { ...candidate, votes_count: voteCount }
            } catch (error) {
              console.log(`Could not fetch votes for candidate ${candidate.id}:`, error)
              return { ...candidate, votes_count: 0 }
            }
          })
        )
        
        setCandidates(candidatesWithVotes)
        console.log('Candidates loaded:', candidatesWithVotes.length)
      } else {
        setCandidates([])
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
      toast.error('Failed to load candidates')
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  const fetchElections = async () => {
    try {
      const response = await api.get('/admin/elections')
      console.log('Elections API response:', response.data)
      
      if (response.data.success) {
        // Handle both possible response structures
        let electionsData = response.data.data || response.data.elections || []
        
        // Ensure each election has an id and title
        electionsData = electionsData.map(election => ({
          id: election.id,
          title: election.title || 'Unnamed Election'
        }))
        
        console.log('Processed elections:', electionsData)
        setElections(electionsData)
      } else {
        console.error('Failed to fetch elections:', response.data.message)
        setElections([])
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error)
      toast.error('Failed to load elections')
      setElections([])
    }
  }

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await api.get('/admin/users/all')
      if (response.data.success) {
        setUsers(response.data.data || response.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const fetchPositions = async () => {
    try {
      const response = await api.get('/admin/positions')
      if (response.data.success && response.data.data) {
        setPositions(response.data.data)
      } else {
        // Fallback to default positions
        const defaultPositions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Public Relations Officer']
        setPositions(defaultPositions.map(p => ({ id: p, title: p })))
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error)
      // Fallback to default positions
      const defaultPositions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Public Relations Officer']
      setPositions(defaultPositions.map(p => ({ id: p, title: p })))
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setCandidatePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCandidatePhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setEditCandidatePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditCandidatePhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (candidateId, photoFile) => {
    if (!photoFile) return null
    const formData = new FormData()
    formData.append('photo', photoFile)
    try {
      const response = await api.post(`/admin/candidates/${candidateId}/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data.photo_url
    } catch (error) {
      console.error('Failed to upload photo:', error)
      return null
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.membership_number?.toLowerCase().includes(searchLower)
    )
  })

  const filteredEditUsers = users.filter(user => {
    const searchLower = editUserSearchTerm.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.membership_number?.toLowerCase().includes(searchLower)
    )
  })

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setFormData({ ...formData, user_id: user.email })
    setUserSearchTerm(`${user.full_name} (${user.email})`)
    setShowUserDropdown(false)
  }

  const handleEditSelectUser = (user) => {
    setEditSelectedUser(user)
    setEditFormData({ ...editFormData, user_id: user.email })
    setEditUserSearchTerm(`${user.full_name} (${user.email})`)
    setShowEditUserDropdown(false)
  }

  const handleUserInputChange = (e) => {
    const value = e.target.value
    setUserSearchTerm(value)
    setFormData({ ...formData, user_id: value })
    setSelectedUser(null)
    setShowUserDropdown(true)
  }

  const handleEditUserInputChange = (e) => {
    const value = e.target.value
    setEditUserSearchTerm(value)
    setEditFormData({ ...editFormData, user_id: value })
    setEditSelectedUser(null)
    setShowEditUserDropdown(true)
  }

  const handleAddNewPosition = () => {
    if (newPosition.trim()) {
      const newPos = newPosition.trim()
      setFormData({ ...formData, position: newPos })
      setPositions([...positions, { id: newPos, title: newPos }])
      setNewPosition('')
      setShowNewPositionInput(false)
      toast.success(`Position "${newPos}" added`)
    }
  }

  const handleCreateCandidate = async (e) => {
    e.preventDefault()
    
    if (!formData.election_id) {
      toast.error('Please select an election')
      return
    }
    if (!formData.user_id) {
      toast.error('Please select a candidate')
      return
    }
    if (!formData.position) {
      toast.error('Please enter a position')
      return
    }
    
    try {
      const payload = {
        election_id: formData.election_id,
        user_id: formData.user_id,
        position: formData.position,
        manifesto: formData.manifesto
      }
      const response = await api.post('/admin/candidates', payload)
      if (response.data.success) {
        const candidateId = response.data.data?.id
        if (candidateId && candidatePhoto) {
          await uploadPhoto(candidateId, candidatePhoto)
        }
        toast.success('Candidate registered successfully')
        setShowCreateModal(false)
        resetForm()
        fetchCandidates()
      } else {
        toast.error(response.data.message || 'Failed to create candidate')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create candidate'
      toast.error(message)
    }
  }

  const handleUpdateCandidate = async (e) => {
    e.preventDefault()
    
    if (!editFormData.election_id) {
      toast.error('Please select an election')
      return
    }
    if (!editFormData.user_id) {
      toast.error('Please select a candidate')
      return
    }
    if (!editFormData.position) {
      toast.error('Please enter a position')
      return
    }
    
    try {
      const payload = {
        election_id: editFormData.election_id,
        user_id: editFormData.user_id,
        position: editFormData.position,
        manifesto: editFormData.manifesto
      }
      const response = await api.put(`/admin/candidates/${editingCandidate.id}`, payload)
      if (response.data.success) {
        if (editCandidatePhoto) {
          await uploadPhoto(editingCandidate.id, editCandidatePhoto)
        }
        toast.success('Candidate updated successfully')
        setShowEditModal(false)
        resetEditForm()
        fetchCandidates()
      } else {
        toast.error(response.data.message || 'Failed to update candidate')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update candidate'
      toast.error(message)
    }
  }

  const handleApproveCandidate = async (candidateId) => {
    try {
      const response = await api.patch(`/admin/candidates/${candidateId}/approve`)
      if (response.data.success) {
        toast.success('Candidate approved successfully')
        fetchCandidates()
      } else {
        toast.error(response.data.message || 'Failed to approve candidate')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve candidate')
    }
  }

  const handleRejectCandidate = async (candidateId) => {
    try {
      const response = await api.patch(`/admin/candidates/${candidateId}/reject`)
      if (response.data.success) {
        toast.success('Candidate rejected')
        fetchCandidates()
      } else {
        toast.error(response.data.message || 'Failed to reject candidate')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject candidate')
    }
  }

  // UPDATED: Delete handler with immediate UI refresh
  const handleDeleteCandidate = async (candidateId, candidateName) => {
    console.log('Deleting candidate:', { candidateId, candidateName });
    
    // First, check the actual vote count from the server
    try {
      const voteCheck = await api.get(`/admin/candidates/${candidateId}/vote-count`);
      const actualVoteCount = voteCheck.data?.data?.vote_count || 0;
      console.log(`Candidate ${candidateName} has ${actualVoteCount} votes`);
      
      if (actualVoteCount > 0) {
        const confirmed = window.confirm(
          `⚠️ WARNING: This candidate has ${actualVoteCount} vote(s) cast!\n\n` +
          `Deleting "${candidateName}" will permanently remove ${actualVoteCount} vote(s).\n\n` +
          `This action CANNOT be undone!\n\n` +
          `Click OK to force delete anyway, or Cancel to keep the candidate.`
        );
        
        if (!confirmed) return;
        
        try {
          const response = await api.delete(`/admin/candidates/${candidateId}?force=true`);
          if (response.data.success) {
            toast.success(response.data.message);
            // Immediately remove from UI
            setCandidates(prevCandidates => prevCandidates.filter(c => c.id !== candidateId));
            // Refresh in background to ensure consistency
            setTimeout(() => fetchCandidates(), 500);
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete candidate');
        }
      } else {
        // Normal delete for candidates with no votes
        const confirmed = window.confirm(`Are you sure you want to delete "${candidateName}"? This action cannot be undone.`);
        if (!confirmed) return;
        
        try {
          const response = await api.delete(`/admin/candidates/${candidateId}`);
          if (response.data.success) {
            toast.success('Candidate deleted successfully');
            // Immediately remove from UI
            setCandidates(prevCandidates => prevCandidates.filter(c => c.id !== candidateId));
            // Refresh in background to ensure consistency
            setTimeout(() => fetchCandidates(), 500);
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete candidate');
        }
      }
    } catch (error) {
      console.error('Error checking vote count:', error);
      // Fallback to regular delete if vote check fails
      const confirmed = window.confirm(`Are you sure you want to delete "${candidateName}"?`);
      if (!confirmed) return;
      
      try {
        const response = await api.delete(`/admin/candidates/${candidateId}`);
        if (response.data.success) {
          toast.success('Candidate deleted successfully');
          // Immediately remove from UI
          setCandidates(prevCandidates => prevCandidates.filter(c => c.id !== candidateId));
          // Refresh in background to ensure consistency
          setTimeout(() => fetchCandidates(), 500);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete candidate');
      }
    }
  }

  const handleEditClick = (candidate) => {
    setEditingCandidate(candidate)
    setEditFormData({
      election_id: candidate.election_id || '',
      user_id: candidate.user?.email || candidate.user_id || '',
      position: candidate.position || '',
      manifesto: candidate.manifesto || ''
    })
    const displayName = candidate.user?.full_name 
      ? `${candidate.user.full_name} (${candidate.user.email})` 
      : candidate.user?.email || candidate.user_id || ''
    setEditUserSearchTerm(displayName)
    setEditSelectedUser(candidate.user || null)
    setEditCandidatePhotoPreview(candidate.photo_url || null)
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      election_id: '',
      user_id: '',
      position: '',
      manifesto: ''
    })
    setUserSearchTerm('')
    setSelectedUser(null)
    setShowUserDropdown(false)
    setCandidatePhoto(null)
    setCandidatePhotoPreview(null)
    setNewPosition('')
    setShowNewPositionInput(false)
  }

  const resetEditForm = () => {
    setEditFormData({
      election_id: '',
      user_id: '',
      position: '',
      manifesto: ''
    })
    setEditUserSearchTerm('')
    setEditSelectedUser(null)
    setEditingCandidate(null)
    setShowEditUserDropdown(false)
    setEditCandidatePhoto(null)
    setEditCandidatePhotoPreview(null)
  }

  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase() || 'PENDING'
    const styles = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
      WITHDRAWN: 'bg-gray-100 text-gray-800'
    }
    return styles[statusUpper] || 'bg-gray-100 text-gray-800'
  }

  const getStatusDisplay = (status) => {
    const statusUpper = status?.toUpperCase() || 'PENDING'
    return statusUpper.charAt(0) + statusUpper.slice(1).toLowerCase()
  }

  const getElectionTitle = (candidate) => {
    // First check if candidate has election_title directly from API
    if (candidate.election_title) {
      return candidate.election_title
    }
    // Otherwise look it up from the elections array
    if (!candidate.election_id) return 'No Election'
    const election = elections.find(e => e.id === candidate.election_id)
    return election?.title || 'Unknown Election'
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesElection = filterElection === 'all' || candidate.election_id === filterElection
    const matchesStatus = filterStatus === 'all' || candidate.status?.toUpperCase() === filterStatus.toUpperCase()
    const matchesSearch = searchTerm === '' || 
      (candidate.user?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.user?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.position?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    return matchesElection && matchesStatus && matchesSearch
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Manage Candidates</h1>
          <p className="text-gray-600 mt-1">Register and manage election candidates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Register Candidate
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterElection}
            onChange={(e) => setFilterElection(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Elections</option>
            {elections.map(election => (
              <option key={election.id} value={election.id}>{election.title}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Election</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No candidates found
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {candidate.photo_url ? (
                        <img src={candidate.photo_url} alt={candidate.user?.full_name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.user?.full_name || candidate.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.user?.email || candidate.email || 'No email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getElectionTitle(candidate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {candidate.position || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${candidate.votes_count > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {candidate.votes_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(candidate.status)}`}>
                        {getStatusDisplay(candidate.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(candidate.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {candidate.status?.toUpperCase() === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveCandidate(candidate.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectCandidate(candidate.id)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditClick(candidate)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id, candidate.user?.full_name || candidate.name || 'Candidate')}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                        title="Delete candidate"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Candidate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Register Candidate</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCandidate} className="px-6 py-4 space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {candidatePhotoPreview ? (
                      <img src={candidatePhotoPreview} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full text-white hover:bg-blue-700"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Upload candidate photo (max 5MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election *</label>
                <select
                  required
                  value={formData.election_id}
                  onChange={(e) => setFormData({...formData, election_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Election</option>
                  {elections.length === 0 ? (
                    <option value="" disabled>Loading elections...</option>
                  ) : (
                    elections.map(election => (
                      <option key={election.id} value={election.id}>{election.title}</option>
                    ))
                  )}
                </select>
                {elections.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No elections found. Please create an election first.</p>
                )}
              </div>
              
              {/* Candidate Email with Search Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={userSearchTerm}
                    onChange={handleUserInputChange}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search by name, email, or membership number..."
                    autoComplete="off"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                
                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        {userSearchTerm ? 'No users found' : 'Type to search users'}
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium text-sm text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.membership_number && (
                            <div className="text-xs text-gray-400">ID: {user.membership_number}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Search by name, email, or membership number</p>
              </div>
              
              {/* Position with Dynamic Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                {!showNewPositionInput ? (
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Position</option>
                      {positions.map(pos => (
                        <option key={pos.id || pos.title} value={pos.title}>{pos.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewPositionInput(true)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
                      title="Add new position"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new position name"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewPosition}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPositionInput(false)
                        setNewPosition('')
                      }}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manifesto / Bio</label>
                <textarea
                  rows={3}
                  value={formData.manifesto}
                  onChange={(e) => setFormData({...formData, manifesto: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Candidate's manifesto, campaign promises, or biography..."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {showEditModal && editingCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Edit Candidate</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCandidate} className="px-6 py-4 space-y-4">
              {/* Photo Upload for Edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {editCandidatePhotoPreview || editingCandidate?.photo_url ? (
                      <img src={editCandidatePhotoPreview || editingCandidate?.photo_url} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full text-white hover:bg-blue-700"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditPhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Upload new photo (max 5MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Election *</label>
                <select
                  required
                  value={editFormData.election_id}
                  onChange={(e) => setEditFormData({...editFormData, election_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Election</option>
                  {elections.length === 0 ? (
                    <option value="" disabled>Loading elections...</option>
                  ) : (
                    elections.map(election => (
                      <option key={election.id} value={election.id}>{election.title}</option>
                    ))
                  )}
                </select>
              </div>
              
              {/* Edit Candidate Email with Search Dropdown */}
              <div className="relative" ref={editDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={editUserSearchTerm}
                    onChange={handleEditUserInputChange}
                    onFocus={() => setShowEditUserDropdown(true)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search by name, email, or membership number..."
                    autoComplete="off"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                
                {showEditUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Loading users...</div>
                    ) : filteredEditUsers.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        {editUserSearchTerm ? 'No users found' : 'Type to search users'}
                      </div>
                    ) : (
                      filteredEditUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleEditSelectUser(user)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium text-sm text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.membership_number && (
                            <div className="text-xs text-gray-400">ID: {user.membership_number}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Search by name, email, or membership number</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                <select
                  required
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({...editFormData, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Position</option>
                  {positions.map(pos => (
                    <option key={pos.id || pos.title} value={pos.title}>{pos.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manifesto / Bio</label>
                <textarea
                  rows={3}
                  value={editFormData.manifesto}
                  onChange={(e) => setEditFormData({...editFormData, manifesto: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Candidate's manifesto, campaign promises, or biography..."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  Update Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageCandidates