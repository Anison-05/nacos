import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User, CheckCircle2, AlertCircle } from 'lucide-react';

export function Navbar({ onNavigate, currentPage }) {
  const { currentUser, userRole, studentProfile, adminProfile, logout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg nacos-navbar py-2 px-3 sticky-top">
      <div className="container-fluid max-w-7xl">
        {/* Brand */}
        <div
          className="d-flex align-items-center gap-2 cursor-pointer text-decoration-none"
          onClick={() => onNavigate(userRole === 'admin' ? 'admin-dashboard' : 'welcome')}
          style={{ cursor: 'pointer' }}
        >
          <div className="bg-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '44px', height: '44px' }}>
            <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <span className="nacos-brand-title fs-5 d-block text-white">NACOS ELECTIONS</span>
            <span className="nacos-brand-sub">Electoral Commission</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="d-flex align-items-center gap-3 ms-auto">
          {currentUser && userRole === 'student' && studentProfile && (
            <div className="d-none d-md-flex align-items-center gap-2 text-white bg-black bg-opacity-25 py-1 px-3 rounded-pill border border-white border-opacity-10">
              <User size={16} className="text-warning" />
              <span className="fw-semibold small">{studentProfile.full_name}</span>
              <span className="badge bg-light text-dark font-monospace small">{studentProfile.matric_number}</span>
              {studentProfile.has_voted ? (
                <span className="badge bg-success d-flex align-items-center gap-1">
                  <CheckCircle2 size={12} /> Voted
                </span>
              ) : (
                <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                  <AlertCircle size={12} /> Not Voted
                </span>
              )}
            </div>
          )}

          {currentUser && userRole === 'admin' && (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-warning text-dark px-3 py-2 fw-bold">
                ADMIN: {adminProfile?.full_name || 'Electoral Commission'}
              </span>
            </div>
          )}

          {currentUser ? (
            <button
              onClick={logout}
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 rounded-pill px-3"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span className="d-none d-sm-inline">Sign Out</span>
            </button>
          ) : (
            <div className="d-flex gap-2">
              <button
                onClick={() => onNavigate('login')}
                className={`btn btn-sm ${currentPage === 'login' ? 'btn-light' : 'btn-outline-light'} rounded-pill px-3`}
              >
                Voter Login
              </button>
              <button
                onClick={() => onNavigate('admin-login')}
                className={`btn btn-sm ${currentPage === 'admin-login' ? 'btn-warning text-dark' : 'btn-outline-warning'} rounded-pill px-3`}
              >
                Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
