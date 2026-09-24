-- ====================================================================
-- NACOS Electoral Commission Voting System - 07_admin_update_credentials_rpc.sql
-- Atomic Administrative Credential Update in Supabase Auth & DB
-- ====================================================================

CREATE OR REPLACE FUNCTION public.admin_update_credentials(
    p_new_email TEXT DEFAULT NULL,
    p_new_password TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_old_email TEXT;
    v_clean_email TEXT;
    v_clean_pass TEXT;
    v_clean_name TEXT;
    v_fields_updated TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- 1. Verify caller has an active authenticated session
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Access denied. Unauthenticated request.';
    END IF;

    -- 2. Verify caller is an administrator in public.admin_users
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Administrative privileges required.';
    END IF;

    SELECT email INTO v_old_email FROM public.admin_users WHERE id = v_admin_id;
    IF v_old_email IS NULL THEN
        SELECT email INTO v_old_email FROM auth.users WHERE id = v_admin_id;
    END IF;

    -- 3. Process Full Name
    IF p_full_name IS NOT NULL AND length(trim(p_full_name)) > 0 THEN
        v_clean_name := trim(p_full_name);
        UPDATE public.admin_users
        SET full_name = v_clean_name,
            updated_at = now()
        WHERE id = v_admin_id;

        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(v_clean_name)),
            updated_at = now()
        WHERE id = v_admin_id;

        v_fields_updated := array_append(v_fields_updated, 'full_name');
    END IF;

    -- 4. Process Email Change
    IF p_new_email IS NOT NULL AND length(trim(p_new_email)) > 0 THEN
        v_clean_email := lower(trim(p_new_email));
        IF v_clean_email NOT LIKE '%_@__%.__%' THEN
            RAISE EXCEPTION 'Invalid email address format.';
        END IF;

        IF v_clean_email <> lower(COALESCE(v_old_email, '')) THEN
            -- Check for conflict with other accounts in auth.users
            IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_clean_email AND id <> v_admin_id) THEN
                RAISE EXCEPTION 'This email is already in use by another account.';
            END IF;

            -- Atomically update auth.users
            UPDATE auth.users
            SET email = v_clean_email,
                email_confirmed_at = now(),
                confirmation_token = '',
                recovery_token = '',
                email_change = '',
                email_change_token_new = '',
                updated_at = now()
            WHERE id = v_admin_id;

            -- Synchronize auth.identities
            UPDATE auth.identities
            SET provider_id = v_clean_email,
                identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_clean_email)),
                updated_at = now()
            WHERE user_id = v_admin_id AND provider = 'email';

            IF NOT FOUND THEN
                INSERT INTO auth.identities (
                    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
                ) VALUES (
                    v_admin_id,
                    v_admin_id,
                    jsonb_build_object('sub', v_admin_id::text, 'email', v_clean_email),
                    'email',
                    v_clean_email,
                    now(),
                    now(),
                    now()
                );
            END IF;

            -- Synchronize public.admin_users
            UPDATE public.admin_users
            SET email = v_clean_email,
                updated_at = now()
            WHERE id = v_admin_id;

            v_fields_updated := array_append(v_fields_updated, 'email');
        END IF;
    END IF;

    -- 5. Process Password Change
    IF p_new_password IS NOT NULL AND length(trim(p_new_password)) > 0 THEN
        v_clean_pass := trim(p_new_password);
        IF length(v_clean_pass) < 6 THEN
            RAISE EXCEPTION 'Password must be at least 6 characters long.';
        END IF;

        -- Atomically update password in auth.users using pgcrypto blowfish crypt
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(v_clean_pass, extensions.gen_salt('bf', 10)),
            updated_at = now()
        WHERE id = v_admin_id;

        v_fields_updated := array_append(v_fields_updated, 'password');
    END IF;

    -- 6. Record Audit Log
    INSERT INTO public.audit_logs (
        admin_id,
        admin_email,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        COALESCE(v_clean_email, v_old_email),
        'UPDATE_ADMIN_CREDENTIALS',
        'admin_user',
        v_admin_id::text,
        jsonb_build_object(
            'updated_fields', v_fields_updated,
            'previous_email', v_old_email,
            'new_email', COALESCE(v_clean_email, v_old_email)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Administrator credentials updated successfully in Supabase Auth.',
        'updated_fields', v_fields_updated,
        'email', COALESCE(v_clean_email, v_old_email)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_credentials(TEXT, TEXT, TEXT) TO authenticated;
