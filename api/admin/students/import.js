import { getServiceSupabase } from '../../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { students } = req.body || {};
  if (!Array.isArray(students) || !students.length) {
    return res.status(400).json({ error: 'Students array required' });
  }

  try {
    const supabase = getServiceSupabase();
    let importedCount = 0;
    let errors = [];

    for (const student of students) {
      const cleanMatric = student.matric_number.trim().toUpperCase();
      const cleanEmail = student.email.trim().toLowerCase();
      const fullName = student.full_name.trim();

      // Check if auth user already exists or create new one
      let userId = null;
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find((u) => u.email === cleanEmail);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Generate secure random temp password
        const tempPassword = 'NacosVote#' + Math.random().toString(36).substring(2, 8) + '!';
        const { data: newUser, error: createAuthErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: false,
          user_metadata: {
            full_name: fullName,
            matric_number: cleanMatric
          }
        });

        if (createAuthErr) {
          errors.push({ matric: cleanMatric, error: createAuthErr.message });
          continue;
        }
        userId = newUser.user.id;
      }

      // Upsert into students table
      const { error: upsertErr } = await supabase
        .from('students')
        .upsert({
          id: userId,
          matric_number: cleanMatric,
          full_name: fullName,
          email: cleanEmail,
          email_verified: false,
          eligible_to_vote: true,
          has_voted: false
        }, { onConflict: 'matric_number' });

      if (upsertErr) {
        errors.push({ matric: cleanMatric, error: upsertErr.message });
      } else {
        importedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      imported: importedCount,
      errors
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message || 'Bulk student import failed.' });
  }
}
