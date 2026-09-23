// ====================================================================
// Brevo (Sendinblue) Transactional Email Client
// ====================================================================

export async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('Server environment missing BREVO_API_KEY.');
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'electoral@nacos.org';
  const senderName = process.env.BREVO_SENDER_NAME || 'NACOS Electoral Commission';

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail
      }
    ],
    subject: subject,
    htmlContent: htmlContent,
    textContent: textContent || ''
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Brevo email API failed with status ${response.status}`);
  }

  return result;
}
