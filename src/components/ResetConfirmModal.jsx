import React, { useState } from 'react';
import { AlertOctagon, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'SINGLE_VOTER', // 'SINGLE_VOTER' | 'ALL_VOTES'
  targetName = '',
  isSubmitting = false
}) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isAllVotes = type === 'ALL_VOTES';
  const requiredPhrase = 'RESET ELECTION';

  const handleConfirm = () => {
    setError('');

    if (isAllVotes) {
      if (typedPhrase.trim() !== requiredPhrase) {
        setError(`You must type "${requiredPhrase}" exactly to confirm.`);
        return;
      }
      if (!password) {
        setError('Please enter your administrator password for re-authentication.');
        return;
      }
    }

    onConfirm({
      typedPhrase,
      password,
      reason: reason.trim() || (isAllVotes ? 'Emergency election vote wipe' : 'Voter voting status reset')
    });
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div className={`modal-header ${isAllVotes ? 'bg-danger text-white' : 'bg-warning bg-opacity-25 text-dark'} p-3`}>
            <div className="d-flex align-items-center gap-2">
              {isAllVotes ? <AlertOctagon size={24} /> : <AlertTriangle size={24} className="text-warning" />}
              <h5 className="modal-title fw-bold mb-0">
                {isAllVotes ? 'DANGER: Reset All Election Votes' : 'Reset Voter Status'}
              </h5>
            </div>
            <button
              type="button"
              className={`btn-close ${isAllVotes ? 'btn-close-white' : ''}`}
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {isAllVotes ? (
              <div className="danger-zone-box mb-3">
                <div className="d-flex gap-2 text-danger fw-bold mb-2">
                  <ShieldAlert size={20} />
                  <span>DESTRUCTIVE PERMANENT ACTION</span>
                </div>
                <p className="small text-danger mb-0">
                  This operation will <strong>permanently delete all votes and candidate choices</strong> cast in this election. All student records will have their voting flags cleared. This action cannot be undone and will be logged in the permanent audit trail.
                </p>
              </div>
            ) : (
              <p className="text-secondary mb-3">
                Reset voting status for: <strong className="text-dark">{targetName}</strong>?
                This will delete their previously recorded vote and allow them to access the ballot again.
              </p>
            )}

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3">
                {error}
              </div>
            )}

            {isAllVotes && (
              <>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">
                    Type <span className="badge bg-danger">{requiredPhrase}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="RESET ELECTION"
                    value={typedPhrase}
                    onChange={(e) => setTypedPhrase(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">
                    Admin Password Re-authentication:
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter your admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">
                Reason for Reset (Recorded in Audit Log):
              </label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="e.g. Student experienced network disconnection during authorization"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light p-3 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 fw-semibold rounded-pill"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${isAllVotes ? 'btn-danger' : 'btn-warning'} px-4 fw-bold rounded-pill d-flex align-items-center gap-2`}
              onClick={handleConfirm}
              disabled={isSubmitting || (isAllVotes && typedPhrase !== requiredPhrase)}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Processing Reset...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>{isAllVotes ? 'Confirm Destructive Reset' : 'Reset Voter'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
