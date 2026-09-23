import { sendBrevoEmail } from '../_brevoClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, studentName, matricNumber, temporaryPassword } = req.body || {};

  if (!email || !matricNumber) {
    return res.status(400).json({ error: 'Email and Matriculation number are required.' });
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
        .body { padding: 30px; }
        .creds-box { background-color: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 14px; border-left: 4px solid #059669; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>NACOS ELECTORAL COMMISSION</h1>
          <p>Official Voter Registration Notice</p>
        </div>
        <div class="body">
          <p style="font-size: 16px; margin-top: 0;">Welcome, <strong>${studentName || 'Student Voter'}</strong></p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            You have been successfully registered in the eligible voter registry for the upcoming NACOS Central Executive Council elections.
          </p>

          <div class="creds-box">
            <strong>Matriculation Number:</strong> <span style="font-family: monospace;">${matricNumber}</span><br>
            <strong>Registered Email:</strong> ${email}<br>
            ${temporaryPassword ? `<strong>Temporary Password:</strong> <span style="font-family: monospace; font-weight: bold; color: #064e3b;">${temporaryPassword}</span><br>` : ''}
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
            To participate in the election, sign in to the voter portal using your matriculation number and authenticate with your email.
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
      subject: `[NACOS Elections] Voter Account Credentials & Invitation`,
      htmlContent,
      textContent: `Welcome ${studentName}. Your NACOS voter account is registered. Matric: ${matricNumber}.`
    });

    return res.status(200).json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error('Brevo send credentials error:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch email via Brevo.' });
  }
}
