import { createClient } from '@supabase/supabase-js';
import { sendBrevoEmail } from '../_brevoClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matric_number, email } = req.body || {};

  if (!matric_number || !matric_number.trim()) {
    return res.status(400).json({ error: 'Matriculation number is required.' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanMatric = matric_number.trim().toUpperCase().replace(/\s+/g, '');
  const cleanEmail = email.trim().toLowerCase();

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hsseypgtulmecdvkmkgs.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tfzWkPHpsG7h7GyPdMM4pg_dPFHieOJ';
    const supabase = createClient(supabaseUrl, anonKey);

    // 1. Execute atomic verification and OTP generation in database
    const { data, error } = await supabase.rpc('voter_request_otp', {
      p_matric_number: cleanMatric,
      p_email: cleanEmail
    });

    if (error) {
      console.warn('voter_request_otp validation rejected:', error.message);
      return res.status(400).json({ error: error.message || 'Verification failed.' });
    }

    const { code, full_name, matric_number: studentMatric, email: studentEmail } = data;

    // 2. Dispatch verification code to student's verified linked email
    // Channel A: Official Brevo transactional email
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .card { background-color: #ffffff; border-radius: 12px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #064E3B 0%, #04382A 100%); padding: 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 0; font-size: 12px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1px; }
            .body { padding: 28px; text-align: center; }
            .otp-box { background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 32px; font-family: monospace; font-weight: 800; color: #064e3b; letter-spacing: 8px; }
            .details { background-color: #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; text-align: left; }
            .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>NACOS ELECTORAL COMMISSION</h1>
              <p>Official Voter Authorization Code</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Hello, <strong>${full_name || 'Student Voter'}</strong></p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
                You requested an authorization token to unlock your official electronic ballot. Enter this 6-digit code on the voter login screen:
              </p>

              <div class="otp-box">
                ${code}
              </div>

              <div class="details">
                <strong>Matriculation Number:</strong> ${studentMatric}<br>
                <strong>Security:</strong> Single-use code valid for 10 minutes. Never share this code.
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Nigeria Association of Computing Students (NACOS)
            </div>
          </div>
        </body>
        </html>
      `;

    let emailDispatched = false;
    let emailNotice = null;

    try {
      await sendBrevoEmail({
        toEmail: studentEmail,
        toName: full_name || 'Student Voter',
        subject: `[NACOS Elections] Your Voter Verification Code: ${code}`,
        htmlContent,
        textContent: `Your NACOS Voter Verification Code is: ${code}. Matric: ${studentMatric}`
      });
      emailDispatched = true;
    } catch (brevoErr) {
      console.warn('Brevo email dispatch notice:', brevoErr.message);
      emailNotice = brevoErr.message;
    }

    // Channel B: Supabase Auth mailer trigger
    try {
      await supabase.auth.signInWithOtp({
        email: studentEmail,
        options: { shouldCreateUser: false }
      });
    } catch (supaErr) {
      // Non-fatal secondary channel
    }

    return res.status(200).json({
      success: true,
      email_dispatched: emailDispatched,
      email_notice: emailNotice,
      matric_number: studentMatric,
      email: studentEmail,
      message: emailDispatched
        ? `A 6-digit verification code has been dispatched to ${studentEmail}.`
        : `Verification code generated. (Notice: Brevo mail service returned: "${emailNotice}". Please verify your Brevo API key activation in your Brevo dashboard).`
    });
  } catch (err) {
    console.error('voter-request-code handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing login.' });
  }
}
