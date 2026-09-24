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

    // Clean payload
    const payload = students.map((s) => ({
      matric_number: (s.matric_number || '').trim().toUpperCase(),
      full_name: s.full_name ? s.full_name.trim() : null,
      email: s.email ? s.email.trim().toLowerCase() : null
    }));

    // 1. Execute atomic bulk upsert in PostgreSQL
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('admin_bulk_upsert_students', {
      p_students: payload
    });

    if (rpcErr) {
      console.error('RPC admin_bulk_upsert_students error:', rpcErr);
      return res.status(500).json({ error: rpcErr.message || 'Failed to bulk upsert students' });
    }

    return res.status(200).json({
      success: true,
      imported: rpcResult?.inserted || 0,
      updated: rpcResult?.updated || 0,
      total: rpcResult?.total || 0,
      skipped: rpcResult?.skipped || 0
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message || 'Bulk student import failed.' });
  }
}
