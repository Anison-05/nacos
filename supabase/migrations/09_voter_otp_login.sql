-- ====================================================================
-- NACOS Electoral Commission Voting System - 09_voter_otp_login.sql
-- Passwordless Voter Authentication: Matric Number + Email + OTP Code
-- ====================================================================

-- 1. Create table for storing single-use voter verification codes
CREATE TABLE IF NOT EXISTS public.voter_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    matric_number TEXT NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
    used_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voter_codes_student ON public.voter_verification_codes(student_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_voter_codes_matric_email ON public.voter_verification_codes(upper(trim(matric_number)), lower(trim(email)));

-- Enable RLS
ALTER TABLE public.voter_verification_codes ENABLE ROW LEVEL SECURITY;

-- 2. Stored Procedure: voter_request_otp
-- Validates Matric + Email match in public.students and generates 6-digit OTP
CREATE OR REPLACE FUNCTION public.voter_request_otp(
    p_matric_number TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_clean_matric TEXT;
    v_clean_email TEXT;
    v_student public.students%ROWTYPE;
    v_code TEXT;
BEGIN
    v_clean_matric := upper(trim(COALESCE(p_matric_number, '')));
    v_clean_email := lower(trim(COALESCE(p_email, '')));

    IF v_clean_matric = '' THEN
        RAISE EXCEPTION 'Please enter your matriculation number.';
    END IF;

    IF v_clean_email = '' THEN
        RAISE EXCEPTION 'Please enter your email address.';
    END IF;

    -- Lookup student by matric_number
    SELECT * INTO v_student
    FROM public.students
    WHERE upper(trim(matric_number)) = v_clean_matric;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Matriculation number not found in eligible voter register.';
    END IF;

    -- Check if student has linked email
    IF v_student.email IS NULL OR trim(v_student.email) = '' THEN
        RAISE EXCEPTION 'No email address is linked to this matriculation number. Please contact an election administrator to update your student record.';
    END IF;

    -- Check if email matches linked student email
    IF lower(trim(v_student.email)) <> v_clean_email THEN
        RAISE EXCEPTION 'The email address does not match the email registered for this matriculation number.';
    END IF;

    -- Check eligibility
    IF NOT v_student.eligible_to_vote THEN
        RAISE EXCEPTION 'Your student profile is currently marked ineligible to vote in this election.';
    END IF;

    -- Invalidate previous unused codes
    UPDATE public.voter_verification_codes
    SET used_at = now()
    WHERE student_id = v_student.id AND used_at IS NULL;

    -- Generate 6-digit numeric OTP code
    v_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

    -- Insert new code (valid 10 minutes)
    INSERT INTO public.voter_verification_codes (
        student_id,
        matric_number,
        email,
        code,
        created_at,
        expires_at
    ) VALUES (
        v_student.id,
        v_student.matric_number,
        lower(trim(v_student.email)),
        v_code,
        now(),
        now() + INTERVAL '10 minutes'
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_student.id,
        'matric_number', v_student.matric_number,
        'email', lower(trim(v_student.email)),
        'full_name', v_student.full_name,
        'code', v_code
    );
END;
$$;

-- 3. Stored Procedure: voter_verify_otp
-- Verifies 6-digit code, marks email_verified, syncs to auth.users, and returns auth session secret
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

    -- Deterministic voter auth secret based on student UUID
    v_auth_secret := 'VoterSec_' || replace(v_student.id::text, '-', '') || '_Auth!';

    -- Provision / Sync into auth.users so Supabase GoTrue issues valid session with matching id
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
        lower(trim(v_student.email)),
        crypt(v_auth_secret, gen_salt('bf')),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('matric_number', v_student.matric_number, 'full_name', v_student.full_name),
        false,
        false,
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        phone_change = '',
        phone_change_token = '',
        reauthentication_token = '',
        email_change_token_current = '',
        email_change_confirm_status = 0,
        is_super_admin = false,
        is_sso_user = false,
        is_anonymous = false,
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
        jsonb_build_object('sub', v_student.id::text, 'email', lower(trim(v_student.email))),
        'email',
        lower(trim(v_student.email)),
        now(),
        now(),
        now()
    )
    ON CONFLICT (provider, provider_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        identity_data = EXCLUDED.identity_data,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'id', v_student.id,
            'matric_number', v_student.matric_number,
            'full_name', v_student.full_name,
            'email', v_student.email,
            'email_verified', v_student.email_verified,
            'eligible_to_vote', v_student.eligible_to_vote,
            'has_voted', v_student.has_voted,
            'department', v_student.department
        ),
        'email', lower(trim(v_student.email)),
        'auth_secret', v_auth_secret
    );
END;
$$;

-- Grant execution permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.voter_request_otp(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.voter_verify_otp(TEXT, TEXT, TEXT) TO anon, authenticated;
