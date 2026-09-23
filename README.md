# NACOS Electoral Commission Electronic Voting System

A production-grade, secure electronic voting web application engineered for the **Nigeria Association of Computing Students (NACOS)**.

Built with **React (Vite)**, **Bootstrap 5**, **Supabase PostgreSQL (Database, Auth, Storage, Row Level Security)**, and **Vercel Serverless Functions**.

---

## 🏛 Key Features & Architectural Security

1. **One-Person-One-Vote Cryptographic Guarantee**:
   - Voting operations are executed through an atomic PostgreSQL stored procedure (`submit_vote`) running under `SECURITY DEFINER`.
   - Acquires exclusive row locks (`SELECT ... FOR UPDATE`) on voter records to completely eliminate double-voting and race conditions.
   - Database-level constraints enforce that refreshing the browser, opening simultaneous tabs, or sending direct API payloads cannot create duplicate votes.

2. **Matriculation Registry & Cohort Enforcement**:
   - Strict range and format validation for eligible departmental cohorts:
     - **Group 1**: `FPA/CS/24/1-0001` through `FPA/CS/24/1-0084`
     - **Group 2**: `FPA/CS/25/1-0001` through `FPA/CS/25/1-0142`
   - CSV Bulk Importer with automatic deduplication and validation.
   - Manual student additions, eligibility toggles, and status resets.

3. **Email Verification & Fraud Prevention**:
   - Matriculation numbers are linked to registered student emails.
   - 6-digit OTP verification ensures accounts are validated before ballot access is unlocked.

4. **Dynamic Ballot & Accessible UI**:
   - Positions (President, Vice President, etc.) are created dynamically by the administrator.
   - Large candidate cards featuring verified photos (max 3MB with automatic browser canvas compression).
   - Clear, accessible **YES / NO** controls requiring an explicit choice for every candidate (no pre-selected defaults).
   - Summary review checklist and final confirmation dialog before submission.

5. **Vote Privacy & Admin Command Center**:
   - Row Level Security (RLS) ensures regular students cannot query ballots, audit logs, or confidential results before official release.
   - Administrator dashboard with live turnout gauges, candidate tally breakdowns, CSV export, single voter resets, and multi-factor destructive election reset controls.
   - Zero client exposure of `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🚀 Setup & Deployment Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- A free **Supabase** account ([supabase.com](https://supabase.com))
- A free **Vercel** account for hosting ([vercel.com](https://vercel.com))

---

### 2. Install Dependencies
Clone the repository and run:
```bash
npm install
```

---

### 3. Create Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **New project**.
2. Give your project a name (e.g. `nacos-voting-system`) and generate a secure database password.
3. Choose your preferred region.

---

### 4. Run SQL Migrations
Navigate to the **SQL Editor** tab in your Supabase dashboard and execute the migration files located in `supabase/migrations/` in numerical order:

1. **`01_schema.sql`**: Creates tables (`admin_users`, `students`, `elections`, `positions`, `candidates`, `votes`, `vote_answers`, `audit_logs`), indexes, and triggers.
2. **`02_rpc_submit_vote.sql`**: Installs the atomic `submit_vote` procedure with row locking and transaction rollback.
3. **`03_rls_policies.sql`**: Configures Row Level Security and provisions the `candidates` storage bucket.
4. **`04_results_rpc.sql`**: Installs the secure `get_election_results` tally procedure.
5. **`05_admin_reset_rpc.sql`**: Installs administrative reset functions (`admin_reset_voter` and `admin_reset_all_votes`).
6. *(Optional)* **`06_seed_demo.sql`**: Seeds sample positions and candidates for staging/demonstration.

---

### 5. Configure Authentication & Email Verification
1. In your Supabase Dashboard, go to **Authentication** -> **Providers** -> **Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. Toggle **Confirm email** to **ON** (for production email OTP verification).
4. Under **Email Templates**, customize your verification OTP code template with NACOS branding.

---

### 6. Configure Supabase Storage
1. Go to **Storage** in your Supabase dashboard.
2. Verify that the bucket named `candidates` is created (automatically created by `03_rls_policies.sql`).
3. Ensure the bucket is marked as **Public** so that candidate photos can be rendered on student ballots.

---

### 7. Create Administrator Account
To establish your first administrator account securely:

1. Go to **Authentication** -> **Users** in Supabase and click **Add user** -> **Create user**.
2. Enter the admin email (e.g. `admin@nacos.org`) and a strong password. Check **Auto Confirm Email**.
3. Copy the newly created user's `UUID`.
4. Open the **SQL Editor** and run:
```sql
INSERT INTO public.admin_users (id, email, full_name, role)
VALUES ('PASTE-USER-UUID-HERE', 'admin@nacos.org', 'Electoral Commission Chairman', 'super_admin');
```

---

### 8. Configure Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```env
# Frontend Configuration (Vite)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_APP_NAME="NACOS Electoral Commission"

# Serverless Functions (Used by Vercel / Node backend - Never expose to client)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Find your **URL**, **Anon Key**, and **Service Role Key** under **Project Settings** -> **API** in Supabase.

---

### 9. Run Locally
To launch the Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### 10. Administrator Workflow Guide

#### A. Importing Students via CSV
1. Sign in to `/admin` using your administrator credentials.
2. Click **Students / Voters** in the sidebar.
3. Click **Import CSV** and select your CSV file (you can test with `public/sample_students.csv`).
4. Required columns: `matric_number`, `full_name`, `email`.
5. The importer verifies matriculation formats, checks against Group 1 & 2 cohorts, eliminates duplicates, and commits to the database.

#### B. Adding Positions & Candidates
1. Go to **Positions** -> Click **Add Position** (e.g. *President*, *Vice President*, *Director of Socials*).
2. Go to **Candidates** -> Click **Add Candidate**.
3. Assign the candidate to a position, enter their full name, matric number, manifesto, and upload their photo.
4. Images above 3 MB are automatically rejected; valid images are compressed and uploaded to Supabase Storage.

#### C. Opening the Election
1. Go to **Elections** -> Create or edit the current election session.
2. Click **Open Election**. Students can now sign in and cast ballots.

#### D. Viewing Live Tallies & Releasing Results
1. Go to **Results & Tally** to view real-time voter turnout and candidate YES/NO percentages.
2. Click **Export CSV** to download certified election ledgers.
3. When voting concludes, click **Release Results to Voters** to make the results visible on student portals.

---

### 11. Deploying to Vercel
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New** -> **Project** and import your repository.
3. Framework Preset: **Vite**.
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. Vercel will automatically build the frontend and deploy the serverless routes in `/api/`.

---

## 🔒 Security Compliance Checklist
- [x] Passwords managed exclusively via Supabase Auth (no plaintext passwords).
- [x] Database-enforced atomic row-lock on voter profile (`FOR UPDATE`).
- [x] Row Level Security (RLS) restricts vote reads and admin operations.
- [x] Candidate photos client-validated (<= 3MB, MIME validation) and compressed.
- [x] Dangerous action (RESET ALL VOTES) protected with phrase typing and admin reauthentication.
- [x] Full administrative audit trail.
