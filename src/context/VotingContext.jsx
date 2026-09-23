import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { electionService } from '../services/electionService';
import { useAuth } from './AuthContext';

const VotingContext = createContext(null);

export function VotingProvider({ children }) {
  const { isStudent, studentProfile, refreshProfile } = useAuth();
  const [election, setElection] = useState(null);
  const [ballotPositions, setBallotPositions] = useState([]);
  const [ballotAnswers, setBallotAnswers] = useState({}); // { [candidateId]: { candidate_id, position_id, choice: 'YES'|'NO' } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  // Load active election and ballot
  const loadBallot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeElection = await electionService.getActiveElection();
      setElection(activeElection);

      if (activeElection && activeElection.id) {
        const positionsWithCandidates = await electionService.getElectionBallot(activeElection.id);
        setBallotPositions(positionsWithCandidates || []);
      }
    } catch (err) {
      console.error('Failed to load ballot:', err);
      setError(err.message || 'Unable to load election ballot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

  // Set candidate choice (YES or NO)
  const setCandidateChoice = (candidateId, positionId, choice) => {
    if (choice !== 'YES' && choice !== 'NO') return;
    setBallotAnswers((prev) => ({
      ...prev,
      [candidateId]: {
        candidate_id: candidateId,
        position_id: positionId,
        choice
      }
    }));
  };

  // Check if every candidate in every active position has an explicit choice
  const getBallotValidation = useCallback(() => {
    const missingSelections = [];
    let totalCandidates = 0;

    ballotPositions.forEach((pos) => {
      (pos.candidates || []).forEach((cand) => {
        totalCandidates++;
        if (!ballotAnswers[cand.id] || !ballotAnswers[cand.id].choice) {
          missingSelections.push({
            position: pos.title,
            candidate: cand.full_name
          });
        }
      });
    });

    return {
      isValid: missingSelections.length === 0 && totalCandidates > 0,
      totalCandidates,
      selectedCount: Object.keys(ballotAnswers).length,
      missingSelections
    };
  }, [ballotPositions, ballotAnswers]);

  // Submit ballot to backend
  const submitFinalBallot = async () => {
    if (!election) throw new Error('No active election found.');
    const validation = getBallotValidation();
    if (!validation.isValid) {
      throw new Error(`Incomplete ballot: Please make an explicit choice (YES or NO) for all candidates.`);
    }

    setLoading(true);
    setError(null);
    try {
      const answersArray = Object.values(ballotAnswers);
      const result = await electionService.submitVote(election.id, answersArray);
      setSubmittedReceipt(result);
      // Refresh voter profile so has_voted = true
      await refreshProfile();
      return result;
    } catch (err) {
      setError(err.message || 'Submission failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearBallot = () => {
    setBallotAnswers({});
    setError(null);
  };

  const value = {
    election,
    ballotPositions,
    ballotAnswers,
    loading,
    error,
    submittedReceipt,
    loadBallot,
    setCandidateChoice,
    getBallotValidation,
    submitFinalBallot,
    clearBallot
  };

  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (!context) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  return context;
}
