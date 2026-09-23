-- ====================================================================
-- NACOS Electoral Commission Voting System - 03_rls_policies.sql
-- Row Level Security (RLS) Configuration & Access Control
-- ====================================================================

-- --------------------------------------------------------------------
-- Helper Function to check if the current user is an administrator
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- --------------------------------------------------------------------
-- Enable RLS on all tables
-- --------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- ADMIN_USERS Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin users can view admin profiles" ON public.admin_users;
CREATE POLICY "Admin users can view admin profiles"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage admin profiles" ON public.admin_users;
CREATE POLICY "Admins can manage admin profiles"
    ON public.admin_users FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- STUDENTS Policies
-- --------------------------------------------------------------------
-- Students can only view their own record; Admins can view all students
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
CREATE POLICY "Students can view own profile"
    ON public.students FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Only admins can insert, update, or delete student profiles
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
CREATE POLICY "Admins can insert students"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Admins can update students"
    ON public.students FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Admins can delete students"
    ON public.students FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- --------------------------------------------------------------------
-- ELECTIONS Policies
-- --------------------------------------------------------------------
-- Everyone authenticated can view elections
DROP POLICY IF EXISTS "Authenticated users can view elections" ON public.elections;
CREATE POLICY "Authenticated users can view elections"
    ON public.elections FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can manage elections
DROP POLICY IF EXISTS "Admins can manage elections" ON public.elections;
CREATE POLICY "Admins can manage elections"
    ON public.elections FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- POSITIONS Policies
-- --------------------------------------------------------------------
-- Voters can view active positions; Admins can view all
DROP POLICY IF EXISTS "Users can view positions" ON public.positions;
CREATE POLICY "Users can view positions"
    ON public.positions FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Only admins can manage positions
DROP POLICY IF EXISTS "Admins can manage positions" ON public.positions;
CREATE POLICY "Admins can manage positions"
    ON public.positions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- CANDIDATES Policies
-- --------------------------------------------------------------------
-- Voters can view active candidates; Admins can view all
DROP POLICY IF EXISTS "Users can view candidates" ON public.candidates;
CREATE POLICY "Users can view candidates"
    ON public.candidates FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Only admins can manage candidates
DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
CREATE POLICY "Admins can manage candidates"
    ON public.candidates FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- VOTES Policies
-- Privacy guarantee: Regular voters CANNOT read the votes table!
-- Only administrators have SELECT access.
-- Insert is restricted strictly through the submit_vote SECURITY DEFINER RPC.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view votes" ON public.votes;
CREATE POLICY "Admins can view votes"
    ON public.votes FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- --------------------------------------------------------------------
-- VOTE_ANSWERS Policies
-- Privacy guarantee: Regular voters CANNOT read individual answers.
-- Answers can only be viewed by administrators, or when election results are published.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view vote answers" ON public.vote_answers;
CREATE POLICY "Admins can view vote answers"
    ON public.vote_answers FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.elections e
            JOIN public.votes v ON v.election_id = e.id
            WHERE v.id = vote_answers.vote_id
              AND e.results_published = true
        )
    );

-- --------------------------------------------------------------------
-- AUDIT_LOGS Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- SUPABASE STORAGE BUCKET POLICIES (bucket 'candidates')
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidates', 'candidates', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public candidates read access" ON storage.objects;
CREATE POLICY "Public candidates read access"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'candidates');

DROP POLICY IF EXISTS "Admins can upload candidate images" ON storage.objects;
CREATE POLICY "Admins can upload candidate images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'candidates' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update candidate images" ON storage.objects;
CREATE POLICY "Admins can update candidate images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'candidates' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete candidate images" ON storage.objects;
CREATE POLICY "Admins can delete candidate images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'candidates' AND public.is_admin());
