-- ====================================================================
-- NACOS Electoral Commission Voting System - 08_students_flexible_upsert.sql
-- Enables Flexible CSV Imports (Matric+Name, Matric+Email, Matric+Name+Email)
-- Non-destructive student upserts without duplicate records
-- ====================================================================

-- 1. Modify students table column nullability & constraints
ALTER TABLE public.students ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Remove strict foreign key and old unique constraint so students can exist prior to email assignment
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_id_fkey;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_email_key;
DROP INDEX IF EXISTS public.idx_students_email_lower;

-- 3. Unique partial index: emails must be unique ONLY when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_unique 
ON public.students (lower(trim(email))) 
WHERE email IS NOT NULL AND trim(email) != '';

-- Helper: Allow postgres, service_role, and authenticated admin users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT 
        (current_user IN ('postgres', 'service_role')) OR
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        );
$$;

-- 4. Atomic Bulk Upsert RPC Function
CREATE OR REPLACE FUNCTION public.admin_bulk_upsert_students(p_students JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_matric TEXT;
    v_name TEXT;
    v_email TEXT;
    v_existing public.students%ROWTYPE;
    v_inserted_count INT := 0;
    v_updated_count INT := 0;
    v_skipped_count INT := 0;
BEGIN
    -- Verify caller has administrator privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    IF p_students IS NULL OR jsonb_typeof(p_students) != 'array' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid input array');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_students)
    LOOP
        v_matric := upper(trim(COALESCE(v_item->>'matric_number', '')));
        v_name := nullif(trim(COALESCE(v_item->>'full_name', '')), '');
        v_email := nullif(lower(trim(COALESCE(v_item->>'email', ''))), '');

        -- Skip if no matriculation number
        IF v_matric IS NULL OR v_matric = '' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Check if student already exists by matric_number
        SELECT * INTO v_existing 
        FROM public.students 
        WHERE upper(trim(matric_number)) = v_matric;

        IF FOUND THEN
            -- UPDATE existing student without overwriting with null/blank
            UPDATE public.students
            SET
                full_name = COALESCE(v_name, full_name),
                email = COALESCE(v_email, email),
                updated_at = now()
            WHERE id = v_existing.id;

            v_updated_count := v_updated_count + 1;
        ELSE
            -- INSERT new student record
            INSERT INTO public.students (
                id,
                matric_number,
                full_name,
                email,
                eligible_to_vote,
                has_voted,
                email_verified,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_matric,
                v_name,
                v_email,
                true,
                false,
                false,
                now(),
                now()
            );

            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted', v_inserted_count,
        'updated', v_updated_count,
        'total', v_inserted_count + v_updated_count,
        'skipped', v_skipped_count
    );
END;
$$;

-- Grant execution to authenticated users (internal check guards super_admin/admin)
GRANT EXECUTE ON FUNCTION public.admin_bulk_upsert_students(JSONB) TO authenticated;
