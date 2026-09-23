import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { optimizeCandidateImage } from '../lib/imageOptimizer';

export const electionService = {
  /**
   * Fetches active or latest election
   */
  async getActiveElection() {
    if (!isSupabaseConfigured) {
      return {
        id: 'demo-election-id',
        title: 'NACOS Central Executive Council Elections',
        session: '2025/2026 Academic Session',
        description: 'Annual democratic election of NACOS student leadership.',
        status: 'OPEN',
        results_published: false
      };
    }

    // Try finding OPEN election first
    let { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      // Fallback to latest election regardless of status
      const res = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = res.data;
    }

    return data;
  },

  /**
   * Fetches ballot data for an election: active positions & active candidates
   */
  async getElectionBallot(electionId) {
    if (!isSupabaseConfigured) {
      return [
        {
          id: 'pos-1',
          title: 'President',
          description: 'Chief Executive Officer and official representative of NACOS',
          display_order: 1,
          candidates: [
            {
              id: 'cand-1',
              position_id: 'pos-1',
              full_name: 'ADEWALE BABATUNDE EMMANUEL',
              matric_number: 'FPA/CS/24/1-0005',
              manifesto: 'Committed to fostering tech innovation, expanding hackathons, and securing industry internships for all NACOS members.',
              image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
              display_order: 1
            },
            {
              id: 'cand-2',
              position_id: 'pos-1',
              full_name: 'CHINELO BLESSING OKAFOR',
              matric_number: 'FPA/CS/24/1-0012',
              manifesto: 'Pioneering accessible tech resources, peer coding mentorship programs, and high-speed department Wi-Fi infrastructure.',
              image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
              display_order: 2
            }
          ]
        },
        {
          id: 'pos-2',
          title: 'Vice President',
          description: 'Assists the President and oversees academic committees and study groups',
          display_order: 2,
          candidates: [
            {
              id: 'cand-3',
              position_id: 'pos-2',
              full_name: 'MOHAMMED ALIYU SULEIMAN',
              matric_number: 'FPA/CS/24/1-0028',
              manifesto: 'Advocating academic excellence, past question digital archives, and subsidized certification vouchers.',
              image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
              display_order: 1
            }
          ]
        },
        {
          id: 'pos-3',
          title: 'General Secretary',
          description: 'Custodian of records, communications, and secretariat operations',
          display_order: 3,
          candidates: [
            {
              id: 'cand-4',
              position_id: 'pos-3',
              full_name: 'FATIMA AISHA BELLO',
              matric_number: 'FPA/CS/24/1-0044',
              manifesto: 'Ensuring 100% transparent and digitized departmental communications with zero bureaucratic delays.',
              image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80',
              display_order: 1
            }
          ]
        }
      ];
    }

    // 1. Fetch active positions
    const { data: positions, error: posErr } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (posErr) throw new Error('Failed to load election positions.');

    // 2. Fetch active candidates
    const { data: candidates, error: candErr } = await supabase
      .from('candidates')
      .select('*')
      .eq('election_id', electionId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (candErr) throw new Error('Failed to load election candidates.');

    // Group candidates by position
    return positions.map((pos) => ({
      ...pos,
      candidates: candidates.filter((c) => c.position_id === pos.id)
    }));
  },

  /**
   * Submits voter ballot using atomic PostgreSQL stored procedure (submit_vote)
   * Guaranteed to prevent race conditions, duplicate votes, and tampering
   * @param {string} electionId
   * @param {Array<{ candidate_id: string, position_id: string, choice: 'YES'|'NO' }>} answers
   */
  async submitVote(electionId, answers) {
    if (!answers || !answers.length) {
      throw new Error('No candidate choices provided in ballot submission.');
    }

    if (!isSupabaseConfigured) {
      return {
        success: true,
        vote_id: 'demo-receipt-' + Math.random().toString(36).substring(2, 9),
        cast_at: new Date().toISOString(),
        message: 'Your vote has been securely recorded and verified.'
      };
    }

    const { data, error } = await supabase.rpc('submit_vote', {
      p_election_id: electionId,
      p_answers: answers
    });

    if (error) {
      throw new Error(error.message || 'Failed to submit vote. Transaction rolled back.');
    }

    return data;
  },

  /**
   * Fetches official election results via PostgreSQL RPC
   */
  async getResults(electionId) {
    if (!isSupabaseConfigured) {
      return {
        election_id: electionId,
        title: 'NACOS Central Executive Council Elections',
        session: '2025/2026 Academic Session',
        status: 'OPEN',
        results_published: true,
        summary: {
          total_registered: 226,
          total_verified: 198,
          total_eligible: 220,
          total_voted: 174,
          total_unvoted: 46,
          turnout_percentage: 79.09
        },
        positions: [
          {
            position_id: 'pos-1',
            title: 'President',
            candidates: [
              {
                candidate_id: 'cand-1',
                full_name: 'ADEWALE BABATUNDE EMMANUEL',
                matric_number: 'FPA/CS/24/1-0005',
                yes_votes: 112,
                no_votes: 62,
                total_votes: 174,
                yes_pct: 64.37,
                no_pct: 35.63
              },
              {
                candidate_id: 'cand-2',
                full_name: 'CHINELO BLESSING OKAFOR',
                matric_number: 'FPA/CS/24/1-0012',
                yes_votes: 138,
                no_votes: 36,
                total_votes: 174,
                yes_pct: 79.31,
                no_pct: 20.69
              }
            ]
          }
        ]
      };
    }

    const { data, error } = await supabase.rpc('get_election_results', {
      p_election_id: electionId
    });

    if (error) {
      throw new Error(error.message || 'Failed to calculate election results.');
    }

    return data;
  },

  // -------------------------------------------------------------
  // ADMIN MANAGEMENT METHODS
  // -------------------------------------------------------------

  async getAllElections() {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createElection(payload) {
    if (!isSupabaseConfigured) return { id: 'mock-el-' + Date.now(), ...payload };
    const { data, error } = await supabase
      .from('elections')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateElection(id, payload) {
    if (!isSupabaseConfigured) return { id, ...payload };
    const { data, error } = await supabase
      .from('elections')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPositions(electionId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createPosition(payload) {
    if (!isSupabaseConfigured) return { id: 'mock-pos-' + Date.now(), ...payload };
    const { data, error } = await supabase
      .from('positions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updatePosition(id, payload) {
    if (!isSupabaseConfigured) return { id, ...payload };
    const { data, error } = await supabase
      .from('positions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePosition(id) {
    if (!isSupabaseConfigured) return true;
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getCandidates(electionId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('candidates')
      .select('*, positions(title)')
      .eq('election_id', electionId)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCandidate(payload) {
    if (!isSupabaseConfigured) return { id: 'mock-cand-' + Date.now(), ...payload };
    const { data, error } = await supabase
      .from('candidates')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCandidate(id, payload) {
    if (!isSupabaseConfigured) return { id, ...payload };
    const { data, error } = await supabase
      .from('candidates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCandidate(id) {
    if (!isSupabaseConfigured) return true;
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  /**
   * Optimizes and uploads candidate image to Supabase Storage
   */
  async uploadCandidateImage(file, electionId, candidateId) {
    // 1. Optimize image (resizes, enforces <= 3MB, outputs WebP blob)
    const { blob } = await optimizeCandidateImage(file, 1000, 0.85);

    if (!isSupabaseConfigured) {
      return URL.createObjectURL(blob);
    }

    const filePath = `${electionId}/${candidateId || Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('candidates')
      .upload(filePath, blob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('candidates')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }
};
