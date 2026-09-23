import { getServiceSupabase } from '../../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matric_number, full_name, email, eligible_to_vote = true } = req.body || {};
  if (!matric_number || !full_name || !email) {
    return res.status(400).json({ error: 'Matric number, full name, and email are required.' });
  }

  try {
    const supabase = getServiceSupabase();
    const cleanMatric = matric_number.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const fullName = full_name.trim();

    // Check or create auth user
    let userId = null;
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingUser = userList?.users?.find((u) => u.email === cleanEmail);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const tempPassword = 'NacosVote#' + Math.random().toString(36).substring(2, 8) + '!';
      const { data: newUser, error: createAuthErr } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: false,
        user_metadata: { full_name: fullName, matric_number: cleanMatric }
      });
      if (createAuthErr) throw createAuthErr;
      userId = newUser.user.id;
    }

    const { data: student, error: studentErr } = await supabase
      .from('students')
      .upsert({
        id: userId,
        matric_number: cleanMatric,
        full_name: fullName,
        email: cleanEmail,
        eligible_to_vote,
        email_verified: false,
        has_voted: false
      }, { onConflict: 'matric_number' })
      .select()
      .single();

    if (studentErr) throw studentErr;

    return res.status(200).json(student);
  } catch (err) {
    console.error('Create student error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create student account.' });
  }
}
