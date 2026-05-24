import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Eye, BarChart3, Shield, CheckCircle, 
  Clock, AlertTriangle, Users 
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ObserverPortal = () => {
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [monitorData, setMonitorData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchElections()
  }, [])

  const fetchElections = async () => {
    try {
      const response = await api.get('/observer/elections')
      if (response.data.success) {
        setElections(response.data.data)
      }
    } catch (error) {
      toast.error('Failed to load elections')
    } finally {
      setIsLoading(false)
    }
  }

  const monitorElection = async (electionId) => {
    try {
      const response = await api.get(`/observer/elections/${electionId}/monitor`)
      if (response.data.success) {
        setMonitorData(response.data.data)
        setSelectedElection(electionId)
      }
    } catch (error) {
      toast.error('Failed to load monitoring data')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-ican-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ican-primary dark:text-white">Observer Portal</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Real-time election monitoring and compliance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Elections List */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-ican-primary dark:text-white mb-4">Elections</h2>
            <div className="space-y-3">
              {elections.map(election => (
                <button
                  key={election.id}
                  onClick={() => monitorElection(election.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedElection === election.id
                      ? 'border-ican-primary bg-ican-light dark:bg-ican-primary/20'
                      : 'border-gray-200 hover:border-ican-primary dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{election.title}</p>
                      <p className="text-sm text-gray-500 capitalize">{election.election_type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      election.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {election.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Turnout: {election.statistics?.turnout_percentage || 0}%
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Monitoring Dashboard */}
        <div className="lg:col-span-2">
          {monitorData ? (
            <div className="space-y-6">
              {/* Real-time Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MonitorStatCard 
                  icon={<Users className="h-5 w-5" />}
                  label="Total Votes"
                  value={monitorData.total_votes_cast}
                />
                <MonitorStatCard 
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Turnout"
                  value={`${monitorData.turnout_percentage}%`}
                />
                <MonitorStatCard 
                  icon={<Clock className="h-5 w-5" />}
                  label="Status"
                  value={monitorData.election.status}
                />
              </div>

              {/* Recent Activity */}
              <div className="card p-6">
                <h3 className="text-lg font-bold text-ican-primary dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {monitorData.recent_activity?.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">Vote cast</p>
                        <p className="text-xs text-gray-500">{new Date(activity.cast_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Logs */}
              <div className="card p-6">
                <h3 className="text-lg font-bold text-ican-primary dark:text-white mb-4">Security Logs</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {monitorData.audit_logs?.map((log, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      {log.action?.includes('FRAUD') || log.action?.includes('SUSPICIOUS') 
                        ? <AlertTriangle className="h-4 w-4 text-red-500" />
                        : <Shield className="h-4 w-4 text-blue-500" />
                      }
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                        <p className="text-xs text-gray-500">{log.action_description}</p>
                        <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Select an election to start monitoring</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const MonitorStatCard = ({ icon, label, value }) => (
  <div className="card p-4">
    <div className="flex items-center space-x-3">
      <div className="text-ican-accent">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-ican-primary dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  </div>
)

export default ObserverPortal
