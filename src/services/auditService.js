import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const auditService = {
  /**
   * Fetches audit log records
   */
  async getAuditLogs(limit = 100) {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'log-1',
          admin_email: 'electoral_commission@nacos.org',
          action: 'ELECTION_STATUS_CHANGE',
          target_type: 'election',
          target_id: 'el-001',
          details: { old_status: 'DRAFT', new_status: 'OPEN' },
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'log-2',
          admin_email: 'electoral_commission@nacos.org',
          action: 'STUDENTS_IMPORTED',
          target_type: 'students',
          target_id: 'batch-01',
          details: { count: 84, cohort: 'Group 1' },
          created_at: new Date(Date.now() - 7200000).toISOString()
        }
      ];
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Logs an administrator event
   */
  async recordLog(action, targetType, targetId, details = {}) {
    if (!isSupabaseConfigured) return;

    const user = (await supabase.auth.getUser()).data.user;

    await supabase.from('audit_logs').insert([{
      admin_id: user?.id || null,
      admin_email: user?.email || 'system_admin',
      action,
      target_type: targetType,
      target_id: targetId,
      details
    }]);
  }
};
