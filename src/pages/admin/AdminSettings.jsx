import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { auditService } from '../../services/auditService';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Cpu,
  BadgeCheck,
  RefreshCw
} from 'lucide-react';

export function AdminSettings() {
  const { currentUser, adminProfile, refreshProfile } = useAuth();

  // Profile Form State
  const [fullName, setFullName] = useState(adminProfile?.full_name || '');
  const [email, setEmail] = useState(adminProfile?.email || currentUser?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim()) {
      setProfileError('Administrator full name cannot be blank.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setProfileError('Please enter a valid administrator email address.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await authService.updateAdminCredentials({
        adminId: currentUser?.id,
        fullName: fullName.trim(),
        newEmail: email.trim().toLowerCase()
      });

      await auditService.recordLog('UPDATE_ADMIN_PROFILE', 'admin_user', currentUser?.id, {
        new_name: fullName.trim(),
        new_email: email.trim().toLowerCase()
      });

      await refreshProfile();
      setProfileSuccess(res?.message || 'Administrator details updated successfully!');
    } catch (err) {
      setProfileError(err.message || 'Failed to update administrator profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.updateAdminCredentials({
        adminId: currentUser?.id,
        newPassword: newPassword
      });

      await auditService.recordLog('CHANGE_ADMIN_PASSWORD', 'admin_user', currentUser?.id, {
        action: 'Admin password successfully rotated'
      });

      setPasswordSuccess('Administrator password changed successfully! Use your new password on subsequent logins.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Administrator Settings & Credentials</h2>
          <p className="text-secondary small mb-0">
            Manage your overall controller profile, update your login email, and change security passwords
          </p>
        </div>
        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill fw-bold d-flex align-items-center gap-2">
          <BadgeCheck size={16} />
          <span>Overall System Controller</span>
        </span>
      </div>

      <div className="row g-4">
        {/* Left Column: Admin Profile Card & System Status */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body p-4 text-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm border border-3 border-success-subtle"
                style={{ width: '84px', height: '84px', backgroundColor: '#ecfdf5', color: '#064e3b' }}
              >
                <ShieldCheck size={42} />
              </div>

              <h5 className="fw-bold text-dark mb-1">{adminProfile?.full_name || 'Commission Admin'}</h5>
              <p className="text-muted small mb-2">{adminProfile?.email || currentUser?.email}</p>
              
              <div className="d-inline-flex align-items-center gap-1 px-3 py-1 bg-light rounded-pill border small fw-bold text-secondary mb-3">
                <Cpu size={14} className="text-success" />
                <span>{adminProfile?.role?.toUpperCase() || 'SUPER_ADMIN'}</span>
              </div>

              <div className="border-top pt-3 text-start small text-secondary">
                <div className="d-flex justify-content-between py-1">
                  <span>Controller Scope:</span>
                  <strong className="text-dark">Full System Access</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Candidate Controls:</span>
                  <strong className="text-success">Add / Edit / Delete</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Election Controls:</span>
                  <strong className="text-success">Full Governance</strong>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span>Account ID:</span>
                  <span className="font-monospace text-truncate" style={{ maxWidth: '140px' }}>
                    {currentUser?.id || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="card border-0 bg-emerald-subtle shadow-sm" style={{ borderRadius: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-start gap-3">
                <BadgeCheck size={24} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <h6 className="fw-bold text-dark mb-1">Overall System Controller</h6>
                  <p className="text-secondary small mb-0" style={{ lineHeight: 1.5 }}>
                    As the primary electoral administrator, changes made here take effect across the entire voting platform immediately. Always keep your password secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="col-12 col-lg-8">
          {/* Section 1: Update Login Email & Full Name */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
              <div className="d-flex align-items-center gap-2">
                <div className="p-2 bg-success-subtle text-success rounded-3">
                  <User size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0">Admin Profile & Login Email</h5>
                  <p className="text-muted small mb-0">Update the name and email address you use to sign in</p>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              {profileSuccess && (
                <div className="alert alert-success d-flex align-items-center gap-2 small py-2 px-3 rounded-3 mb-3">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 small py-2 px-3 rounded-3 mb-3">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-secondary">Administrator Full Name</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <User size={16} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Electoral Commission Chairman"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small text-secondary">Login Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Mail size={16} className="text-muted" />
                    </span>
                    <input
                      type="email"
                      className="form-control bg-light border-start-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nacos.org"
                      required
                    />
                  </div>
                  <div className="form-text small">
                    This email is used to log into the administrator console.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn btn-nacos-primary rounded-pill px-4 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                >
                  {profileSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Update Profile & Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Section 2: Change Password */}
          <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
              <div className="d-flex align-items-center gap-2">
                <div className="p-2 bg-success-subtle text-success rounded-3">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0">Change Administrator Password</h5>
                  <p className="text-muted small mb-0">Ensure your administrative access remains strictly protected</p>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              {passwordSuccess && (
                <div className="alert alert-success d-flex align-items-center gap-2 small py-2 px-3 rounded-3 mb-3">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 small py-2 px-3 rounded-3 mb-3">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword}>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-secondary">New Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control bg-light border-start-0 border-end-0"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-light border border-start-0 text-muted"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small text-secondary">Confirm New Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control bg-light border-start-0"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordSaving || !newPassword}
                  className="btn btn-dark rounded-pill px-4 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                >
                  {passwordSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
