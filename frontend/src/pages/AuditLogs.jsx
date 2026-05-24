import React, { useEffect, useState } from 'react'
import { Shield, CheckCircle, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE_URL = 'http://127.0.0.1:8080/api'

const AuditLogs = () => {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  useEffect(() => {
    fetchLogs()
  }, [page, filter])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page,
        per_page: 50
      })
      if (filter) {
        params.append('action', filter)
      }
      
      const response = await fetch(`${API_BASE_URL}/audit/logs?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data || [])
        setTotalPages(data.pagination?.pages || 1)
        setTotalLogs(data.pagination?.total || 0)
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  const verifyIntegrity = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/verify-integrity`)
      const data = await response.json()
      if (data.success) {
        const result = data.data
        if (result.is_valid) {
          toast.success(`Audit log integrity verified: ${result.total_logs} logs checked`)
        } else {
          toast.error(`Integrity issues found! ${result.integrity_issues} issues detected`)
        }
      } else {
        toast.error('Integrity check failed')
      }
    } catch (error) {
      console.error('Integrity check error:', error)
      toast.error('Failed to verify integrity')
    }
  }

  const getActionIcon = (action) => {
    if (!action) return <Shield className="h-4 w-4 text-gray-500" />
    const actionLower = action.toLowerCase()
    if (actionLower.includes('login')) return <Shield className="h-4 w-4 text-blue-500" />
    if (actionLower.includes('vote')) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (actionLower.includes('fraud') || actionLower.includes('lock') || actionLower.includes('suspicious')) 
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    return <Shield className="h-4 w-4 text-gray-500" />
  }

  const getActionColor = (action) => {
    if (!action) return 'bg-gray-50 text-gray-800'
    const actionLower = action.toLowerCase()
    if (actionLower.includes('login')) return 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    if (actionLower.includes('vote')) return 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    if (actionLower.includes('fraud') || actionLower.includes('lock') || actionLower.includes('suspicious')) 
      return 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    return 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }

  const formatActionName = (action) => {
    if (!action) return 'Unknown'
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading audit logs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Immutable election audit trail</p>
          {totalLogs > 0 && (
            <p className="text-sm text-gray-500 mt-1">Total records: {totalLogs}</p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" title="Refresh">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={verifyIntegrity} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
            <Shield className="h-4 w-4" />
            Verify Integrity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="login_success">Login Success</option>
              <option value="login_failed">Login Failed</option>
              <option value="logout">Logout</option>
              <option value="vote_cast">Vote Cast</option>
              <option value="votes_reset">Votes Reset</option>
              <option value="election_created">Election Created</option>
              <option value="user_created">User Created</option>
              <option value="user_updated">User Updated</option>
              <option value="user_suspended">User Suspended</option>
              <option value="user_approved">User Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={log.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.action_description || 'No description'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.user_email || (log.user_id ? log.user_id.substring(0, 8) + '...' : 'System')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">
                    {log.current_hash ? log.current_hash.substring(0, 16) + '...' : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-2">Audit logs will appear as users perform actions in the system</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AuditLogs