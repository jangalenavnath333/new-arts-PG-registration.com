-- =====================================================================
-- CET EXAM PORTAL - SUPABASE DATABASE SCHEMA (FIXED & IDEMPOTENT)
-- Run this ENTIRE script in Supabase Dashboard -> SQL Editor -> Run
-- Safe to run multiple times — will not duplicate or error.
-- =====================================================================


-- =====================
-- TABLE 1: students
-- =====================
CREATE TABLE IF NOT EXISTS public.students (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     UUID,
  student_id       TEXT UNIQUE,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  mobile           TEXT,
  dob              TEXT,
  address          TEXT,
  category         TEXT,
  status           TEXT DEFAULT 'pending',
  application_status TEXT DEFAULT 'PENDING_APPROVAL',
  exam_status      TEXT DEFAULT 'NOT_SCHEDULED',
  has_attempted    BOOLEAN DEFAULT false,
  active_violations INT DEFAULT 0,
  lock_reason      TEXT,
  exam_time_left   INT,
  payment_status   TEXT DEFAULT 'Pending Verification',
  payment_utr      TEXT,
  payment_date     TIMESTAMPTZ,
  payment_amount   TEXT DEFAULT 'Rs.1',
  transaction_id   TEXT,
  course_applied   TEXT,
  stream           TEXT,
  academic_details JSONB,
  password_hash    TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT now(),
  applied_at       TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, course_applied)
);

-- =====================
-- TABLE 2: student_documents
-- =====================
CREATE TABLE IF NOT EXISTS public.student_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- TABLE 3: payments
-- =====================
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.students(id) ON DELETE CASCADE,
  application_id  TEXT,
  cet_student_id  TEXT,
  full_name       TEXT,
  email           TEXT,
  course_applied  TEXT,
  payment_status  TEXT DEFAULT 'PAID_DEMO',
  payment_amount  TEXT,
  payment_utr     TEXT,
  payment_date    TIMESTAMPTZ,
  screenshot_url  TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- TABLE 4: exam_config
-- =====================
CREATE TABLE IF NOT EXISTS public.exam_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_date         TEXT,
  start_time        TEXT,
  duration_minutes  INT DEFAULT 60,
  is_active         BOOLEAN DEFAULT false,
  instructions      JSONB DEFAULT '[]'::jsonb,
  rules             JSONB DEFAULT '[]'::jsonb,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Insert default config row only if table is empty
INSERT INTO public.exam_config (exam_date, start_time, duration_minutes, is_active)
SELECT '', '', 60, false
WHERE NOT EXISTS (SELECT 1 FROM public.exam_config LIMIT 1);

-- =====================
-- TABLE 5: question_sets
-- =====================
CREATE TABLE IF NOT EXISTS public.question_sets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT false,
  questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- TABLE 6: exam_attempts
-- =====================
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  cet_student_id   TEXT,
  started_at       TIMESTAMPTZ DEFAULT now(),
  submitted_at     TIMESTAMPTZ,
  time_left_secs   INT,
  answers          JSONB DEFAULT '{}'::jsonb,
  score            NUMERIC DEFAULT 0,
  total_questions  INT,
  violations       INT DEFAULT 0,
  submit_status    TEXT,
  is_auto_submit   BOOLEAN DEFAULT false,
  UNIQUE(student_id)
);

-- =====================
-- TABLE 7: exam_results
-- =====================
CREATE TABLE IF NOT EXISTS public.exam_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES public.students(id) ON DELETE CASCADE,
  attempt_id       UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL,
  cet_student_id   TEXT,
  student_name     TEXT,
  score            NUMERIC,
  total            INT,
  correct_answers  INT,
  wrong_answers    INT,
  unanswered       INT,
  violations       INT,
  time_used_secs   INT,
  course           TEXT,
  category         TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- TABLE 8: security_logs
