import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { normalizeMatricNumber } from '../lib/matricValidator';

export const authService = {
  /**
   * Looks up registered student email by matriculation number
   * @param {string} rawMatric
   */
  async lookupStudentByMatric(rawMatric) {
    const matric = normalizeMatricNumber(rawMatric);
    if (!matric) {
      throw new Error('Please enter a valid matriculation number.');
    }

    if (!isSupabaseConfigured) {
      // Demo mock fallback if Supabase credentials are not yet entered
      return {
        email: `${matric.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.nacos.edu`,
        matric_number: matric,
        full_name: 'Student Demo Account',
        email_verified: true,
        eligible_to_vote: true,
        has_voted: false
      };
    }

    // Call server API or direct query with student table
    const { data, error } = await supabase
      .from('students')
      .select('id, matric_number, full_name, email, email_verified, eligible_to_vote, has_voted')
      .ilike('matric_number', matric)
      .maybeSingle();

    if (error) {
      throw new Error('Unable to verify matriculation number. Please try again.');
    }

    if (!data) {
      throw new Error('Matriculation number not found in eligible voter registry.');
    }

    return data;
  },

  /**
   * Authenticates a student via their matric number and password
   */
  async loginStudent(matric, password) {
    if (!matric || !password) {
      throw new Error('Matriculation number and password are required.');
    }

    // 1. Lookup registered email
    const student = await this.lookupStudentByMatric(matric);

    if (!isSupabaseConfigured) {
      return {
        user: { id: 'demo-student-id', email: student.email },
        profile: student
      };
    }

    // 2. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: student.email,
      password: password
    });

    if (authError) {
      throw new Error('Invalid matriculation number or password.');
    }

    // Check auth user's email confirmation status from Supabase Auth
    const isConfirmed = Boolean(authData.user.email_confirmed_at || student.email_verified);
    if (isConfirmed && !student.email_verified) {
      // Sync to students table
      await supabase
        .from('students')
        .update({ email_verified: true })
        .eq('id', authData.user.id);
      student.email_verified = true;
    }

    return {
      user: authData.user,
      session: authData.session,
      profile: student
    };
  },

  /**
   * Authenticates an administrator
   */
  async loginAdmin(email, password) {
    if (!email || !password) {
      throw new Error('Admin email and password are required.');
    }

    if (!isSupabaseConfigured) {
      return {
        user: { id: 'demo-admin-id', email },
        adminProfile: { role: 'super_admin', full_name: 'Electoral Commission Admin' }
      };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (authError) {
      throw new Error('Invalid administrator credentials.');
    }

    // Verify user is in admin_users table
    const { data: adminRecord, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (adminErr || !adminRecord) {
      await supabase.auth.signOut();
      throw new Error('Access denied. This account does not possess administrator privileges.');
    }

    return {
      user: authData.user,
      session: authData.session,
      adminProfile: adminRecord
    };
  },

  /**
   * Verifies email using 6-digit OTP code or token
   */
  async verifyOtp(email, token) {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'signup'
    });

    if (error) {
      // Try 'email' type if signup fails
      const retry = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email'
      });
      if (retry.error) {
        throw new Error(retry.error.message || 'Invalid or expired verification code.');
      }
    }

    // Update students table email_verified status
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await supabase
        .from('students')
        .update({ email_verified: true })
        .eq('id', user.id);
    }

    return { success: true };
  },

  /**
   * Resends email verification
   */
  async resendVerification(email) {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase()
    });

    if (error) {
      throw new Error(error.message || 'Unable to resend verification email at this time.');
    }
    return { success: true };
  },

  /**
   * Sends password reset link
   */
  async requestPasswordReset(email) {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw new Error(error.message || 'Unable to send password reset link.');
    }
    return { success: true };
  },

  /**
   * Gets current user session and student profile
   */
  async getCurrentSession() {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('nacos_mock_user');
      return stored ? JSON.parse(stored) : null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Check if admin
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminRecord) {
      return {
        user: session.user,
        role: 'admin',
        adminProfile: adminRecord
      };
    }

    // Check if student
    const { data: studentRecord } = await supabase
      .from('students')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return {
      user: session.user,
      role: 'student',
      profile: studentRecord
    };
  },

  /**
   * Logs out current user
   */
  async logout() {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('nacos_mock_user');
      return;
    }
    await supabase.auth.signOut();
  },

  /**
   * Updates admin profile credentials (name, email, password)
   */
  async updateAdminCredentials({ adminId, fullName, newEmail, newPassword }) {
    if (!isSupabaseConfigured) {
      return { success: true, message: 'Admin credentials updated (demo mode).' };
    }

    // Try backend API first (handles auto-confirmation and service role override)
    try {
      const response = await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          full_name: fullName,
          email: newEmail,
          password: newPassword
        })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (apiErr) {
      console.warn('API update-credentials call unavailable, falling back to direct client SDK:', apiErr);
    }

    // Fallback: Direct Supabase Client SDK
    const updates = {};
    if (newEmail) updates.email = newEmail.trim().toLowerCase();
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      updates.password = newPassword.trim();
    }

    if (Object.keys(updates).length > 0) {
      const { error: authErr } = await supabase.auth.updateUser(updates);
      if (authErr) throw authErr;
    }

    const dbUpdates = {};
    if (fullName) dbUpdates.full_name = fullName.trim();
    if (newEmail) dbUpdates.email = newEmail.trim().toLowerCase();

    if (Object.keys(dbUpdates).length > 0) {
      const { error: dbErr } = await supabase
        .from('admin_users')
        .update(dbUpdates)
        .eq('id', adminId);
      if (dbErr) throw dbErr;
    }

    return { success: true, message: 'Admin profile updated successfully.' };
  }
};
