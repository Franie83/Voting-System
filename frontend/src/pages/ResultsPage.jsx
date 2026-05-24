import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BarChart3, Award, ChevronRight, Loader } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ResultsPage = () => {
  const { electionId } = useParams();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingResults, setFetchingResults] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (electionId && electionId !== 'undefined') {
      fetchElectionAndResults(electionId);
    }
  }, [electionId]);

  const fetchElections = async () => {
    try {
      const response = await api.get('/results/elections');
      if (response.data.success) {
        setElections(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchElectionAndResults = async (id) => {
    if (!id || id === 'undefined') return;
    
    setFetchingResults(true);
    try {
      const resultsResponse = await api.get(`/results/elections/${id}`);
      if (resultsResponse.data.success) {
        setResults(resultsResponse.data.data);
        
        const electionResponse = await api.get(`/elections/${id}`);
        if (electionResponse.data.success) {
          setSelectedElection(electionResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setFetchingResults(false);
      setLoading(false);
    }
  };

  const handleElectionSelect = async (election) => {
    setSelectedElection(election);
    setFetchingResults(true);
    try {
      const response = await api.get(`/results/elections/${election.id}`);
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setFetchingResults(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading && elections.length === 0 && !electionId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  if (selectedElection && results) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setSelectedElection(null);
            setResults(null);
            if (electionId) {
              window.history.pushState({}, '', '/results');
            }
          }}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
          Back to Elections
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold mb-2">{selectedElection.title}</h1>
          <p className="text-gray-600 mb-4">{selectedElection.description}</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{results?.total_votes || 0}</p>
              <p className="text-sm text-gray-500">Total Votes</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{results?.results?.length || 0}</p>
              <p className="text-sm text-gray-500">Positions</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedElection.status)}`}>
                {selectedElection.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>

        {fetchingResults ? (
          <div className="flex justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          results?.results?.map((positionResult, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">{positionResult.position_name}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Candidate</th>
                      <th className="px-4 py-2 text-center">Votes</th>
                      <th className="px-4 py-2 text-center">Percentage</th>
                      <th className="px-4 py-2 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionResult.candidates.map((candidate, cIdx) => {
                      const percentage = positionResult.total_votes > 0 
                        ? ((candidate.votes / positionResult.total_votes) * 100).toFixed(1)
                        : 0;
                      const isWinner = cIdx === 0;
                      
                      return (
                        <tr key={cIdx} className="border-t">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {candidate.photo_url ? (
                                <img 
                                  src={candidate.photo_url} 
                                  alt={candidate.candidate_name} 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                  {candidate.candidate_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="font-medium">{candidate.candidate_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{candidate.votes}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isWinner && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                <Award className="h-3 w-3" />
                                Winner
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t text-sm text-gray-500">
                Total votes cast: {positionResult.total_votes}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Election Results</h1>
      
      {elections.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <BarChart3 className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-yellow-800">No completed elections with results available.</p>
          <Link to="/elections" className="inline-block mt-4 text-blue-600 hover:underline">
            View Active Elections →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.map(election => (
            <div key={election.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold">{election.title}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(election.status)}`}>
                  {election.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Ended: {new Date(election.end_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Total Votes: {election.total_votes || 0}
              </p>
              <button
                onClick={() => handleElectionSelect(election)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                View Results
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;