-- ====================================================================
-- NACOS Electoral Commission Voting System - 06_seed_demo.sql
-- Optional Demonstration Seed Data (For Testing/Staging Environments)
-- DO NOT EXECUTE IN PRODUCTION IF REAL ADMIN CONFIGURATION IS DESIRED
-- ====================================================================

DO $$
DECLARE
    v_election_id UUID;
    v_pos_pres UUID;
    v_pos_vp UUID;
    v_pos_gensec UUID;
    v_pos_finsec UUID;
    v_pos_pro UUID;
BEGIN
    -- 1. Create a Default Open Election
    INSERT INTO public.elections (
        id, title, session, description, status, start_time, end_time, results_published
    ) VALUES (
        gen_random_uuid(),
        'NACOS Central Executive Council Elections',
        '2025/2026 Academic Session',
        'General election for the leadership of the Nigeria Association of Computing Students (NACOS).',
        'OPEN',
        now() - INTERVAL '1 hour',
        now() + INTERVAL '2 days',
        false
    ) RETURNING id INTO v_election_id;

    -- 2. Create Dynamic Positions
    INSERT INTO public.positions (id, election_id, title, description, display_order, is_active)
    VALUES
        (gen_random_uuid(), v_election_id, 'President', 'Chief Executive Officer and Representative of NACOS', 1, true)
        RETURNING id INTO v_pos_pres;

    INSERT INTO public.positions (id, election_id, title, description, display_order, is_active)
    VALUES
        (gen_random_uuid(), v_election_id, 'Vice President', 'Assists the President and heads Academic Committees', 2, true)
        RETURNING id INTO v_pos_vp;

    INSERT INTO public.positions (id, election_id, title, description, display_order, is_active)
    VALUES
        (gen_random_uuid(), v_election_id, 'General Secretary', 'Custodian of records, correspondence, and secretariats', 3, true)
        RETURNING id INTO v_pos_gensec;

    INSERT INTO public.positions (id, election_id, title, description, display_order, is_active)
    VALUES
        (gen_random_uuid(), v_election_id, 'Financial Secretary', 'Oversees financial accountability and budgeting', 4, true)
        RETURNING id INTO v_pos_finsec;

    INSERT INTO public.positions (id, election_id, title, description, display_order, is_active)
    VALUES
        (gen_random_uuid(), v_election_id, 'Public Relations Officer (P.R.O)', 'Brand representation, publicity, and student outreach', 5, true)
        RETURNING id INTO v_pos_pro;

    -- 3. Create Sample Candidates (With SVG avatars as fallback)
    -- President Candidates
    INSERT INTO public.candidates (election_id, position_id, full_name, matric_number, manifesto, image_url, is_active, display_order)
    VALUES
        (v_election_id, v_pos_pres, 'ADEWALE BABATUNDE EMMANUEL', 'FPA/CS/24/1-0005', 'Committed to fostering tech innovation, expanding hackathons, and securing industry internships for all NACOS members.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', true, 1),
        (v_election_id, v_pos_pres, 'CHINELO BLESSING OKAFOR', 'FPA/CS/24/1-0012', 'Pioneering accessible tech resources, peer coding mentorship programs, and high-speed department Wi-Fi infrastructure.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80', true, 2);

    -- Vice President Candidate
    INSERT INTO public.candidates (election_id, position_id, full_name, matric_number, manifesto, image_url, is_active, display_order)
    VALUES
        (v_election_id, v_pos_vp, 'MOHAMMED ALIYU SULEIMAN', 'FPA/CS/24/1-0028', 'Advocating academic excellence, past question digital archives, and subsidized certification vouchers.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', true, 1);

    -- General Secretary Candidate
    INSERT INTO public.candidates (election_id, position_id, full_name, matric_number, manifesto, image_url, is_active, display_order)
    VALUES
        (v_election_id, v_pos_gensec, 'FATIMA AISHA BELLO', 'FPA/CS/24/1-0044', 'Ensuring 100% transparent and digitized departmental communications with zero bureaucratic delays.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80', true, 1);

    RAISE NOTICE 'Sample election seed data generated with Election ID: %', v_election_id;
END;
$$;
