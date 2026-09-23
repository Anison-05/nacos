import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import { CandidateCard } from '../components/CandidateCard';
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export function VotingPage({ onNavigate }) {
  const { studentProfile } = useAuth();
  const {
    election,
    ballotPositions,
    ballotAnswers,
    setCandidateChoice,
    getBallotValidation,
    loading
  } = useVoting();

  const [validationError, setValidationError] = useState('');

  // Safeguard: Check if student has already voted or election is closed
  if (studentProfile?.has_voted) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm p-5 border-0 mx-auto" style={{ maxWidth: '600px', borderRadius: '16px' }}>
          <h4 className="fw-bold text-success mb-2">You have already submitted your vote.</h4>
          <p className="text-secondary mb-4">
            In accordance with the one-person-one-vote rule, you cannot vote again.
          </p>
          <button className="btn btn-nacos-primary mx-auto" onClick={() => onNavigate('welcome')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (election?.status !== 'OPEN') {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm p-5 border-0 mx-auto" style={{ maxWidth: '600px', borderRadius: '16px' }}>
          <h4 className="fw-bold text-danger mb-2">Voting is currently closed.</h4>
          <p className="text-secondary mb-4">
            Submissions are not permitted at this time.
          </p>
          <button className="btn btn-nacos-primary mx-auto" onClick={() => onNavigate('welcome')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const validation = getBallotValidation();
  const progressPct = validation.totalCandidates > 0
    ? Math.round((validation.selectedCount / validation.totalCandidates) * 100)
    : 0;

  const handleProceedToReview = () => {
    setValidationError('');
    if (!validation.isValid) {
      setValidationError(
        `Please make an explicit choice (YES or NO) for all candidates. ${validation.missingSelections.length} selection(s) remaining.`
      );
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onNavigate('vote-review');
  };

  return (
    <div className="container py-4 pb-5">
      {/* Top Banner & Progress Bar */}
      <div className="card border-0 shadow-sm mb-4 p-3 p-md-4" style={{ borderRadius: '14px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-success">OFFICIAL BALLOT</span>
              <span className="text-muted small">&bull; {election?.title}</span>
            </div>
            <h3 className="fw-bold text-dark mb-0">Cast Your Executive Votes</h3>
          </div>

          <div className="text-md-end" style={{ minWidth: '220px' }}>
            <div className="d-flex justify-content-between small fw-bold mb-1">
              <span>Ballot Progress:</span>
              <span className={validation.isValid ? 'text-success' : 'text-primary'}>
                {validation.selectedCount} of {validation.totalCandidates} Selected ({progressPct}%)
              </span>
            </div>
            <div className="custom-progress">
              <div
                className={`custom-progress-bar ${validation.isValid ? 'bg-success' : ''}`}
                style={{ width: `${progressPct}%`, transition: 'width 0.3s ease' }}
              />
            </div>
          </div>
        </div>

        {validationError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small mt-3 mb-0" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <div>{validationError}</div>
          </div>
        )}
      </div>

      {/* Dynamic Ballot Positions */}
      {ballotPositions.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm p-4">
          <p className="text-secondary mb-0">No active election positions or candidates are configured.</p>
        </div>
      ) : (
        ballotPositions.map((position) => (
          <section key={position.id} className="mb-5" id={`position_section_${position.id}`}>
            {/* Position Header Banner */}
            <div className="position-header-card d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
              <div>
                <h4 className="fw-bold mb-1 text-white text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  {position.title}
                </h4>
                {position.description && (
                  <p className="mb-0 text-white-50 small">
                    {position.description}
                  </p>
                )}
              </div>
              <span className="badge bg-white text-dark py-2 px-3 fw-bold align-self-start align-self-sm-center">
                {position.candidates?.length || 0} Candidate(s)
              </span>
            </div>

            {/* Candidates Grid */}
            {(!position.candidates || position.candidates.length === 0) ? (
              <div className="p-4 bg-light rounded-3 text-center border text-muted small">
                No active candidates registered for this position.
              </div>
            ) : (
              <div className="row g-4">
                {position.candidates.map((candidate) => (
                  <div key={candidate.id} className="col-12 col-md-6 col-lg-4">
                    <CandidateCard
                      candidate={candidate}
                      positionTitle={position.title}
                      selectedChoice={ballotAnswers[candidate.id]?.choice}
                      onSelectChoice={(choice) => setCandidateChoice(candidate.id, position.id, choice)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}

      {/* Floating / Sticky Bottom Review Bar */}
      <div className="sticky-bottom bg-white p-3 rounded-4 shadow-lg border mt-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
        <button
          className="btn btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-4"
          onClick={() => onNavigate('welcome')}
        >
          <ArrowLeft size={16} />
          <span>Exit to Overview</span>
        </button>

        <div className="d-flex align-items-center gap-3">
          <span className="small text-secondary d-none d-md-inline">
            {validation.isValid ? (
              <span className="text-success fw-bold d-flex align-items-center gap-1">
                <CheckCircle2 size={16} /> All candidates answered
              </span>
            ) : (
              <span className="text-danger fw-semibold">
                {validation.missingSelections.length} selection(s) required
              </span>
            )}
          </span>

          <button
            id="btn_review_vote"
            className="btn btn-nacos-primary px-4 py-2 rounded-pill fw-bold d-flex align-items-center gap-2 shadow-sm"
            onClick={handleProceedToReview}
          >
            <span>Review Your Vote</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
