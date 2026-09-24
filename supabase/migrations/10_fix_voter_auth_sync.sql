-- ====================================================================
-- 10_fix_voter_auth_sync.sql
-- Fix voter Supabase Auth sync using deterministic voter auth identifier
-- Prevents collision with admin accounts sharing email during testing
-- ====================================================================

CREATE OR REPLACE FUNCTION public.voter_verify_otp(
    p_matric_number TEXT,
    p_email TEXT,
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_clean_matric TEXT;
    v_clean_email TEXT;
    v_clean_code TEXT;
    v_record public.voter_verification_codes%ROWTYPE;
    v_student public.students%ROWTYPE;
    v_auth_secret TEXT;
    v_voter_auth_email TEXT;
BEGIN
    v_clean_matric := upper(trim(COALESCE(p_matric_number, '')));
    v_clean_email := lower(trim(COALESCE(p_email, '')));
    v_clean_code := trim(COALESCE(p_code, ''));

    IF v_clean_matric = '' OR v_clean_email = '' OR v_clean_code = '' THEN
        RAISE EXCEPTION 'Matriculation number, email, and verification code are required.';
    END IF;

    -- Find most recent active code
    SELECT * INTO v_record
    FROM public.voter_verification_codes
    WHERE upper(trim(matric_number)) = v_clean_matric
      AND lower(trim(email)) = v_clean_email
      AND used_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired verification code. Please request a new code.';
    END IF;

    -- Validate code
    IF v_record.code <> v_clean_code THEN
        UPDATE public.voter_verification_codes
        SET attempts = attempts + 1,
            used_at = CASE WHEN attempts + 1 >= 5 THEN now() ELSE NULL END
        WHERE id = v_record.id;

        RAISE EXCEPTION 'Incorrect verification code. Please check your email and try again.';
    END IF;

    -- Mark code as used
    UPDATE public.voter_verification_codes
    SET used_at = now()
    WHERE id = v_record.id;

    -- Fetch and update student profile
    UPDATE public.students
    SET email_verified = true,
        updated_at = now()
    WHERE id = v_record.student_id
    RETURNING * INTO v_student;

    -- Deterministic voter credentials
    v_auth_secret := 'VoterSec_' || replace(v_student.id::text, '-', '') || '_Auth!';
    v_voter_auth_email := lower(regexp_replace(v_student.matric_number, '[^a-zA-Z0-9]', '_', 'g')) || '@voter.nacos.internal';

    -- Upsert into auth.users using student ID and deterministic voter email
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        reauthentication_token,
        email_change_token_current,
        email_change_confirm_status,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        is_sso_user,
        is_anonymous,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_student.id,
        'authenticated',
        'authenticated',
        v_voter_auth_email,
        crypt(v_auth_secret, gen_salt('bf')),
        now(),
        '', '', '', '', '', '', '', '', 0,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('matric_number', v_student.matric_number, 'full_name', v_student.full_name, 'student_email', v_student.email),
        false, false, false,
        now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = now();

    -- Provision / Sync into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_student.id,
        v_student.id,
        jsonb_build_object('sub', v_student.id::text, 'email', v_voter_auth_email),
        'email',
        v_voter_auth_email,
        now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
        last_sign_in_at = now(),
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_student.id,
        'matric_number', v_student.matric_number,
        'email', v_student.email,
        'auth_email', v_voter_auth_email,
        'auth_secret', v_auth_secret,
        'student', row_to_json(v_student)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.voter_verify_otp(TEXT, TEXT, TEXT) TO anon, authenticated;
