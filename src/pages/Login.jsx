import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateMatricNumber } from '../lib/matricValidator';
import {
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  KeyRound,
  RotateCw
} from 'lucide-react';

export function Login({ onNavigate }) {
  const { requestVoterOtp, loginVoter } = useAuth();

  // Multi-step authentication state: 'CREDENTIALS' | 'VERIFY_OTP'
  const [step, setStep] = useState('CREDENTIALS');
  const [matricNumber, setMatricNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailNotice, setEmailNotice] = useState(null);
  const [fieldValidation, setFieldValidation] = useState(null);

  // Countdown timer for code resend cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleMatricChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/\s+/g, '');
    setMatricNumber(val);
    setError('');
    if (val.length >= 8) {
      const res = validateMatricNumber(val);
      setFieldValidation(res);
    } else {
      setFieldValidation(null);
    }
  };

  // Step 1: Request Verification Code (Validates Matric + Linked Email)
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanMatric = matricNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const validation = validateMatricNumber(cleanMatric);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid matriculation number.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestVoterOtp(cleanMatric, cleanEmail);
      setStep('VERIFY_OTP');
      setResendCooldown(60);
      setEmailNotice(res.email_notice || null);
      setSuccessMsg(res.message || `A 6-digit verification code was sent to ${cleanEmail}.`);
    } catch (err) {
      console.warn('Voter credentials verification failed:', err);
      setError(err.message || 'Credentials do not match an eligible voter record.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code and Establish Supabase Voter Session
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginVoter(matricNumber, email, cleanCode);
      setSuccessMsg('Verification successful! Opening your electronic ballot...');
      setTimeout(() => {
        onNavigate('welcome');
      }, 700);
    } catch (err) {
      console.error('Voter code verification error:', err);
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code handler
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await requestVoterOtp(matricNumber, email);
      setResendCooldown(60);
      setEmailNotice(res?.email_notice || null);
      setSuccessMsg(res?.message || `A new verification code was sent to ${email.trim().toLowerCase()}.`);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again shortly.');
    } finally {
      setResending(false);
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

              {successMsg && (
                <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small" role="alert">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <div>{successMsg}</div>
                </div>
              )}

              {step === 'CREDENTIALS' ? (
                /* ================= STEP 1: MATRIC + EMAIL ================= */
                <form onSubmit={handleRequestCode}>
                  <p className="text-secondary small mb-4">
                    Enter your <strong>Matriculation Number</strong> and the <strong>Email</strong> linked to your student record. A single-use verification code will be sent to confirm your identity.
                  </p>

                  {/* Matric Number Field */}
                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark small" htmlFor="login_matric_number">
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
                        autoFocus
                      />
                    </div>
                    <div className="form-text" style={{ fontSize: '0.78rem' }}>
                      Format: FPA/CS/24/1-XXXX (ND2) or FPA/CS/25/1-XXXX (ND1)
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark small" htmlFor="login_email">
                      Linked Email Address
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Mail size={18} className="text-secondary" />
                      </span>
                      <input
                        type="email"
                        id="login_email"
                        className="form-control border-start-0"
                        placeholder="e.g. yourname@gmail.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="form-text" style={{ fontSize: '0.78rem' }}>
                      Must match the email registered under your matric number.
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="btn_request_code"
                    className="btn btn-nacos-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Verifying Student Registry...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ================= STEP 2: VERIFICATION CODE ================= */
                <form onSubmit={handleVerifyCode}>
                  <div className="text-center mb-3">
                    <div className="d-inline-flex p-2 bg-success bg-opacity-10 text-success rounded-circle mb-2">
                      <KeyRound size={26} />
                    </div>
                    <h6 className="fw-bold text-dark mb-1">Enter Verification Code</h6>
                    <p className="text-secondary small mb-2">
                      Code dispatched to:
                      <br />
                      <strong className="text-dark font-monospace">{email.trim().toLowerCase()}</strong>
                    </p>
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                      <span className="badge bg-light text-secondary border font-monospace">
                        Matric: {matricNumber}
                      </span>
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 small text-primary d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => {
                          setStep('CREDENTIALS');
                          setOtpCode('');
                          setError('');
                          setSuccessMsg('');
                        }}
                      >
                        <ArrowLeft size={13} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Mail Service Notice (If Brevo returned an issue) */}
                  {emailNotice && (
                    <div className="alert alert-warning py-2 px-3 small text-start mb-3" style={{ fontSize: '0.8rem' }}>
                      <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                        <AlertCircle size={14} />
                        <span>Brevo Mail Service Notice:</span>
                      </div>
                      <div className="font-monospace text-dark bg-white p-1 rounded border mb-1" style={{ fontSize: '0.75rem' }}>
                        {emailNotice}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
                        Please verify that your Brevo API key is enabled in the Brevo dashboard under <strong>Settings &gt; SMTP &amp; API</strong>, and that <code>{email}</code> is verified under <strong>Senders</strong>.
                      </div>
                    </div>
                  )}

                  {/* 6-Digit OTP Input */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark small text-center d-block" htmlFor="login_otp_code">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      id="login_otp_code"
                      maxLength="8"
                      className="form-control form-control-lg text-center font-monospace fw-bold"
                      style={{ fontSize: '1.6rem', letterSpacing: '0.4rem' }}
                      placeholder="------"
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                        setError('');
                      }}
                      disabled={loading}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Verify & Enter Button */}
                  <button
                    type="submit"
                    id="btn_verify_code"
                    className="btn btn-nacos-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Validating Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Verify Code & Enter Portal</span>
                      </>
                    )}
                  </button>

                  {/* Resend Code Section */}
                  <div className="text-center pt-2">
                    {resendCooldown > 0 ? (
                      <span className="text-muted small">
                        Resend available in <strong className="text-dark">{resendCooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 text-success small d-inline-flex align-items-center gap-1 fw-bold"
                        onClick={handleResend}
                        disabled={resending}
                      >
                        <RotateCw size={14} className={resending ? 'spinner-border spinner-border-sm' : ''} />
                        <span>Didn't get code? Resend Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Informational Guidance */}
              <div className="bg-light p-3 rounded-3 border small text-secondary mt-4">
                <div className="d-flex align-items-center gap-2 text-dark fw-bold mb-1">
                  <HelpCircle size={15} className="text-primary" />
                  <span>Important Voter Information:</span>
                </div>
                <ul className="mb-0 ps-3" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <li>Your matric number and email must match your registered department record.</li>
                  <li>Every student is permitted to submit a ballot <strong>exactly once</strong>.</li>
                  <li>If your email is missing, please contact the NACOS Electoral Commission desk.</li>
                </ul>
              </div>

              {/* Link to Admin Command Center Login */}
              <div className="text-center pt-3 border-top mt-3">
                <button
                  type="button"
                  id="link_to_admin_login"
                  className="btn btn-link text-decoration-none p-0 text-success small d-inline-flex align-items-center gap-1 fw-bold"
                  onClick={() => onNavigate('admin-login')}
                >
                  <ShieldCheck size={16} />
                  <span>Electoral Commission Admin Login &rarr;</span>
                </button>
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
