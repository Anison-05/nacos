import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { normalizeMatricNumber } from '../lib/matricValidator';

export const studentService = {
  /**
   * Fetches students with filtering, searching, and pagination
   */
  async getStudents({ search = '', filterEligibility = 'ALL', filterVoted = 'ALL' } = {}) {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'demo-s-1',
          matric_number: 'FPA/CS/24/1-0001',
          full_name: 'ABDULRAHMAN YUSUF',
          email: 'abdulrahman@student.nacos.edu',
          email_verified: true,
          eligible_to_vote: true,
          has_voted: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-s-2',
          matric_number: 'FPA/CS/24/1-0015',
          full_name: 'CHIDINMA CYNTHIA EZE',
          email: 'chidinma@student.nacos.edu',
          email_verified: true,
          eligible_to_vote: true,
          has_voted: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-s-3',
          matric_number: 'FPA/CS/25/1-0050',
          full_name: 'OLUWASEUN DAVID ADELEKE',
          email: 'oluwaseun@student.nacos.edu',
          email_verified: false,
          eligible_to_vote: true,
          has_voted: false,
          created_at: new Date().toISOString()
        }
      ];
    }

    let query = supabase
      .from('students')
      .select('*')
      .order('matric_number', { ascending: true });

    if (search.trim()) {
      const term = search.trim();
      query = query.or(`matric_number.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    if (filterEligibility === 'ELIGIBLE') {
      query = query.eq('eligible_to_vote', true);
    } else if (filterEligibility === 'INELIGIBLE') {
      query = query.eq('eligible_to_vote', false);
    }

    if (filterVoted === 'VOTED') {
      query = query.eq('has_voted', true);
    } else if (filterVoted === 'NOT_VOTED') {
      query = query.eq('has_voted', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Adds a student manually
   */
  async addStudentManual({ matric_number, full_name, email, eligible_to_vote = true }) {
    const matric = normalizeMatricNumber(matric_number);
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      return {
        id: 'mock-student-' + Date.now(),
        matric_number: matric,
        full_name,
        email: cleanEmail,
        eligible_to_vote,
        has_voted: false,
        email_verified: false
      };
    }

    // Try calling Serverless API route if available, or direct insert
    try {
      const resp = await fetch('/api/admin/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matric_number: matric, full_name, email: cleanEmail, eligible_to_vote })
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // Fallback to Supabase direct client if running without local API proxy
    }

    const { data, error } = await supabase
      .from('students')
      .insert([{
        matric_number: matric,
        full_name: full_name.trim(),
        email: cleanEmail,
        eligible_to_vote,
        email_verified: false,
        has_voted: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates student information
   */
  async updateStudent(id, updates) {
    if (updates.matric_number) {
      updates.matric_number = normalizeMatricNumber(updates.matric_number);
    }
    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (!isSupabaseConfigured) return { id, ...updates };

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a student from registry
   */
  async deleteStudent(id) {
    if (!isSupabaseConfigured) return true;
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  /**
   * Batch imports students from CSV
   */
  async importStudents(studentsList) {
    if (!isSupabaseConfigured) {
      return {
        imported: studentsList.length,
        skipped: 0
      };
    }

    // Try server API first (which provisions Supabase Auth accounts)
    try {
      const resp = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsList })
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // Fallback
    }

    // Supabase direct upsert fallback
    const payload = studentsList.map((s) => ({
      matric_number: normalizeMatricNumber(s.matric_number),
      full_name: s.full_name.trim(),
      email: s.email.trim().toLowerCase(),
      eligible_to_vote: true,
      has_voted: false,
      email_verified: false
    }));

    const { data, error } = await supabase
      .from('students')
      .upsert(payload, { onConflict: 'matric_number' })
      .select();

    if (error) throw error;
    return {
      imported: data ? data.length : studentsList.length,
      skipped: 0
    };
  },

  /**
   * Resets an individual voter's status and deletes their vote records (with confirmation & audit log)
   */
  async resetVoter(studentId, electionId, reason) {
    if (!isSupabaseConfigured) {
      return { success: true, message: 'Voter reset simulated successfully.' };
    }

    const { data, error } = await supabase.rpc('admin_reset_voter', {
      p_student_id: studentId,
      p_election_id: electionId || null,
      p_reason: reason || 'Administrative voter status reset'
    });

    if (error) throw error;
    return data;
  },

  /**
   * Destructive: Resets all votes for an election
   */
  async resetAllVotes(electionId, confirmationPhrase, reason) {
    if (!isSupabaseConfigured) {
      return { success: true, message: 'All votes purge simulated successfully.' };
    }

    const { data, error } = await supabase.rpc('admin_reset_all_votes', {
      p_election_id: electionId,
      p_confirmation_phrase: confirmationPhrase,
      p_reason: reason || 'Complete election vote wipe'
    });

    if (error) throw error;
    return data;
  }
};
