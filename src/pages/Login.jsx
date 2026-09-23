import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateMatricNumber } from '../lib/matricValidator';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, HelpCircle } from 'lucide-react';

export function Login({ onNavigate }) {
  const { loginStudent } = useAuth();
  const [matricNumber, setMatricNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldValidation, setFieldValidation] = useState(null);

  const handleMatricChange = (e) => {
    const val = e.target.value.toUpperCase();
    setMatricNumber(val);
    setError('');
    if (val.length >= 8) {
      const res = validateMatricNumber(val);
      setFieldValidation(res);
    } else {
      setFieldValidation(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validation = validateMatricNumber(matricNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid matriculation number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginStudent(matricNumber, password);
      // Check if email verified
      if (!result.profile?.email_verified) {
        onNavigate('verify-email', { email: result.profile?.email, matric: matricNumber });
      } else {
        onNavigate('welcome');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-auto">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '18px', overflow: 'hidden' }}>
            {/* Card Header Banner */}
            <div className="p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #04382A 100%)' }}>
              <div className="mx-auto mb-3 bg-white rounded-circle p-1 d-flex align-items-center justify-content-center shadow" style={{ width: '84px', height: '84px' }}>
                <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h4 className="fw-bold mb-1">Student Voter Portal</h4>
              <p className="text-emerald-100 small mb-0" style={{ color: '#A7F3D0' }}>
                Nigeria Association of Computing Students (NACOS)
              </p>
            </div>

            {/* Card Body */}
            <div className="card-body p-4 p-md-5">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small" role="alert">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Matric Number */}
                <div className="mb-3">
                  <label className="form-label fw-bold text-dark small">
                    Matriculation Number
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <User size={18} className="text-secondary" />
                    </span>
                    <input
                      type="text"
                      id="login_matric_number"
                      className={`form-control border-start-0 font-monospace ${
                        fieldValidation ? (fieldValidation.isValid ? 'is-valid' : 'is-invalid') : ''
                      }`}
                      placeholder="e.g. FPA/CS/24/1-0042"
                      value={matricNumber}
                      onChange={handleMatricChange}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-text" style={{ fontSize: '0.78rem' }}>
                    Supported cohorts: Group 1 (24/1-0001 to 0084) & Group 2 (25/1-0001 to 0142)
                  </div>
                </div>

                {/* Password */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold text-dark small mb-0">
                      Password
                    </label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none small text-secondary"
                      onClick={() => onNavigate('forgot-password')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={18} className="text-secondary" />
                    </span>
                    <input
                      type="password"
                      id="login_password"
                      className="form-control border-start-0"
                      placeholder="Enter your secret password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="btn_login_submit"
                  className="btn btn-nacos-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Vote</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Informational Guidance */}
              <div className="bg-light p-3 rounded-3 border small text-secondary mt-3">
                <div className="d-flex align-items-center gap-2 text-dark fw-bold mb-1">
                  <HelpCircle size={15} className="text-primary" />
                  <span>Important Voter Information:</span>
                </div>
                <ul className="mb-0 ps-3" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <li>Your matric number is tied to your verified departmental email.</li>
                  <li>Every student is permitted to submit a ballot <strong>exactly once</strong>.</li>
                  <li>Unverified email accounts will be prompted for OTP confirmation.</li>
                </ul>
              </div>
            </div>

            {/* Card Footer */}
            <div className="card-footer bg-white border-top p-3 text-center small text-muted">
              Official NACOS Electoral Commission &bull; Secure Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
