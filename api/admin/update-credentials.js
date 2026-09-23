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

    const authUpdates = {};
    if (email && email.trim().toLowerCase() !== adminRecord.email.toLowerCase()) {
      authUpdates.email = email.trim().toLowerCase();
      authUpdates.email_confirm = true; // Auto-confirm email so admin is not locked out
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      authUpdates.password = password.trim();
    }

    // 2. Update Supabase Auth user if email or password changed
    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(
        admin_id,
        authUpdates
      );

      if (authErr) {
        throw new Error(authErr.message || 'Failed to update auth credentials in Supabase Auth.');
      }
    }

    // 3. Update public.admin_users record if full_name or email changed
    const dbUpdates = {};
    if (full_name && full_name.trim()) {
      dbUpdates.full_name = full_name.trim();
    }
    if (email && email.trim()) {
      dbUpdates.email = email.trim().toLowerCase();
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error: dbErr } = await supabase
        .from('admin_users')
        .update(dbUpdates)
        .eq('id', admin_id);

      if (dbErr) {
        throw new Error(dbErr.message || 'Failed to update admin profile in database.');
      }
    }

    // 4. Log to audit_logs
    await supabase.from('audit_logs').insert([{
      admin_id: admin_id,
      admin_email: adminRecord.email,
      action: 'UPDATE_ADMIN_CREDENTIALS',
      target_type: 'admin_user',
      target_id: admin_id,
      details: {
        updated_fields: Object.keys({ ...authUpdates, ...dbUpdates }),
        previous_email: adminRecord.email,
        new_email: email ? email.trim().toLowerCase() : adminRecord.email
      }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Admin credentials updated successfully.',
      updated_email: email ? email.trim().toLowerCase() : adminRecord.email,
      updated_name: full_name ? full_name.trim() : adminRecord.full_name
    });
  } catch (err) {
    console.error('Update admin credentials error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
