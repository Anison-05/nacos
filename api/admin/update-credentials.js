import { getServiceSupabase } from '../_supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { admin_id, full_name, email, password } = req.body || {};

  if (!admin_id) {
    return res.status(400).json({ error: 'admin_id is required' });
  }

  try {
    const supabase = getServiceSupabase();

    // 1. Verify this user exists in public.admin_users
    const { data: adminRecord, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('id', admin_id)
      .single();

    if (adminErr || !adminRecord) {
      return res.status(403).json({ error: 'Admin record not found or access denied.' });
    }

    // Call atomic RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_update_credentials', {
      p_new_email: email ? email.trim().toLowerCase() : null,
      p_new_password: password ? password.trim() : null,
      p_full_name: full_name ? full_name.trim() : null
    });

    if (rpcErr) {
      throw new Error(rpcErr.message || 'Failed to update admin credentials in database.');
    }

    return res.status(200).json({
      success: true,
      message: 'Admin credentials updated successfully in Supabase Auth.',
      updated_email: email ? email.trim().toLowerCase() : adminRecord.email,
      updated_name: full_name ? full_name.trim() : adminRecord.full_name
    });
  } catch (err) {
    console.error('Update admin credentials error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
