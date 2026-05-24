// frontend/src/pages/AdminUsers.jsx
import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { Search, Edit2, Trash2, UserCheck, UserX, Shield, Eye, RefreshCw, Plus, Upload, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const AdminUsers = () => {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)

  // Create user form state
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    membership_number: '',
    district: 'lagos',
    role: 'member',
    password: '',
    confirm_password: ''
  })

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/users')
      if (response.data.success) {
        setUsers(response.data.data || response.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.membership_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (newUser.password !== newUser.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    
    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    try {
      const response = await api.post('/admin/users/create', {
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        membership_number: newUser.membership_number,
        district: newUser.district,
        role: newUser.role,
        password: newUser.password
      })
      
      if (response.data.success) {
        toast.success('User created successfully')
        setShowCreateModal(false)
        setNewUser({
          full_name: '',
          email: '',
          phone: '',
          membership_number: '',
          district: 'lagos',
          role: 'member',
          password: '',
          confirm_password: ''
        })
        fetchUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user')
    }
  }

  // Download template for bulk upload
  const downloadTemplate = () => {
    const template = [
      ['full_name', 'email', 'phone', 'membership_number', 'district', 'role', 'password'],
      ['John Doe', 'john@example.com', '08012345678', 'ICAN001', 'lagos', 'member', 'Password123!'],
      ['Jane Smith', 'jane@example.com', '08087654321', 'ICAN002', 'abuja', 'observer', 'Password123!']
    ]
    
    const csvContent = template.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  // Handle bulk file upload
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select a file')
      return
    }
    
    const formData = new FormData()
    formData.append('file', bulkFile)
    
    setBulkUploading(true)
    try {
      const response = await api.post('/admin/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.success) {
        toast.success(`${response.data.created} users created successfully`)
        if (response.data.errors?.length) {
          console.error('Upload errors:', response.data.errors)
          toast.warning(`${response.data.errors.length} rows had errors`)
        }
        setShowBulkModal(false)
        setBulkFile(null)
        fetchUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload users')
    } finally {
      setBulkUploading(false)
    }
  }

  // Change user status
  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    
    try {
      const response = await api.put(`/admin/users/${userId}/status`, {
        status: newStatus
      })
      
      if (response.data.success) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`)
        fetchUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, {
        role: newRole
      })
      
      if (response.data.success) {
        toast.success('User role updated successfully')
        fetchUsers()
        setShowEditModal(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`)
      
      if (response.data.success) {
        toast.success('User deleted successfully')
        fetchUsers()
        setShowDeleteModal(false)
        setSelectedUser(null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800',
      election_admin: 'bg-blue-100 text-blue-800',
      auditor: 'bg-indigo-100 text-indigo-800',
      observer: 'bg-green-100 text-green-800',
      member: 'bg-gray-100 text-gray-800'
    }
    return styles[role] || 'bg-gray-100 text-gray-800'
  }

  const roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'election_admin', label: 'Election Admin' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'observer', label: 'Observer' },
    { value: 'super_admin', label: 'Super Admin' }
  ]

  const districtOptions = [
    'lagos', 'abuja', 'port_harcourt', 'kano', 'ibadan', 'enugu', 
    'benin', 'kaduna', 'jos', 'sokoto', 'calabar', 'maiduguri'
  ]

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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users, roles, and permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or membership..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="election_admin">Election Admin</option>
            <option value="auditor">Auditor</option>
            <option value="observer">Observer</option>
            <option value="member">Member</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>

          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">{user.phone}</div>
                    </div>
                   </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{user.membership_number || 'N/A'}</div>
                   </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(user.role)}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                   </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                   </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{user.district || 'N/A'}</div>
                   </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {user.status !== 'pending' && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleStatusChange(user.id, user.status)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          user.status === 'active' 
                            ? 'text-red-700 bg-red-100 hover:bg-red-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {user.status === 'active' ? <UserX className="h-3 w-3 mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowEditModal(true)
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Edit Role
                    </button>
                    
                    {user.id !== currentUser?.id && user.role !== 'super_admin' && (
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeleteModal(true)
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    )}
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Create New User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership Number</label>
                <input
                  type="text"
                  value={newUser.membership_number}
                  onChange={(e) => setNewUser({...newUser, membership_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                <select
                  required
                  value={newUser.district}
                  onChange={(e) => setNewUser({...newUser, district: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {districtOptions.map(d => (
                    <option key={d} value={d}>{d.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  required
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roleOptions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.confirm_password}
                  onChange={(e) => setNewUser({...newUser, confirm_password: e.target.value})}
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Bulk Upload Users</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800 mb-2">Instructions:</p>
                <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                  <li>Download the template CSV file</li>
                  <li>Fill in user data (don't change column headers)</li>
                  <li>Upload the completed file</li>
                </ul>
              </div>
              
              <button
                onClick={downloadTemplate}
                className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template CSV
              </button>
              
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {bulkFile && (
                  <p className="text-xs text-green-600 mt-2">Selected: {bulkFile.name}</p>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkUploading ? 'Uploading...' : 'Upload Users'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal - keep existing code */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Edit User Role</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedUser.full_name} ({selectedUser.email})
              </p>
            </div>
            
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Role
              </label>
              <select
                defaultValue={selectedUser.role}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - keep existing code */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-red-600">Delete User</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{selectedUser.full_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. All user data will be permanently removed.
              </p>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers