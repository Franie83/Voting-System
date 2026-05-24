// frontend/src/pages/VotingPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import VoteReceipt from '../components/VoteReceipt';

const VotingPage = () => {
  const { user } = useAuthStore();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [voteReceipts, setVoteReceipts] = useState([]);
  const [electionResult, setElectionResult] = useState(null);

  useEffect(() => {
    fetchActiveElections();
  }, []);

  const fetchActiveElections = async () => {
    try {
      const response = await api.get('/voting/elections/active');
      if (response.data.success) {
        setElections(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (electionId) => {
    setLoading(true);
    try {
      const response = await api.get(`/voting/elections/${electionId}/candidates`);
      if (response.data.success) {
        const candidatesData = response.data.data;
        setCandidates(candidatesData);
        
        // Initialize selected candidates
        const initialSelected = {};
        if (candidatesData.positions) {
          candidatesData.positions.forEach(position => {
            initialSelected[position.position_id] = null;
          });
        }
        setSelectedCandidates(initialSelected);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSelect = (positionId, candidateId) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
  };

  const handleSubmitVotes = async () => {
    // Check if all positions have selections
    const missingSelections = Object.values(selectedCandidates).some(v => v === null);
    
    if (missingSelections) {
      toast.error('Please vote for all positions before submitting');
      return;
    }

    if (!window.confirm('Are you sure you want to cast your votes? This action cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    
    try {
      const votes = Object.entries(selectedCandidates).map(([positionId, candidateId]) => ({
        election_id: selectedElection.id,
        position_id: positionId,
        candidate_id: candidateId
      }));

      const response = await api.post('/voting/cast', { votes });
      
      if (response.data.success) {
        toast.success('Votes cast successfully!');
        
        // Store receipts data
        if (response.data.data.receipts && response.data.data.receipts.length > 0) {
          setVoteReceipts(response.data.data.receipts);
          setElectionResult({
            title: response.data.data.election,
            id: response.data.data.election_id,
            voting_reference: response.data.data.voting_reference
          });
          setShowReceipt(true);
        }
        
        setSelectedElection(null);
        setSelectedCandidates({});
        fetchActiveElections();
      }
    } catch (error) {
      console.error('Error casting votes:', error);
      toast.error(error.response?.data?.message || 'Failed to cast votes');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // Helper function to get gradient color based on name
  const getGradientColor = (name) => {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-red-500 to-pink-600',
      'from-yellow-500 to-orange-600',
      'from-indigo-500 to-blue-600',
      'from-purple-500 to-pink-600'
    ];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading elections...</div>
      </div>
    );
  }

  if (!selectedElection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Active Elections</h1>
        
        {elections.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800">No active elections at this time.</p>
            <p className="text-sm text-gray-600 mt-2">Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map(election => (
              <div key={election.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <h2 className="text-xl font-semibold mb-2">{election.title}</h2>
                <p className="text-gray-600 mb-4">{election.description}</p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Status:</strong> <span className="text-green-600">{election.status}</span>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Valid until:</strong> {new Date(election.end_date).toLocaleDateString()}
                </p>
                {election.has_voted ? (
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white py-2 rounded-lg cursor-not-allowed"
                  >
                    Already Voted
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedElection(election);
                      fetchCandidates(election.id);
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Vote Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Group candidates by position
  const positions = candidates.positions || [];
  
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{selectedElection.title}</h1>
          <p className="text-gray-600 mb-4">{selectedElection.description}</p>
          <button
            onClick={() => setSelectedElection(null)}
            className="text-blue-600 hover:text-blue-800 transition"
          >
            ← Back to Elections
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmitVotes(); }}>
          {positions.map(position => (
            <div key={position.position_id} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">{position.position_name}</h2>
              <div className="space-y-3">
                {position.candidates.map(candidate => (
                  <label
                    key={candidate.id}
                    className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                      selectedCandidates[position.position_id] === candidate.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`position_${position.position_id}`}
                      value={candidate.id}
                      checked={selectedCandidates[position.position_id] === candidate.id}
                      onChange={() => handleVoteSelect(position.position_id, candidate.id)}
                      className="mt-2 mr-3"
                    />
                    <div className="flex-1 flex items-center gap-4">
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
                        <div className="font-semibold text-lg">{candidate.user?.full_name || 'Candidate'}</div>
                        {candidate.user?.email && (
                          <div className="text-xs text-gray-500 mt-0.5">{candidate.user.email}</div>
                        )}
                        {candidate.manifesto && (
                          <div className="text-sm text-gray-600 mt-2">{candidate.manifesto}</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Submitting...' : 'Cast Your Votes'}
            </button>
          </div>
        </form>
      </div>

      {/* Receipt Modal */}
      {showReceipt && voteReceipts.length > 0 && (
        <VoteReceipt 
          receipts={voteReceipts}
          election={electionResult}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
};

export default VotingPage;