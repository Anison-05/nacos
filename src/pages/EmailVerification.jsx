import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export function EmailVerification({ onNavigate, email, matric }) {
  const { studentProfile, refreshProfile } = useAuth();
  const effectiveEmail = email || studentProfile?.email || '';
  const effectiveMatric = matric || studentProfile?.matric_number || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Countdown timer for resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (effectiveMatric) {
        await authService.verifyVoterOtp(effectiveMatric, effectiveEmail, otp.trim());
      } else {
        await authService.verifyOtp(effectiveEmail, otp.trim());
      }
      await refreshProfile();
      setMessage('Identity verified successfully! Redirecting to ballot...');
      setTimeout(() => {
        onNavigate('welcome');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError('');
    setMessage('');
    try {
      if (effectiveMatric) {
        await authService.requestVoterOtp(effectiveMatric, effectiveEmail);
      } else {
        await authService.resendVerification(effectiveEmail);
      }
      setMessage('A new verification code has been dispatched to your email.');
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container py-5 my-auto">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-5">
          <div className="card border-0 shadow-lg" style={{ borderRadius: '18px', overflow: 'hidden' }}>
            <div className="p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #04382A 100%)' }}>
              <div className="mx-auto mb-3 bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '64px', height: '64px' }}>
                <Mail size={32} className="text-success" />
              </div>
              <h4 className="fw-bold mb-1">Verify Your Email</h4>
              <p className="small mb-0" style={{ color: '#A7F3D0' }}>
                Verification required before ballot authorization
              </p>
            </div>

            <div className="card-body p-4 p-md-5">
              <p className="text-secondary small text-center mb-3">
                A 6-digit authorization code was sent to your registered department email address:
                <br />
                <strong className="text-dark fs-6 font-monospace">{effectiveEmail}</strong>
              </p>

              {effectiveMatric && (
                <div className="text-center mb-4">
                  <span className="badge bg-light text-secondary border font-monospace">
                    Matric: {effectiveMatric}
                  </span>
                </div>
              )}

              {message && (
                <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <div>{message}</div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-center d-block">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    id="input_otp_code"
                    maxLength="8"
                    className="form-control form-control-lg text-center font-monospace fw-bold letter-spacing-lg"
                    style={{ letterSpacing: '6px', fontSize: '1.5rem' }}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="btn_submit_otp"
                  className="btn btn-nacos-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Validating Token...</span>
                    </>
                  ) : (
                    <span>Confirm & Authorize Ballot</span>
                  )}
                </button>
              </form>

              <div className="d-flex justify-content-between align-items-center pt-3 border-top small">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 text-secondary d-flex align-items-center gap-1"
                  onClick={() => onNavigate('login')}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Login</span>
                </button>

                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 text-success fw-semibold d-flex align-items-center gap-1"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                >
                  <RefreshCw size={14} className={resending ? 'spin' : ''} />
                  <span>
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
