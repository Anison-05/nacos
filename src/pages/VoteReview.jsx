import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { ArrowLeft, ShieldCheck, Check, X, AlertCircle } from 'lucide-react';

export function VoteReview({ onNavigate }) {
  const { studentProfile } = useAuth();
  const {
    election,
    ballotPositions,
    ballotAnswers,
    submitFinalBallot,
    loading
  } = useVoting();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError('');
    try {
      await submitFinalBallot();
      setIsModalOpen(false);
      onNavigate('vote-success');
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmissionError(err.message || 'Submission failed. Please try again.');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          {/* Header Card */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '18px', overflow: 'hidden' }}>
            <div className="p-4 bg-white border-bottom">
              <div className="d-flex align-items-center gap-2 text-success fw-bold small text-uppercase mb-1">
                <ShieldCheck size={18} />
                <span>Verification Checklist</span>
              </div>
              <h2 className="fw-bold text-dark mb-1">Review Your Vote</h2>
              <p className="text-secondary small mb-0">
                Please verify all your selections carefully before final submission. Once confirmed, your ballot is irreversibly cast.
              </p>
            </div>

            <div className="card-body p-4">
              {submissionError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-3 px-4 mb-4" role="alert">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <div>
                    <strong>Vote Submission Error:</strong> {submissionError}
                  </div>
                </div>
              )}

              {/* Voter Details Summary */}
              <div className="bg-light p-3 rounded-3 border mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <span className="text-muted small d-block">Voter Name:</span>
                  <span className="fw-bold text-dark">{studentProfile?.full_name}</span>
                </div>
                <div>
                  <span className="text-muted small d-block">Matriculation Number:</span>
                  <span className="fw-bold font-monospace text-dark">{studentProfile?.matric_number}</span>
                </div>
                <div>
                  <span className="text-muted small d-block">Election:</span>
                  <span className="badge bg-secondary">{election?.title}</span>
                </div>
              </div>

              {/* Selections Grouped by Position */}
              <div className="mb-4">
                {ballotPositions.map((position) => (
                  <div key={position.id} className="mb-4">
                    <h5 className="fw-bold text-dark border-bottom pb-2 mb-3 text-uppercase fs-6">
                      {position.title}
                    </h5>

                    {position.candidates?.map((candidate) => {
                      const answer = ballotAnswers[candidate.id];
                      const choice = answer?.choice;

                      return (
                        <div key={candidate.id} className="review-selection-card">
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={candidate.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                              alt={candidate.full_name}
                              className="rounded-circle object-fit-cover border"
                              style={{ width: '48px', height: '48px' }}
                            />
                            <div>
                              <div className="fw-bold text-dark">{candidate.full_name}</div>
                              <span className="text-muted font-monospace small">{candidate.matric_number}</span>
                            </div>
                          </div>

                          <div>
                            {choice === 'YES' ? (
                              <span className="review-badge-yes d-inline-flex align-items-center gap-1">
                                <Check size={16} strokeWidth={3} />
                                <span>VOTED YES</span>
                              </span>
                            ) : choice === 'NO' ? (
                              <span className="review-badge-no d-inline-flex align-items-center gap-1">
                                <X size={16} strokeWidth={3} />
                                <span>VOTED NO</span>
                              </span>
                            ) : (
                              <span className="badge bg-danger">NO CHOICE SELECTED</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Navigation Action Buttons */}
              <div className="d-flex justify-content-between align-items-center pt-3 border-top gap-3 flex-wrap">
                <button
                  type="button"
                  id="btn_review_back"
                  className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-semibold d-flex align-items-center gap-2"
                  onClick={() => onNavigate('vote')}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={16} />
                  <span>BACK</span>
                </button>

                <button
                  type="button"
                  id="btn_submit_final_vote"
                  className="btn btn-success btn-lg px-5 py-2 rounded-pill fw-bold shadow d-flex align-items-center gap-2"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isSubmitting}
                >
                  <ShieldCheck size={20} />
                  <span>SUBMIT FINAL VOTE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
