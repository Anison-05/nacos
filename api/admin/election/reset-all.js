import { getServiceSupabase } from '../../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { election_id, confirmation_phrase, reason } = req.body || {};

  if (!election_id) {
    return res.status(400).json({ error: 'election_id is required' });
  }

  if (confirmation_phrase !== 'RESET ELECTION') {
    return res.status(400).json({ error: 'Invalid confirmation phrase. Must be RESET ELECTION' });
  }

  try {
    const supabase = getServiceSupabase();

    // 1. Fetch election
    const { data: election } = await supabase
      .from('elections')
      .select('title')
      .eq('id', election_id)
      .single();

    // 2. Delete all votes
    const { error: delErr } = await supabase
      .from('votes')
      .delete()
      .eq('election_id', election_id);

    if (delErr) throw delErr;

    // 3. Reset student has_voted flags
    await supabase
      .from('students')
      .update({ has_voted: false, updated_at: new Date().toISOString() })
      .eq('has_voted', true);

    // 4. Create high-priority audit log
    await supabase.from('audit_logs').insert([{
      action: 'RESET_ALL_VOTES',
      target_type: 'election',
      target_id: election_id,
      details: {
        election_title: election?.title || 'Unknown',
        confirmation_phrase,
        reason: reason || 'Emergency election vote wipe'
      }
    }]);

    return res.status(200).json({
      success: true,
      message: 'All election votes have been purged and voter records reset.'
    });
  } catch (err) {
    console.error('Reset all votes error:', err);
    return res.status(500).json({ error: err.message || 'Failed to wipe election votes.' });
  }
}
