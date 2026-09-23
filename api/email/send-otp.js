import { sendBrevoEmail } from '../_brevoClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, studentName, matricNumber, otpCode } = req.body || {};

  if (!email || !otpCode) {
    return res.status(400).json({ error: 'Recipient email and OTP code are required' });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { background-color: #ffffff; border-radius: 12px; max-width: 540px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #064E3B 0%, #04382A 100%); padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 0; font-size: 13px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 30px; text-align: center; }
        .otp-box { background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 18px; margin: 25px 0; font-size: 32px; font-family: monospace; font-weight: 800; color: #064e3b; letter-spacing: 8px; }
        .details { background-color: #f1f5f9; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; text-align: left; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>NACOS ELECTORAL COMMISSION</h1>
          <p>Official Voter Authorization Code</p>
        </div>
        <div class="body">
          <p style="font-size: 16px; margin-top: 0;">Hello, <strong>${studentName || 'Student Voter'}</strong></p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            You requested an authorization token to unlock your official electronic ballot. Enter the 6-digit verification code below on the voter verification screen:
          </p>

          <div class="otp-box">
            ${otpCode}
          </div>

          <div class="details">
            <strong>Matriculation Number:</strong> ${matricNumber || 'Registered Student'}<br>
            <strong>Security Rule:</strong> This code is single-use and expires shortly. Do not disclose this code to anyone.
          </div>

          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            If you did not initiate this ballot authorization request, please immediately contact the NACOS Electoral Commission desk.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Nigeria Association of Computing Students (NACOS).
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await sendBrevoEmail({
      toEmail: email.trim().toLowerCase(),
      toName: studentName || 'Student Voter',
      subject: `[NACOS Elections] Your Voter Verification Code: ${otpCode}`,
      htmlContent,
      textContent: `Your NACOS Voter Verification Code is: ${otpCode}. Matric: ${matricNumber || 'N/A'}`
    });

    return res.status(200).json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error('Brevo send OTP error:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch email via Brevo.' });
  }
}
