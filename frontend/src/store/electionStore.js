import { create } from 'zustand'

export const useElectionStore = create((set, get) => ({
  elections: [],
  currentElection: null,
  ballot: null,
  votingStatus: null,
  isLoading: false,
  error: null,

  setElections: (elections) => set({ elections }),
  setCurrentElection: (election) => set({ currentElection: election }),
  setBallot: (ballot) => set({ ballot }),
  setVotingStatus: (votingStatus) => set({ votingStatus }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  markPositionVoted: (positionId) => set((state) => ({
    ballot: state.ballot ? {
      ...state.ballot,
      positions: state.ballot.positions.map(p => 
        p.id === positionId ? { ...p, has_voted: true, candidates: [] } : p
      )
    } : null,
    votingStatus: state.votingStatus ? {
      ...state.votingStatus,
      voted_positions: state.votingStatus.voted_positions + 1,
      remaining_positions: state.votingStatus.remaining_positions - 1,
    } : null,
  })),
}))
