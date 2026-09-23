import { getServiceSupabase } from '../../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { student_id, election_id, reason } = req.body || {};
  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  try {
    const supabase = getServiceSupabase();

    // 1. Delete student's votes
    if (election_id) {
      await supabase.from('votes').delete().match({ student_id, election_id });
    } else {
      await supabase.from('votes').delete().match({ student_id });
    }

    // 2. Clear has_voted flag
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .update({ has_voted: false, updated_at: new Date().toISOString() })
      .eq('id', student_id)
      .select()
      .single();

    if (studentErr) throw studentErr;

    // 3. Log to audit trail
    await supabase.from('audit_logs').insert([{
      action: 'RESET_VOTER',
      target_type: 'student',
      target_id: student_id,
      details: {
        matric_number: student.matric_number,
        student_name: student.full_name,
        reason: reason || 'Administrative voter status reset'
      }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Voter status reset successfully.',
      student
    });
  } catch (err) {
    console.error('Reset voter error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset voter.' });
  }
}
