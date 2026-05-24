import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Vote, Clock, Users, BarChart3, ChevronLeft,
  FileText, Calendar, MapPin, UserCheck
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ElectionDetail = () => {
  const { id } = useParams()
  const [election, setElection] = useState(null)
  const [positionsWithCandidates, setPositionsWithCandidates] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchElection()
    fetchCandidates()
  }, [id])

  const fetchElection = async () => {
    try {
      const response = await api.get(`/elections/${id}`)
      if (response.data.success) {
        setElection(response.data.data)
      }
    } catch (error) {
      toast.error('Failed to load election details')
    }
  }

  const fetchCandidates = async () => {
    try {
      const response = await api.get(`/voting/elections/${id}/candidates`)
      if (response.data.success) {
        setPositionsWithCandidates(response.data.data.positions || [])
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  // Helper function to get gradient color based on name
  const getGradientColor = (name) => {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-red-500 to-pink-600',
      'from-yellow-500 to-orange-600',
      'from-indigo-500 to-blue-600',
      'from-purple-500 to-pink-600'
    ]
    const index = (name?.length || 0) % colors.length
    return colors[index]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-ican-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!election) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Election not found</p>
      </div>
    )
  }

  const isActive = election.status === 'active'
  const isCompleted = election.status === 'completed'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/elections" className="flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Elections
      </Link>

      {/* Election Header */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{election.title}</h1>
            <p className="text-gray-500 capitalize mt-1">{election.election_type} Election</p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              isActive 
                ? 'bg-green-100 text-green-800'
                : isCompleted
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {election.status?.toUpperCase()}
            </span>
          </div>
        </div>

        <p className="text-gray-600 mb-6">{election.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <InfoCard 
            icon={<Calendar className="h-5 w-5" />}
            label="Start Date"
            value={new Date(election.start_date).toLocaleString()}
          />
          <InfoCard 
            icon={<Clock className="h-5 w-5" />}
            label="End Date"
            value={new Date(election.end_date).toLocaleString()}
          />
          <InfoCard 
            icon={<MapPin className="h-5 w-5" />}
            label="Timezone"
            value={election.timezone || 'UTC'}
          />
        </div>

        {isActive && (
          <Link to={`/vote/${election.id}`} className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
            Cast Your Vote
          </Link>
        )}

        {isCompleted && (
          <Link to={`/results/${election.id}`} className="block w-full bg-gray-600 text-white text-center py-3 rounded-lg hover:bg-gray-700 transition font-semibold">
            View Results
          </Link>
        )}
      </div>

      {/* Positions and Candidates */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Positions & Candidates</h2>
        
        {positionsWithCandidates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No candidates have been registered for this election yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {positionsWithCandidates.map((position) => (
              <div key={position.position_id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="text-xl font-semibold text-gray-900">{position.position_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {position.candidates.length} candidate{position.candidates.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y">
                  {position.candidates.map((candidate) => (
                    <div key={candidate.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start gap-4">
                        {/* Candidate Photo */}
                        {candidate.photo_url ? (
                          <img
                            src={candidate.photo_url}
                            alt={candidate.user?.full_name || 'Candidate'}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradientColor(candidate.user?.full_name)} flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                            {getInitials(candidate.user?.full_name)}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">
                                {candidate.user?.full_name || 'Candidate'}
                              </h4>
                              {candidate.user?.email && (
                                <p className="text-sm text-gray-500">{candidate.user.email}</p>
                              )}
                              {candidate.user?.membership_number && (
                                <p className="text-xs text-gray-400">ID: {candidate.user.membership_number}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              candidate.status === 'APPROVED' 
                                ? 'bg-green-100 text-green-800'
                                : candidate.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {candidate.status}
                            </span>
                          </div>
                          {candidate.manifesto && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600 italic">"{candidate.manifesto}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const InfoCard = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
    <div className="text-blue-500">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  </div>
)

export default ElectionDetail