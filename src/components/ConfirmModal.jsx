import React from 'react';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';

export function ConfirmModal({ isOpen, onClose, onConfirm, isSubmitting = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div className="modal-header bg-warning bg-opacity-25 border-bottom border-warning border-opacity-25 p-3">
            <div className="d-flex align-items-center gap-2 text-dark">
              <AlertTriangle className="text-warning" size={24} />
              <h5 className="modal-title fw-bold mb-0">Confirm Final Vote Submission</h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 text-center">
            <div className="mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
              <Lock size={32} className="text-success" />
            </div>

            <h5 className="fw-bold text-dark mb-2">
              Your vote cannot be changed after submission.
            </h5>
            <p className="text-secondary mb-3">
              Are you sure you want to continue? Once submitted, your choices will be irreversibly encrypted and committed to the electoral ledger.
            </p>

            <div className="alert alert-info py-2 px-3 small d-flex align-items-center justify-content-center gap-2 mb-0">
              <ShieldCheck size={16} />
              <span>One-Person-One-Vote cryptographic rule strictly enforced.</span>
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
              className="btn btn-success px-4 fw-bold rounded-pill d-flex align-items-center gap-2"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Recording Vote...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Confirm Vote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
