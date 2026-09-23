import { getServiceSupabase } from '../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matric_number } = req.body || {};
  if (!matric_number) {
    return res.status(400).json({ error: 'Matriculation number is required' });
  }

  try {
    const supabase = getServiceSupabase();
    const cleanMatric = matric_number.trim().toUpperCase().replace(/\s+/g, '');

    const { data, error } = await supabase
      .from('students')
      .select('id, matric_number, full_name, email, email_verified, eligible_to_vote, has_voted')
      .ilike('matric_number', cleanMatric)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Matriculation number not found in eligible voter register.' });
    }

    return res.status(200).json({
      matric_number: data.matric_number,
      full_name: data.full_name,
      email: data.email,
      email_verified: data.email_verified,
      eligible_to_vote: data.eligible_to_vote,
      has_voted: data.has_voted
    });
  } catch (err) {
    console.error('Lookup matric error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
