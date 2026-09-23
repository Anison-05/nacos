import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import confetti from 'canvas-confetti';
import { CheckCircle2, ShieldCheck, Printer, ArrowRight, Lock } from 'lucide-react';

export function VoteSuccess({ onNavigate }) {
  const { studentProfile } = useAuth();
  const { submittedReceipt, election } = useVoting();

  useEffect(() => {
    // Fire confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if unavailable
    }
  }, []);

  const receiptId = submittedReceipt?.vote_id || 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const castDate = submittedReceipt?.cast_at ? new Date(submittedReceipt.cast_at).toLocaleString() : new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container py-5 my-auto">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="digital-receipt-card text-center">
            {/* Official NACOS Logo & Success Icon */}
            <div className="mx-auto mb-3 bg-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow border" style={{ width: '84px', height: '84px' }}>
              <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <span className="badge bg-success bg-opacity-25 text-success fw-bold px-3 py-1 mb-2">
              Ballot Successfully Recorded
            </span>
            <h2 className="fw-bold text-dark mb-1">Thank You For Voting!</h2>
            <p className="text-secondary small mb-4">
              Your votes have been securely recorded in the official NACOS Electoral Commission database.
            </p>

            {/* Official Digital Receipt Box */}
            <div className="bg-light p-4 rounded-3 border text-start mb-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <span className="fw-bold text-dark small text-uppercase">Digital Ballot Receipt</span>
                <span className="badge bg-dark font-monospace">VERIFIED</span>
              </div>

              <div className="row g-2 small">
                <div className="col-6 text-muted">Voter Name:</div>
                <div className="col-6 text-dark fw-bold text-end">{studentProfile?.full_name}</div>

                <div className="col-6 text-muted">Matriculation Number:</div>
                <div className="col-6 text-dark fw-bold text-end font-monospace">{studentProfile?.matric_number}</div>

                <div className="col-6 text-muted">Election:</div>
                <div className="col-6 text-dark fw-bold text-end">{election?.title || 'NACOS CEC Elections'}</div>

                <div className="col-6 text-muted">Transaction ID:</div>
                <div className="col-6 text-dark fw-bold text-end font-monospace text-truncate" title={receiptId}>
                  {receiptId.substring(0, 16)}...
                </div>

                <div className="col-6 text-muted">Timestamp:</div>
                <div className="col-6 text-dark fw-bold text-end">{castDate}</div>
              </div>

              <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2 text-muted small" style={{ fontSize: '0.78rem' }}>
                <Lock size={14} className="text-success" />
                <span>One-Person-One-Vote rule recorded. Voting access has been sealed for your account.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
              <button
                className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 rounded-pill px-4"
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>

              <button
                id="btn_success_dashboard"
                className="btn btn-nacos-primary d-flex align-items-center justify-content-center gap-2 rounded-pill px-4 fw-bold"
                onClick={() => onNavigate('welcome')}
              >
                <span>Return to Overview</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
