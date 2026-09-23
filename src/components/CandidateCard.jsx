import React from 'react';
import { Check, X, Award, FileText } from 'lucide-react';

export function CandidateCard({ candidate, positionTitle, selectedChoice, onSelectChoice, disabled = false }) {
  const inputName = `vote_${candidate.id}`;
  const yesId = `choice_yes_${candidate.id}`;
  const noId = `choice_no_${candidate.id}`;

  return (
    <div className={`candidate-card h-100 d-flex flex-column ${selectedChoice ? 'border-primary' : ''}`}>
      {/* Candidate Image */}
      <div className="candidate-img-container">
        <img
          src={candidate.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
          alt={candidate.full_name}
          className="candidate-img"
          loading="lazy"
          onError={(e) => {
            // Fallback placeholder image
            e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=80';
          }}
        />
        <div className="position-absolute top-0 end-0 m-2">
          <span className="badge bg-dark bg-opacity-75 text-white px-2 py-1 small">
            {positionTitle}
          </span>
        </div>
      </div>

      {/* Candidate Details */}
      <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="candidate-matric">{candidate.matric_number}</span>
          </div>

          <h3 className="candidate-name" id={`candidate_name_${candidate.id}`}>
            {candidate.full_name}
          </h3>

          {candidate.manifesto && (
            <div className="mt-2 text-muted small" style={{ fontSize: '0.88rem', lineHeight: '1.45' }}>
              <div className="d-flex align-items-center gap-1 text-secondary fw-semibold mb-1">
                <FileText size={14} />
                <span>Key Manifesto / Agenda:</span>
              </div>
              <p className="mb-0 bg-light p-2 rounded-2 border border-slate-200">
                "{candidate.manifesto}"
              </p>
            </div>
          )}
        </div>

        {/* YES / NO Explicit Voting Controls */}
        <div className="mt-3 pt-2 border-top">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small text-uppercase fw-bold text-secondary" style={{ letterSpacing: '0.5px' }}>
              Cast Your Choice:
            </span>
            {selectedChoice ? (
              <span className={`badge ${selectedChoice === 'YES' ? 'bg-success' : 'bg-danger'}`}>
                Selected: {selectedChoice}
              </span>
            ) : (
              <span className="badge bg-secondary">Choice Required</span>
            )}
          </div>

          <div className="voting-options-container">
            {/* YES Choice */}
            <div>
              <input
                type="radio"
                id={yesId}
                name={inputName}
                value="YES"
                className="voting-choice-input"
                checked={selectedChoice === 'YES'}
                onChange={() => onSelectChoice('YES')}
                disabled={disabled}
              />
              <label htmlFor={yesId} className="voting-choice-label yes-choice w-100">
                <Check size={18} strokeWidth={3} />
                <span>YES</span>
              </label>
            </div>

            {/* NO Choice */}
            <div>
              <input
                type="radio"
                id={noId}
                name={inputName}
                value="NO"
                className="voting-choice-input"
                checked={selectedChoice === 'NO'}
                onChange={() => onSelectChoice('NO')}
                disabled={disabled}
              />
              <label htmlFor={noId} className="voting-choice-label no-choice w-100">
                <X size={18} strokeWidth={3} />
                <span>NO</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
