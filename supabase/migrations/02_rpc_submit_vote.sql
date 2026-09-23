-- ====================================================================
-- NACOS Electoral Commission Voting System - 02_rpc_submit_vote.sql
-- Atomic, One-Person-One-Vote Transaction Stored Procedure
-- ====================================================================

CREATE OR REPLACE FUNCTION public.submit_vote(
    p_election_id UUID,
    p_answers JSONB -- Array of {"candidate_id": UUID, "position_id": UUID, "choice": "YES"|"NO"}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_student public.students%ROWTYPE;
    v_election public.elections%ROWTYPE;
    v_vote_id UUID;
    v_answer JSONB;
    v_cand_id UUID;
    v_pos_id UUID;
    v_choice TEXT;
    v_cand_count INT;
    v_submitted_cand_count INT;
    v_active_cand_count INT;
    v_cast_at TIMESTAMPTZ := now();
BEGIN
    -- 1. Verify authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required. Please log in.';
    END IF;

    -- 2. Fetch and lock student record exclusively FOR UPDATE to serialize concurrent requests
    SELECT * INTO v_student
    FROM public.students
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter student record not found.';
    END IF;

    -- 3. Verify voter eligibility
    IF NOT v_student.eligible_to_vote THEN
        RAISE EXCEPTION 'You are not eligible to vote in this election.';
    END IF;

    -- 4. Verify email verification
    IF NOT v_student.email_verified THEN
        RAISE EXCEPTION 'Your email address must be verified before you can vote.';
    END IF;

    -- 5. Verify voter has not already voted
    IF v_student.has_voted THEN
        RAISE EXCEPTION 'You have already submitted your vote.';
    END IF;

    -- 6. Verify election status and time bounds
    SELECT * INTO v_election
    FROM public.elections
    WHERE id = p_election_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target election not found.';
    END IF;

    IF v_election.status <> 'OPEN' THEN
        RAISE EXCEPTION 'Voting is currently closed for this election.';
    END IF;

    IF v_election.start_time IS NOT NULL AND v_cast_at < v_election.start_time THEN
        RAISE EXCEPTION 'Voting has not yet officially commenced for this election.';
    END IF;

    IF v_election.end_time IS NOT NULL AND v_cast_at > v_election.end_time THEN
        RAISE EXCEPTION 'Voting has ended for this election.';
    END IF;

    -- 7. Secondary check on votes table to prevent any edge-case duplicate
    IF EXISTS (
        SELECT 1 FROM public.votes
        WHERE election_id = p_election_id AND student_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'A vote has already been recorded for your account in this election.';
    END IF;

    -- 8. Validate ballot answers array
    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' OR jsonb_array_length(p_answers) = 0 THEN
        RAISE EXCEPTION 'Invalid ballot. No candidate selections provided.';
    END IF;

    -- Count total active candidates in this election
    SELECT COUNT(*) INTO v_active_cand_count
    FROM public.candidates c
    JOIN public.positions p ON c.position_id = p.id
    WHERE c.election_id = p_election_id
      AND c.is_active = true
      AND p.is_active = true;

    v_submitted_cand_count := jsonb_array_length(p_answers);

    IF v_active_cand_count > 0 AND v_submitted_cand_count <> v_active_cand_count THEN
        RAISE EXCEPTION 'Incomplete ballot: Every active candidate must have an explicit YES or NO choice.';
    END IF;

    -- 9. Create primary vote record
    v_vote_id := gen_random_uuid();
    INSERT INTO public.votes (id, election_id, student_id, cast_at)
    VALUES (v_vote_id, p_election_id, v_user_id, v_cast_at);

    -- 10. Process and insert each answer atomically
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_cand_id := (v_answer->>'candidate_id')::UUID;
        v_pos_id := (v_answer->>'position_id')::UUID;
        v_choice := upper(trim(v_answer->>'choice'));

        IF v_choice NOT IN ('YES', 'NO') THEN
            RAISE EXCEPTION 'Invalid selection for candidate. Must be explicitly YES or NO.';
        END IF;

        -- Verify candidate exists, is active, and matches position and election
        PERFORM 1
        FROM public.candidates c
        JOIN public.positions p ON c.position_id = p.id
        WHERE c.id = v_cand_id
          AND c.position_id = v_pos_id
          AND c.election_id = p_election_id
          AND c.is_active = true
          AND p.is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid or inactive candidate selection detected: %', v_cand_id;
        END IF;

        -- Insert answer with uniqueness constraint protection
        INSERT INTO public.vote_answers (id, vote_id, position_id, candidate_id, choice, created_at)
        VALUES (gen_random_uuid(), v_vote_id, v_pos_id, v_cand_id, v_choice, v_cast_at);
    END LOOP;

    -- 11. Mark student as voted
    UPDATE public.students
    SET has_voted = true,
        updated_at = v_cast_at
    WHERE id = v_user_id;

    -- Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'vote_id', v_vote_id,
        'cast_at', v_cast_at,
        'message', 'Your vote has been securely recorded and verified.'
    );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_vote(UUID, JSONB) TO authenticated;
