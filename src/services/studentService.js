import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { normalizeMatricNumber, getStudentCohort } from '../lib/matricValidator';

export const studentService = {
  /**
   * Fetches students with filtering, searching, and cohort detection
   */
  async getStudents({
    search = '',
    filterEligibility = 'ALL',
    filterVoted = 'ALL',
    filterCohort = 'ALL',
    filterEmailStatus = 'ALL'
  } = {}) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    let query = supabase
      .from('students')
      .select('*')
      .order('matric_number', { ascending: true });

    // Multi-field search (Matric, Name, Email)
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`matric_number.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    // Eligibility Filter
    if (filterEligibility === 'ELIGIBLE') {
      query = query.eq('eligible_to_vote', true);
    } else if (filterEligibility === 'INELIGIBLE') {
      query = query.eq('eligible_to_vote', false);
    }

    // Voting Status Filter
    if (filterVoted === 'VOTED') {
      query = query.eq('has_voted', true);
    } else if (filterVoted === 'NOT_VOTED') {
      query = query.eq('has_voted', false);
    }

    // Cohort / Level Filter (ND1 vs ND2)
    if (filterCohort === 'ND1') {
      query = query.ilike('matric_number', 'FPA/CS/25/%');
    } else if (filterCohort === 'ND2') {
      query = query.ilike('matric_number', 'FPA/CS/24/%');
    }

    // Email Status Filter
    if (filterEmailStatus === 'HAS_EMAIL') {
      query = query.not('email', 'is', null).neq('email', '');
    } else if (filterEmailStatus === 'MISSING_EMAIL') {
      query = query.or('email.is.null,email.eq.""');
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach computed cohort / level to each record
    return (data || []).map((s) => ({
      ...s,
      cohort: getStudentCohort(s.matric_number) || 'Unassigned',
      level: getStudentCohort(s.matric_number) || 'Unassigned'
    }));
  },

  /**
   * Adds or updates a student manually (flexible fields)
   */
  async addStudentManual({ matric_number, full_name, email, eligible_to_vote = true }) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const matric = normalizeMatricNumber(matric_number);
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanName = full_name ? full_name.trim() : null;

    // Check if student with this matric already exists
    const { data: existing } = await supabase
      .from('students')
      .select('*')
      .ilike('matric_number', matric)
      .maybeSingle();

    if (existing) {
      // Non-destructive update: never overwrite existing values with null/blank
      const updates = {
        updated_at: new Date().toISOString(),
        eligible_to_vote
      };
      if (cleanName) updates.full_name = cleanName;
      if (cleanEmail) updates.email = cleanEmail;

      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, cohort: getStudentCohort(data.matric_number), updated: true };
    }

    // Insert new student
    const { data, error } = await supabase
      .from('students')
      .insert([{
        id: crypto.randomUUID ? crypto.randomUUID() : undefined,
        matric_number: matric,
        full_name: cleanName,
        email: cleanEmail,
        eligible_to_vote,
        email_verified: false,
        has_voted: false
      }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, cohort: getStudentCohort(data.matric_number), inserted: true };
  },

  /**
   * Updates student information
   */
  async updateStudent(id, updates) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };
    if (cleanUpdates.matric_number) {
      cleanUpdates.matric_number = normalizeMatricNumber(cleanUpdates.matric_number);
    }
    if (cleanUpdates.email !== undefined) {
      cleanUpdates.email = cleanUpdates.email ? cleanUpdates.email.trim().toLowerCase() : null;
    }
    if (cleanUpdates.full_name !== undefined) {
      cleanUpdates.full_name = cleanUpdates.full_name ? cleanUpdates.full_name.trim() : null;
    }

    const { data, error } = await supabase
      .from('students')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, cohort: getStudentCohort(data.matric_number) };
  },

  /**
   * Deletes a student from registry
   */
  async deleteStudent(id) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Batch imports students from CSV using the atomic PostgreSQL upsert RPC
   * Non-destructive: merges by matric_number without blanking out existing data
   */
  async importStudents(studentsList) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    if (!Array.isArray(studentsList) || !studentsList.length) {
      return { success: true, inserted: 0, updated: 0, total: 0 };
    }

    // Format payload cleanly
    const payload = studentsList.map((s) => ({
      matric_number: normalizeMatricNumber(s.matric_number),
      full_name: s.full_name ? s.full_name.trim() : null,
      email: s.email ? s.email.trim().toLowerCase() : null
    }));

    // Call atomic RPC function in Supabase PostgreSQL
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_bulk_upsert_students', {
      p_students: payload
    });

    if (!rpcError && rpcData) {
      return {
        success: true,
        inserted: rpcData.inserted || 0,
        updated: rpcData.updated || 0,
        total: rpcData.total || 0,
        skipped: rpcData.skipped || 0
      };
    }

    // If RPC had an error, try serverless endpoint fallback
    try {
      const resp = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: payload })
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // ignore
    }

    if (rpcError) throw rpcError;
    return { success: true, inserted: payload.length, updated: 0, total: payload.length };
  },

  /**
   * Resets an individual voter's status and deletes their vote records (with confirmation & audit log)
   */
  async resetVoter(studentId, electionId, reason) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
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
      throw new Error('Supabase is not configured.');
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
