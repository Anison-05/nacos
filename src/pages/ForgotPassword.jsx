import React, { useState } from 'react';
import { authService } from '../services/authService';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';

export function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered department email.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authService.requestPasswordReset(email.trim());
      setMessage('Password reset instructions have been forwarded to your registered email.');
    } catch (err) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-auto">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-5">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '18px', overflow: 'hidden' }}>
            <div className="p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #04382A 100%)' }}>
              <div className="mx-auto mb-3 bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '64px', height: '64px' }}>
                <KeyRound size={32} className="text-success" />
              </div>
              <h4 className="fw-bold mb-1">Reset Password</h4>
              <p className="small mb-0" style={{ color: '#A7F3D0' }}>
                Account security & credential recovery
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              {message && (
                <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small mb-3">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <div>{message}</div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small mb-3">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small">
                    Registered Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={18} className="text-secondary" />
                    </span>
                    <input
                      type="email"
                      className="form-control border-start-0"
                      placeholder="student@student.nacos.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-text small">
                    Enter the email registered with your matriculation number.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-nacos-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <span>Send Reset Instructions</span>
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
                  <span>Return to Voter Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
