import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { studentService } from '../../services/studentService';
import { ResetConfirmModal } from '../../components/ResetConfirmModal';
import { AlertOctagon, ShieldAlert, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

export function DangerZone() {
  const [election, setElection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    electionService.getActiveElection().then(setElection);
  }, []);

  const handleConfirmResetAll = async ({ typedPhrase, reason }) => {
    if (!election) return;

    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const res = await studentService.resetAllVotes(election.id, typedPhrase, reason);
      setStatusMessage({
        type: 'success',
        text: res.message || 'All votes have been successfully purged and student records reset.'
      });
      setShowModal(false);
    } catch (err) {
      setStatusMessage({
        type: 'danger',
        text: err.message || 'Reset failed. Authorization rejected.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-danger d-flex align-items-center gap-2 mb-1">
          <AlertOctagon size={28} />
          <span>Danger Zone: Emergency Administrative Controls</span>
        </h2>
        <p className="text-secondary small mb-0">
          High-risk, irreversible operations requiring explicit confirmation phrases and authentication
        </p>
      </div>

      {statusMessage.text && (
        <div className={`alert alert-${statusMessage.type} d-flex align-items-center gap-2 mb-4`}>
          <AlertTriangle size={18} />
          <div>{statusMessage.text}</div>
        </div>
      )}

      {/* Reset All Votes Action Box */}
      <div className="card border-danger border-2 shadow-sm mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="card-header bg-danger text-white py-3 px-4">
          <div className="d-flex align-items-center gap-2">
            <ShieldAlert size={22} />
            <h5 className="fw-bold mb-0">RESET ALL VOTES (ELECTION WIPE)</h5>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-8">
              <h5 className="fw-bold text-dark mb-1">Purge all ballot records for active election</h5>
              <p className="text-secondary small mb-2">
                Active Target: <strong>{election?.title || 'No Election Selected'}</strong> ({election?.session})
              </p>
              <p className="text-danger small mb-0 fw-semibold">
                WARNING: This deletes all voter responses (vote_answers), records in the votes table, and clears the has_voted status for all registered students. This cannot be undone under any circumstances.
              </p>
            </div>

            <div className="col-12 col-lg-4 text-lg-end">
              <button
                id="btn_open_reset_all_modal"
                className="btn btn-danger btn-lg rounded-pill px-4 fw-bold shadow d-inline-flex align-items-center gap-2"
                onClick={() => setShowModal(true)}
                disabled={!election}
              >
                <Trash2 size={18} />
                <span>RESET ALL VOTES</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ResetConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmResetAll}
        type="ALL_VOTES"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
