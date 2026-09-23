import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) process.env[m[1]] = (m[2] || '').trim().replace(/^["']|["']$/g, '');
});

import { getServiceSupabase } from './api/_supabaseServer.js';

async function test() {
  const sb = getServiceSupabase();
  const { data: student, error: err } = await sb.from('students').select('*').limit(1).maybeSingle();
  console.log('Sample student in DB:', student);

  if (student?.email) {
    const linkRes = await sb.auth.admin.generateLink({ type: 'magiclink', email: student.email });
    console.log('Link error:', linkRes.error);
    console.log('Hashed token:', linkRes.data?.properties?.hashed_token);
  }
}

test();
