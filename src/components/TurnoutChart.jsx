import React from 'react';

export function TurnoutGauge({ percentage = 0, votedCount = 0, totalEligible = 0 }) {
  const radius = 70;
  const stroke = 14;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-3">
      <div className="position-relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            stroke="#E2E8F0"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke="#059669"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div
          className="position-absolute top-50 start-50 translate-middle text-center"
          style={{ width: '100%' }}
        >
          <div className="fw-bold fs-4 text-dark">{percentage}%</div>
          <div className="text-muted small" style={{ fontSize: '0.72rem' }}>TURNOUT</div>
        </div>
      </div>

      <div className="text-center mt-3 small text-secondary">
        <strong className="text-dark">{votedCount}</strong> of <strong className="text-dark">{totalEligible}</strong> eligible voters
      </div>
    </div>
  );
}

export function CandidateProgressBar({ candidateName, yesVotes, noVotes, totalVotes, yesPct, noPct }) {
  return (
    <div className="mb-3 p-3 bg-light rounded-3 border">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="fw-bold text-dark">{candidateName}</span>
        <span className="badge bg-secondary">{totalVotes} Total Votes</span>
      </div>

      <div className="custom-progress mb-2 d-flex">
        <div
          className="bg-success"
          style={{ width: `${yesPct || 0}%`, transition: 'width 0.6s ease' }}
          title={`YES: ${yesPct}%`}
        />
        <div
          className="bg-danger"
          style={{ width: `${noPct || 0}%`, transition: 'width 0.6s ease' }}
          title={`NO: ${noPct}%`}
        />
      </div>

      <div className="d-flex justify-content-between small">
        <span className="text-success fw-bold">
          YES: {yesVotes} ({yesPct}%)
        </span>
        <span className="text-danger fw-bold">
          NO: {noVotes} ({noPct}%)
        </span>
      </div>
    </div>
  );
}
