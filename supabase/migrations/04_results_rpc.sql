-- ====================================================================
-- NACOS Electoral Commission Voting System - 04_results_rpc.sql
-- Secure Election Results & Turnout Aggregator RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_election_results(p_election_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
    v_total_registered INT := 0;
    v_total_verified INT := 0;
    v_total_eligible INT := 0;
    v_total_voted INT := 0;
    v_total_unvoted INT := 0;
    v_turnout_pct NUMERIC := 0.00;
    v_positions_json JSONB;
    v_is_authorized BOOLEAN := false;
BEGIN
    -- 1. Check election existence
    SELECT * INTO v_election
    FROM public.elections
    WHERE id = p_election_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found.';
    END IF;

    -- 2. Authorization check: Either current user is admin, or results have been marked published
    v_is_authorized := public.is_admin() OR v_election.results_published = true;
    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Election results are strictly confidential until released by the Electoral Commission.';
    END IF;

    -- 3. Calculate Overall Voter Statistics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE email_verified = true),
        COUNT(*) FILTER (WHERE eligible_to_vote = true),
        COUNT(*) FILTER (WHERE has_voted = true),
        COUNT(*) FILTER (WHERE has_voted = false)
    INTO
        v_total_registered,
        v_total_verified,
        v_total_eligible,
        v_total_voted,
        v_total_unvoted
    FROM public.students;

    IF v_total_eligible > 0 THEN
        v_turnout_pct := ROUND((v_total_voted::NUMERIC / v_total_eligible::NUMERIC) * 100, 2);
    ELSE
        v_turnout_pct := 0.00;
    END IF;

    -- 4. Aggregate Candidate Votes and Percentages per Position
    SELECT COALESCE(jsonb_agg(pos_data ORDER BY pos_data->>'display_order'), '[]'::jsonb)
    INTO v_positions_json
    FROM (
        SELECT
            jsonb_build_object(
                'position_id', p.id,
                'title', p.title,
                'description', p.description,
                'display_order', p.display_order,
                'is_active', p.is_active,
                'candidates', (
                    SELECT COALESCE(jsonb_agg(cand_data ORDER BY cand_data->>'display_order'), '[]'::jsonb)
                    FROM (
                        SELECT
                            jsonb_build_object(
                                'candidate_id', c.id,
                                'full_name', c.full_name,
                                'matric_number', c.matric_number,
                                'manifesto', c.manifesto,
                                'image_url', c.image_url,
                                'is_active', c.is_active,
                                'display_order', c.display_order,
                                'yes_votes', COALESCE(ans_agg.yes_count, 0),
                                'no_votes', COALESCE(ans_agg.no_count, 0),
                                'total_votes', COALESCE(ans_agg.yes_count, 0) + COALESCE(ans_agg.no_count, 0),
                                'yes_pct', CASE
                                    WHEN (COALESCE(ans_agg.yes_count, 0) + COALESCE(ans_agg.no_count, 0)) > 0
                                    THEN ROUND((COALESCE(ans_agg.yes_count, 0)::NUMERIC / (COALESCE(ans_agg.yes_count, 0) + COALESCE(ans_agg.no_count, 0))::NUMERIC) * 100, 2)
                                    ELSE 0.00
                                END,
                                'no_pct', CASE
                                    WHEN (COALESCE(ans_agg.yes_count, 0) + COALESCE(ans_agg.no_count, 0)) > 0
                                    THEN ROUND((COALESCE(ans_agg.no_count, 0)::NUMERIC / (COALESCE(ans_agg.yes_count, 0) + COALESCE(ans_agg.no_count, 0))::NUMERIC) * 100, 2)
                                    ELSE 0.00
                                END
                            ) AS cand_data
                        FROM public.candidates c
                        LEFT JOIN (
                            SELECT
                                candidate_id,
                                COUNT(*) FILTER (WHERE choice = 'YES') AS yes_count,
                                COUNT(*) FILTER (WHERE choice = 'NO') AS no_count
                            FROM public.vote_answers va
                            JOIN public.votes v ON va.vote_id = v.id
                            WHERE v.election_id = p_election_id
                            GROUP BY candidate_id
                        ) ans_agg ON ans_agg.candidate_id = c.id
                        WHERE c.position_id = p.id
                    ) c_sub
                )
            ) AS pos_data
        FROM public.positions p
        WHERE p.election_id = p_election_id
    ) p_sub;

    -- 5. Construct and Return Final JSON
    RETURN jsonb_build_object(
        'election_id', v_election.id,
        'title', v_election.title,
        'session', v_election.session,
        'status', v_election.status,
        'results_published', v_election.results_published,
        'summary', jsonb_build_object(
            'total_registered', v_total_registered,
            'total_verified', v_total_verified,
            'total_eligible', v_total_eligible,
            'total_voted', v_total_voted,
            'total_unvoted', v_total_unvoted,
            'turnout_percentage', v_turnout_pct
        ),
        'positions', v_positions_json,
        'generated_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_election_results(UUID) TO authenticated, anon;
