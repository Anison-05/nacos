import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', badgeText }) {
  const colorMap = {
    primary: { bg: 'bg-primary-subtle', text: 'text-primary' },
    success: { bg: 'bg-success-subtle', text: 'text-success' },
    warning: { bg: 'bg-warning-subtle', text: 'text-warning-emphasis' },
    danger: { bg: 'bg-danger-subtle', text: 'text-danger' },
    info: { bg: 'bg-info-subtle', text: 'text-info-emphasis' },
    emerald: { bg: 'bg-emerald-subtle', text: 'text-emerald', customStyle: { backgroundColor: '#D1FAE5', color: '#065F46' } }
  };

  const styleConfig = colorMap[color] || colorMap.primary;

  return (
    <div className="admin-stat-card h-100">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>
          {title}
        </span>
        {Icon && (
          <div
            className={`stat-icon-wrapper ${styleConfig.bg} ${styleConfig.text}`}
            style={styleConfig.customStyle}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.85rem' }}>
          {value}
        </h3>
        {badgeText && (
          <span className="badge bg-light text-secondary border small">
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="text-muted small mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}
