import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Custom Vite plugin to handle /api/auth/voter-request-code in local development
function apiDevPlugin(env) {
  return {
    name: 'api-dev-server-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/auth/voter-request-code' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { matric_number, email } = JSON.parse(body || '{}');
              const cleanMatric = (matric_number || '').trim().toUpperCase().replace(/\s+/g, '');
              const cleanEmail = (email || '').trim().toLowerCase();

              if (!cleanMatric || !cleanEmail) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Matriculation number and email are required.' }));
              }

              const supabaseUrl = env.VITE_SUPABASE_URL || 'https://hsseypgtulmecdvkmkgs.supabase.co';
              const anonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tfzWkPHpsG7h7GyPdMM4pg_dPFHieOJ';
              const supabase = createClient(supabaseUrl, anonKey);

              // 1. Invoke atomic PostgreSQL stored procedure
              const { data, error } = await supabase.rpc('voter_request_otp', {
                p_matric_number: cleanMatric,
                p_email: cleanEmail
              });

              if (error) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: error.message || 'Verification failed.' }));
              }

              const { code, full_name, matric_number: studentMatric, email: studentEmail } = data;

              let emailDispatched = false;
              let emailNotice = null;

              // 2. Dispatch email via Brevo REST API if configured
              const brevoKey = env.BREVO_API_KEY;
              if (brevoKey) {
                try {
                  const bRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                      'api-key': brevoKey,
                      'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                      sender: {
                        name: env.BREVO_SENDER_NAME || 'NACOS Electoral Commission',
                        email: env.BREVO_SENDER_EMAIL || 'simonenoch02@gmail.com'
                      },
                      to: [{ email: studentEmail, name: full_name || studentEmail }],
                      subject: `[NACOS Elections] Your Voter Verification Code: ${code}`,
                      htmlContent: `<h2>NACOS Electoral Commission</h2><p>Your voter verification code is: <strong>${code}</strong> for matric ${studentMatric}. Code is valid for 10 minutes.</p>`,
                      textContent: `Your NACOS Voter Verification Code is: ${code}. Matric: ${studentMatric}`
                    })
                  });
                  const bJson = await bRes.json();
                  if (bRes.ok) {
                    emailDispatched = true;
                  } else {
                    emailNotice = bJson.message || `Brevo returned HTTP ${bRes.status}`;
                    console.warn('Brevo email dispatch notice (dev):', emailNotice);
                  }
                } catch (bErr) {
                  emailNotice = bErr.message;
                  console.warn('Brevo email dispatch notice (dev):', bErr.message);
                }
              }

              // 3. Trigger secondary Supabase OTP mailer
              try {
                await supabase.auth.signInWithOtp({
                  email: studentEmail,
                  options: { shouldCreateUser: false }
                });
              } catch (sErr) {
                // Secondary non-blocking channel
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: true,
                email_dispatched: emailDispatched,
                email_notice: emailNotice,
                matric_number: studentMatric,
                email: studentEmail,
                message: emailDispatched
                  ? `A 6-digit verification code has been dispatched to ${studentEmail}.`
                  : `Verification code generated. (Notice: Brevo returned "${emailNotice}". Please verify your Brevo API key activation).`
              }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message || 'Internal server error processing login.' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), apiDevPlugin(env)]
  };
});