-- =====================
CREATE TABLE IF NOT EXISTS public.security_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.students(id) ON DELETE CASCADE,
  cet_student_id  TEXT,
  student_name    TEXT,
  event_type      TEXT NOT NULL,
  message         TEXT,
  logged_at       TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- TABLE 9: locked_exams
-- =====================
CREATE TABLE IF NOT EXISTS public.locked_exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.students(id) ON DELETE CASCADE,
  cet_student_id  TEXT UNIQUE,
  student_name    TEXT,
  course          TEXT,
  warning_count   INT DEFAULT 0,
  reason          TEXT,
  locked_at       TIMESTAMPTZ DEFAULT now()
);


-- =====================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locked_exams ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- Phase 1: Open access for anon key (dual-write with localStorage)
-- Phase 6: Will tighten to role-based after Supabase Auth is integrated
-- =====================================================================

-- Drop all existing policies first (idempotent)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ===========================
-- STUDENTS
-- ===========================
CREATE POLICY "students_select" ON public.students FOR SELECT USING (true);
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (true);
CREATE POLICY "students_delete" ON public.students FOR DELETE USING (true);

-- ===========================
-- STUDENT_DOCUMENTS
-- ===========================
CREATE POLICY "docs_select" ON public.student_documents FOR SELECT USING (true);
CREATE POLICY "docs_insert" ON public.student_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "docs_update" ON public.student_documents FOR UPDATE USING (true);
CREATE POLICY "docs_delete" ON public.student_documents FOR DELETE USING (true);

-- ===========================
-- PAYMENTS
-- ===========================
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (true);

-- ===========================
-- EXAM_CONFIG
-- ===========================
CREATE POLICY "exam_config_select" ON public.exam_config FOR SELECT USING (true);
CREATE POLICY "exam_config_insert" ON public.exam_config FOR INSERT WITH CHECK (true);
CREATE POLICY "exam_config_update" ON public.exam_config FOR UPDATE USING (true);

-- ===========================
-- QUESTION_SETS
-- ===========================
CREATE POLICY "qsets_select" ON public.question_sets FOR SELECT USING (true);
CREATE POLICY "qsets_insert" ON public.question_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "qsets_update" ON public.question_sets FOR UPDATE USING (true);
CREATE POLICY "qsets_delete" ON public.question_sets FOR DELETE USING (true);

-- ===========================
-- EXAM_ATTEMPTS
-- ===========================
CREATE POLICY "attempts_select" ON public.exam_attempts FOR SELECT USING (true);
CREATE POLICY "attempts_insert" ON public.exam_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "attempts_update" ON public.exam_attempts FOR UPDATE USING (true);

-- ===========================
-- EXAM_RESULTS
-- ===========================
CREATE POLICY "results_select" ON public.exam_results FOR SELECT USING (true);
CREATE POLICY "results_insert" ON public.exam_results FOR INSERT WITH CHECK (true);

-- ===========================
-- SECURITY_LOGS
-- ===========================
CREATE POLICY "logs_select" ON public.security_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON public.security_logs FOR INSERT WITH CHECK (true);

-- ===========================
-- LOCKED_EXAMS
-- ===========================
CREATE POLICY "locked_select" ON public.locked_exams FOR SELECT USING (true);
CREATE POLICY "locked_insert" ON public.locked_exams FOR INSERT WITH CHECK (true);
CREATE POLICY "locked_update" ON public.locked_exams FOR UPDATE USING (true);
CREATE POLICY "locked_delete" ON public.locked_exams FOR DELETE USING (true);


-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first if exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
  DROP POLICY IF EXISTS "storage_read" ON storage.objects;
  DROP POLICY IF EXISTS "allow_uploads" ON storage.objects;
  DROP POLICY IF EXISTS "allow_reads" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('student-documents', 'student-photos', 'payment-screenshots')
  );

CREATE POLICY "storage_read" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('student-documents', 'student-photos', 'payment-screenshots')
  );


-- =====================================================================
-- DONE! All 9 tables, RLS policies, and 3 storage buckets created.
-- =====================================================================
