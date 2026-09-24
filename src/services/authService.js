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
      throw new Error('Supabase is not configured.');
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
   * Requests a voter verification code via Matric Number + Email
   * Checks database public.students and dispatches code to linked email
   */
  async requestVoterOtp(rawMatric, rawEmail) {
    const cleanMatric = (rawMatric || '').trim().toUpperCase().replace(/\s+/g, '');
    const cleanEmail = (rawEmail || '').trim().toLowerCase();

    if (!cleanMatric) {
      throw new Error('Please enter your matriculation number.');
    }
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // Attempt dispatch via serverless API route first (for transactional Brevo email delivery)
    try {
      const response = await fetch('/api/auth/voter-request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matric_number: cleanMatric, email: cleanEmail })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to dispatch verification code.');
      }

      return result;
    } catch (apiErr) {
      // If serverless endpoint returned a business logic validation error, throw it immediately
      if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('NetworkError') && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }

      console.warn('API endpoint unavailable, falling back to direct PostgreSQL RPC:', apiErr.message);

      // Direct Database Stored Procedure Fallback
      const { data, error } = await supabase.rpc('voter_request_otp', {
        p_matric_number: cleanMatric,
        p_email: cleanEmail
      });

      if (error) {
        throw new Error(error.message || 'Authentication failed. Please verify your credentials.');
      }

      // Trigger Supabase secondary email delivery
      try {
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false }
        });
      } catch (otpErr) {
        // Non-blocking
      }

      return {
        success: true,
        matric_number: data.matric_number,
        email: data.email,
        message: `Verification code dispatched to ${data.email}.`
      };
    }
  },

  /**
   * Verifies the 6-digit voter code, confirms email, syncs auth.users, and signs in to Supabase Auth
   */
  async verifyVoterOtp(rawMatric, rawEmail, rawCode) {
    const cleanMatric = (rawMatric || '').trim().toUpperCase().replace(/\s+/g, '');
    const cleanEmail = (rawEmail || '').trim().toLowerCase();
    const cleanCode = (rawCode || '').trim();

    if (!cleanMatric || !cleanEmail || !cleanCode) {
      throw new Error('Matriculation number, email, and 6-digit verification code are required.');
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // 1. Verify code and obtain deterministic voter session secret from PostgreSQL
    const { data: verifyData, error: verifyErr } = await supabase.rpc('voter_verify_otp', {
      p_matric_number: cleanMatric,
      p_email: cleanEmail,
      p_code: cleanCode
    });

    if (verifyErr) {
      throw new Error(verifyErr.message || 'Invalid or expired verification code.');
    }

    // 2. Sign in to Supabase Auth with returned voter credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: verifyData.email,
      password: verifyData.auth_secret
    });

    if (authError) {
      console.error('Supabase GoTrue sign in error after OTP verification:', authError);
      throw new Error('Session establishment failed. Please request a new verification code.');
    }

    return {
      user: authData.user,
      session: authData.session,
      profile: verifyData.student
    };
  },

  /**
   * Authenticates a student via their matric number and password (legacy fallback)
   */
  async loginStudent(matric, password) {
    if (!matric || !password) {
      throw new Error('Matriculation number and password are required.');
    }

    // 1. Lookup registered email
    const student = await this.lookupStudentByMatric(matric);

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // 2. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: student.email,
      password: password
    });

    if (authError) {
      throw new Error('Invalid matriculation number or password.');
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
      throw new Error('Supabase is not configured. Real Supabase Authentication is strictly required.');
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
      return null;
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
      return;
    }
    await supabase.auth.signOut();
  },

  /**
   * Updates admin profile credentials (name, email, password)
   * Executes atomic database-level update in Supabase Auth & public.admin_users
   */
  async updateAdminCredentials({ adminId, fullName, newEmail, newPassword }) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Admin credentials require an active Supabase connection.');
    }

    // 1. Call atomic RPC procedure in Supabase (updates auth.users, auth.identities, admin_users, audit_logs)
    const { data, error } = await supabase.rpc('admin_update_credentials', {
      p_new_email: newEmail ? newEmail.trim().toLowerCase() : null,
      p_new_password: newPassword ? newPassword.trim() : null,
      p_full_name: fullName ? fullName.trim() : null
    });

    if (error) {
      console.error('admin_update_credentials RPC error:', error);
      throw new Error(error.message || 'Failed to update administrative credentials in Supabase.');
    }

    // 2. Refresh active Supabase Auth session so the client holds the updated email / claims
    try {
      await supabase.auth.refreshSession();
    } catch (refreshErr) {
      console.warn('Session refresh notice:', refreshErr);
    }

    return data || { success: true, message: 'Admin credentials updated successfully in Supabase Auth.' };
  }
};
