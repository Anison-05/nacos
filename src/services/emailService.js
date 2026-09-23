/**
 * Client-Side Email Service
 * Dispatches transactional notifications via the server-side Brevo API endpoints
 */

export const emailService = {
  /**
   * Sends a 6-digit OTP code to a student's email
   */
  async sendOtpEmail({ email, studentName, matricNumber, otpCode }) {
    try {
      const response = await fetch('/api/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studentName, matricNumber, otpCode })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code via Brevo.');
      }
      return data;
    } catch (err) {
      console.warn('Brevo email dispatch notice:', err.message);
      // Fallback: don't block the UI if running locally without serverless functions
      return { success: false, fallback: true, error: err.message };
    }
  },

  /**
   * Sends voter credentials to a student upon onboarding
   */
  async sendCredentialsEmail({ email, studentName, matricNumber, temporaryPassword }) {
    try {
      const response = await fetch('/api/email/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studentName, matricNumber, temporaryPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch credentials email via Brevo.');
      }
      return data;
    } catch (err) {
      console.warn('Brevo credentials dispatch notice:', err.message);
      return { success: false, fallback: true, error: err.message };
    }
  }
};
