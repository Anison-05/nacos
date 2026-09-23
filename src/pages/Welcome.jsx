import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import { ShieldCheck, Vote, CheckCircle2, AlertOctagon, Clock, User, Check, XCircle } from 'lucide-react';

export function Welcome({ onNavigate }) {
  const { studentProfile, logout } = useAuth();
  const { election, loadBallot, loading } = useVoting();

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

  const hasVoted = Boolean(studentProfile?.has_voted);
  const isEligible = Boolean(studentProfile?.eligible_to_vote);
  const isEmailVerified = Boolean(studentProfile?.email_verified);
  const isElectionOpen = election?.status === 'OPEN';

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          {/* Main Welcome Card */}
          <div className="card border-0 shadow-lg mb-4" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            {/* Header Banner */}
            <div className="p-4 p-md-5 text-white" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #04382A 100%)' }}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow flex-shrink-0" style={{ width: '70px', height: '70px' }}>
                      <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <span className="badge bg-emerald-subtle text-white px-3 py-1 mb-2 border border-white border-opacity-25" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        NACOS Electoral Commission
                      </span>
                      <h2 className="fw-bold mb-1" id="welcome_student_name">
                        Welcome, {studentProfile?.full_name || 'Student Voter'}
                      </h2>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 mt-2 font-monospace small">
                    <span className="bg-black bg-opacity-25 px-2 py-1 rounded">
                      Matric: {studentProfile?.matric_number || 'N/A'}
                    </span>
                    <span className="bg-black bg-opacity-25 px-2 py-1 rounded">
                      Dept: {studentProfile?.department || 'Computer Science'}
                    </span>
                  </div>
                </div>

                {/* Status Pill */}
                <div className="text-md-end">
                  {isElectionOpen ? (
                    <span className="badge bg-success py-2 px-3 fs-6 d-inline-flex align-items-center gap-1 shadow-sm">
                      <Clock size={16} />
                      <span>Election Status: OPEN</span>
                    </span>
                  ) : (
                    <span className="badge bg-danger py-2 px-3 fs-6 d-inline-flex align-items-center gap-1 shadow-sm">
                      <AlertOctagon size={16} />
                      <span>Election Status: {election?.status || 'CLOSED'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="card-body p-4 p-md-5">
              {/* Election Details */}
              <div className="bg-light p-3 rounded-3 border mb-4">
                <h5 className="fw-bold text-dark mb-1">
                  {election?.title || 'NACOS General Elections'}
                </h5>
                <div className="text-secondary small mb-2">
                  Academic Session: <strong>{election?.session || '2025/2026'}</strong>
                </div>
                {election?.description && (
                  <p className="mb-0 small text-muted">
                    {election.description}
                  </p>
                )}
              </div>

              {/* Voter Status Banner Check */}
              {hasVoted ? (
                /* Already Voted Banner */
                <div className="alert alert-success p-4 rounded-3 text-center mb-4 border-2 border-success border-opacity-25 bg-success bg-opacity-10" id="already_voted_notice">
                  <div className="mx-auto mb-2 bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="fw-bold text-success mb-1">
                    You have already submitted your vote.
                  </h4>
                  <p className="text-secondary mb-0 small">
                    Your ballot has been securely and permanently recorded in the electoral ledger. In accordance with the one-person-one-vote rule, you cannot access or modify the voting form again.
                  </p>
                </div>
              ) : !isElectionOpen ? (
                /* Voting Closed Banner */
                <div className="alert alert-warning p-4 rounded-3 text-center mb-4 border-2 border-warning border-opacity-25 bg-warning bg-opacity-10" id="voting_closed_notice">
                  <div className="mx-auto mb-2 bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    <AlertOctagon size={28} />
                  </div>
                  <h4 className="fw-bold text-dark mb-1">
                    Voting is currently closed.
                  </h4>
                  <p className="text-secondary mb-0 small">
                    The Electoral Commission has closed ballot submissions for this session. Please await official results publication.
                  </p>
                </div>
              ) : !isEligible ? (
                /* Ineligible Banner */
                <div className="alert alert-danger p-4 rounded-3 text-center mb-4 border-2 border-danger border-opacity-25 bg-danger bg-opacity-10">
                  <div className="mx-auto mb-2 bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    <XCircle size={28} />
                  </div>
                  <h4 className="fw-bold text-danger mb-1">
                    Voter Ineligibility Flag
                  </h4>
                  <p className="text-secondary mb-0 small">
                    Your student record is currently marked as ineligible to vote. If you believe this is in error, please contact the NACOS Electoral Commission desk.
                  </p>
                </div>
              ) : !isEmailVerified ? (
                /* Unverified Email Banner */
                <div className="alert alert-warning p-4 rounded-3 text-center mb-4">
                  <h5 className="fw-bold text-dark mb-2">Email Verification Required</h5>
                  <p className="small text-secondary mb-3">
                    You must verify your registered department email address before accessing the voting screen.
                  </p>
                  <button
                    className="btn btn-warning fw-bold px-4 rounded-pill"
                    onClick={() => onNavigate('verify-email')}
                  >
                    Verify Email Now
                  </button>
                </div>
              ) : (
                /* Eligible and Ready to Vote */
                <div className="text-center py-3">
                  <div className="mb-4">
                    <h5 className="fw-bold text-dark mb-2">Instructions for Voting:</h5>
                    <div className="row g-3 text-start small">
                      <div className="col-12 col-md-4">
                        <div className="p-3 bg-light rounded-3 h-100 border">
                          <strong className="d-block text-dark mb-1">1. Review Candidates</strong>
                          Examine manifestos, photos, and platforms for every contested executive position.
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="p-3 bg-light rounded-3 h-100 border">
                          <strong className="d-block text-dark mb-1">2. Explicit Choice</strong>
                          Select <strong>YES</strong> or <strong>NO</strong> for every candidate. No pre-selections are made for you.
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="p-3 bg-light rounded-3 h-100 border">
                          <strong className="d-block text-dark mb-1">3. Final Verification</strong>
                          Review your summary ballot before final one-time irrevocable submission.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    id="btn_proceed_to_ballot"
                    className="btn btn-nacos-primary btn-lg px-5 py-3 rounded-pill fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                    onClick={() => onNavigate('vote')}
                  >
                    <Vote size={22} />
                    <span>Proceed to Official Ballot</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
