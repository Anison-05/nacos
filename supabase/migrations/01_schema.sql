-- ====================================================================
-- NACOS Electoral Commission Voting System - 01_schema.sql
-- PostgreSQL / Supabase Schema Definition
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. ADMIN USERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'observer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);

-- --------------------------------------------------------------------
-- 2. STUDENTS / VOTERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    matric_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    eligible_to_vote BOOLEAN NOT NULL DEFAULT true,
    has_voted BOOLEAN NOT NULL DEFAULT false,
    department TEXT NOT NULL DEFAULT 'Computer Science',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive search indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_matric_upper ON public.students(upper(trim(matric_number)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_lower ON public.students(lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_students_eligible_voted ON public.students(eligible_to_vote, has_voted);

-- --------------------------------------------------------------------
-- 3. ELECTIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    session TEXT NOT NULL, -- e.g. '2024/2025' or '2025/2026'
    description TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED')),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    results_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elections_status ON public.elections(status);

-- --------------------------------------------------------------------
-- 4. POSITIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_positions_election_order ON public.positions(election_id, display_order);

-- --------------------------------------------------------------------
-- 5. CANDIDATES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    matric_number TEXT NOT NULL,
    manifesto TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON public.candidates(position_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON public.candidates(election_id);

-- --------------------------------------------------------------------
-- 6. VOTES TABLE (One voter can vote at most once per election)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_voter_election UNIQUE(election_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_election ON public.votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_student ON public.votes(student_id);

-- --------------------------------------------------------------------
-- 7. VOTE ANSWERS TABLE (YES / NO choice for each candidate)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vote_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id UUID NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    choice TEXT NOT NULL CHECK (choice IN ('YES', 'NO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_vote_candidate UNIQUE(vote_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_vote_answers_candidate_choice ON public.vote_answers(candidate_id, choice);
CREATE INDEX IF NOT EXISTS idx_vote_answers_position ON public.vote_answers(position_id);

-- --------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- --------------------------------------------------------------------
-- Helper Trigger Function to Auto-Update updated_at
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_students_updated_at ON public.students;
CREATE TRIGGER tr_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_elections_updated_at ON public.elections;
CREATE TRIGGER tr_elections_updated_at
    BEFORE UPDATE ON public.elections
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_positions_updated_at ON public.positions;
CREATE TRIGGER tr_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_candidates_updated_at ON public.candidates;
CREATE TRIGGER tr_candidates_updated_at
    BEFORE UPDATE ON public.candidates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
