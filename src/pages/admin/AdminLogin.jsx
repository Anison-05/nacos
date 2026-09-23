import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

export function AdminLogin({ onNavigate }) {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide administrative email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(email.trim(), password);
      onNavigate('admin-dashboard');
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || 'Administrative authentication failed. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-auto">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-5">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '18px', overflow: 'hidden' }}>
            {/* Header */}
            <div className="p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
              <div className="mx-auto mb-3 bg-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow" style={{ width: '84px', height: '84px' }}>
                <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h4 className="fw-bold mb-1">Electoral Commission Command</h4>
              <p className="text-secondary small mb-0">
                Restricted Administrative Control Center
              </p>
            </div>

            {/* Body */}
            <div className="card-body p-4 p-md-5">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small mb-4">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-bold text-dark small">
                    Admin Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={18} className="text-secondary" />
                    </span>
                    <input
                      type="email"
                      id="admin_email"
                      className="form-control border-start-0"
                      placeholder="admin@nacos.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small">
                    Admin Master Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={18} className="text-secondary" />
                    </span>
                    <input
                      type="password"
                      id="admin_password"
                      className="form-control border-start-0"
                      placeholder="Enter administrator password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn_admin_login"
                  className="btn btn-dark w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Authenticating Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Command Center</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 text-secondary small d-inline-flex align-items-center gap-1"
                  onClick={() => onNavigate('login')}
                >
                  <ArrowLeft size={14} />
                  <span>Switch to Student Voter Login</span>
                </button>
              </div>
            </div>

            <div className="card-footer bg-light p-3 text-center small text-muted">
              Secure RBAC Enforced &bull; All administrative actions are permanently logged
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
