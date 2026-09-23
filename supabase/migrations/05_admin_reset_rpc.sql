-- ====================================================================
-- NACOS Electoral Commission Voting System - 05_admin_reset_rpc.sql
-- Administrative Reset Functions with Audit Trails
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Reset Single Voter RPC
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reset_voter(
    p_student_id UUID,
    p_election_id UUID,
    p_reason TEXT DEFAULT 'Administrative voter reset'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_email TEXT;
    v_student public.students%ROWTYPE;
    v_votes_deleted INT := 0;
BEGIN
    -- Verify caller is admin
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Administrative privileges required.';
    END IF;

    SELECT email INTO v_admin_email FROM auth.users WHERE id = v_admin_id;

    -- Fetch student
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student record not found.';
    END IF;

    -- Delete student's vote records for this election (or all if not specified)
    IF p_election_id IS NOT NULL THEN
        DELETE FROM public.votes
        WHERE student_id = p_student_id AND election_id = p_election_id;
        GET DIAGNOSTICS v_votes_deleted = ROW_COUNT;
    ELSE
        DELETE FROM public.votes
        WHERE student_id = p_student_id;
        GET DIAGNOSTICS v_votes_deleted = ROW_COUNT;
    END IF;

    -- Reset has_voted flag
    UPDATE public.students
    SET has_voted = false,
        updated_at = now()
    WHERE id = p_student_id;

    -- Create audit log
    INSERT INTO public.audit_logs (
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        v_admin_email,
        'RESET_VOTER',
        'student',
        p_student_id::TEXT,
        jsonb_build_object(
            'matric_number', v_student.matric_number,
            'student_name', v_student.full_name,
            'election_id', p_election_id,
            'votes_removed', v_votes_deleted,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Voter voting status successfully reset.',
        'student_id', p_student_id,
        'matric_number', v_student.matric_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_voter(UUID, UUID, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 2. Dangerous: Reset All Votes RPC
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reset_all_votes(
    p_election_id UUID,
    p_confirmation_phrase TEXT,
    p_reason TEXT DEFAULT 'Election vote wipe'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_email TEXT;
    v_votes_count INT := 0;
    v_election public.elections%ROWTYPE;
BEGIN
    -- Verify caller is admin
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Administrative privileges required.';
    END IF;

    -- Enforce exact confirmation phrase
    IF trim(p_confirmation_phrase) <> 'RESET ELECTION' THEN
        RAISE EXCEPTION 'Invalid confirmation phrase. You must type RESET ELECTION exactly.';
    END IF;

    SELECT email INTO v_admin_email FROM auth.users WHERE id = v_admin_id;

    SELECT * INTO v_election FROM public.elections WHERE id = p_election_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found.';
    END IF;

    -- Count existing votes
    SELECT COUNT(*) INTO v_votes_count FROM public.votes WHERE election_id = p_election_id;

    -- Delete all votes (cascade deletes vote_answers)
    DELETE FROM public.votes WHERE election_id = p_election_id;

    -- Reset all students' has_voted status
    UPDATE public.students
    SET has_voted = false,
        updated_at = now()
    WHERE has_voted = true;

    -- Create high-priority audit log
    INSERT INTO public.audit_logs (
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        v_admin_email,
        'RESET_ALL_VOTES',
        'election',
        p_election_id::TEXT,
        jsonb_build_object(
            'election_title', v_election.title,
            'votes_purged', v_votes_count,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'All votes for this election have been completely purged and student statuses reset.',
        'votes_purged', v_votes_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_all_votes(UUID, TEXT, TEXT) TO authenticated;
