-- =====================================================================
-- CET EXAM PORTAL - FULL DATABASE SECURITY PATCH (MIGRATION 006)
-- =====================================================================
-- This script locks down all tables to prevent unauthorized access.
-- It implements SECURITY DEFINER RPCs (Stored Procedures) for all
-- student-facing operations, ensuring no direct table access is allowed.

-- 1. DROP ALL EXISTING PERMISSIVE POLICIES
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname NOT LIKE '%admin%' 
      AND policyname NOT LIKE '%system_settings%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 2. CREATE STRICT RLS POLICIES (ONLY ADMIN CAN ACCESS DIRECTLY)
-- Students
CREATE POLICY "admin_all_students" ON public.students TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
-- Student Documents
CREATE POLICY "admin_all_docs" ON public.student_documents TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
-- Payments
CREATE POLICY "admin_all_payments" ON public.payments TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
-- Exam Attempts
CREATE POLICY "admin_all_attempts" ON public.exam_attempts TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
-- Exam Results
CREATE POLICY "admin_all_results" ON public.exam_results TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
-- Security Logs
CREATE POLICY "admin_all_logs" ON public.security_logs TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
CREATE POLICY "allow_insert_logs" ON public.security_logs FOR INSERT TO public WITH CHECK (true); -- Allow anon to insert logs
-- Locked Exams
CREATE POLICY "admin_all_locked" ON public.locked_exams TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

-- Config & Question Sets (Allow public SELECT where active)
CREATE POLICY "public_read_config" ON public.exam_config FOR SELECT TO public USING (is_active = true);
CREATE POLICY "admin_all_config" ON public.exam_config TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

CREATE POLICY "public_read_qsets" ON public.question_sets FOR SELECT TO public USING (is_active = true);
CREATE POLICY "admin_all_qsets" ON public.question_sets TO authenticated USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');


-- =====================================================================
-- 3. SECURE STORED PROCEDURES (RPCs)
-- =====================================================================

-- RPC: Student Login
CREATE OR REPLACE FUNCTION student_login(p_email TEXT)
RETURNS TABLE (
  id UUID, student_id TEXT, full_name TEXT, email TEXT, mobile TEXT, password_hash TEXT, status TEXT, application_status TEXT, exam_status TEXT, has_attempted BOOLEAN, course_applied TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT s.id, s.student_id, s.full_name, s.email, s.mobile, s.password_hash, s.status, s.application_status, s.exam_status, s.has_attempted, s.course_applied 
  FROM public.students s
  WHERE s.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- RPC: Check Eligibility
CREATE OR REPLACE FUNCTION check_eligibility(p_identifier TEXT)
RETURNS TABLE (
  id UUID, student_id TEXT, full_name TEXT, email TEXT, status TEXT, application_status TEXT, exam_status TEXT, has_attempted BOOLEAN, active_violations INT, course_applied TEXT, category TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.student_id, s.full_name, s.email, s.status, s.application_status, s.exam_status, s.has_attempted, s.active_violations, s.course_applied, s.category
  FROM public.students s
  WHERE s.email = p_identifier OR s.student_id = p_identifier
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- RPC: Submit Application
CREATE OR REPLACE FUNCTION submit_student_application(
  p_student_row JSONB,
  p_doc_rows JSONB,
  p_payment_row JSONB
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Upsert Student
  INSERT INTO public.students (
    student_id, full_name, email, mobile, dob, address, category, status, application_status, exam_status, payment_status, payment_utr, payment_amount, transaction_id, course_applied, stream, academic_details, password_hash
  ) VALUES (
    p_student_row->>'student_id', p_student_row->>'full_name', p_student_row->>'email', p_student_row->>'mobile', p_student_row->>'dob', p_student_row->>'address', p_student_row->>'category', p_student_row->>'status', p_student_row->>'application_status', p_student_row->>'exam_status', p_student_row->>'payment_status', p_student_row->>'payment_utr', p_student_row->>'payment_amount', p_student_row->>'transaction_id', p_student_row->>'course_applied', p_student_row->>'stream', (p_student_row->>'academic_details')::JSONB, p_student_row->>'password_hash'
  )
  ON CONFLICT (email, course_applied) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    mobile = EXCLUDED.mobile,
    academic_details = EXCLUDED.academic_details,
    payment_status = EXCLUDED.payment_status,
    transaction_id = EXCLUDED.transaction_id,
    password_hash = EXCLUDED.password_hash
  RETURNING id INTO v_student_id;

  -- Delete old docs
  DELETE FROM public.student_documents WHERE student_id = v_student_id;
  
  -- Insert new docs
  IF p_doc_rows IS NOT NULL AND jsonb_array_length(p_doc_rows) > 0 THEN
    INSERT INTO public.student_documents (student_id, doc_type, file_url, file_name)
    SELECT v_student_id, doc_type, file_url, file_name
    FROM jsonb_to_recordset(p_doc_rows) AS x(doc_type TEXT, file_url TEXT, file_name TEXT);
  END IF;

  -- Insert payment
  IF p_payment_row IS NOT NULL THEN
    INSERT INTO public.payments (student_id, application_id, cet_student_id, full_name, email, course_applied, payment_status, payment_amount, payment_utr, screenshot_url)
    VALUES (
      v_student_id, p_payment_row->>'application_id', p_payment_row->>'cet_student_id', p_payment_row->>'full_name', p_payment_row->>'email', p_payment_row->>'course_applied', p_payment_row->>'payment_status', p_payment_row->>'payment_amount', p_payment_row->>'payment_utr', p_payment_row->>'screenshot_url'
    );
  END IF;

  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: Start Exam Attempt
CREATE OR REPLACE FUNCTION start_exam_attempt(p_student_uuid UUID, p_cet_student_id TEXT, p_total_questions INT)
RETURNS UUID SECURITY DEFINER AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO public.exam_attempts (student_id, cet_student_id, started_at, total_questions, answers, violations)
  VALUES (p_student_uuid, p_cet_student_id, now(), p_total_questions, '{}'::jsonb, 0)
  ON CONFLICT (student_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: Save Exam Progress
CREATE OR REPLACE FUNCTION save_exam_progress(p_attempt_id UUID, p_answers JSONB, p_time_left INT, p_violations INT)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  UPDATE public.exam_attempts
  SET answers = p_answers, time_left_secs = p_time_left, violations = p_violations
  WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: Submit Final Exam
CREATE OR REPLACE FUNCTION submit_final_exam(
  p_student_uuid UUID, p_attempt_id UUID, p_cet_student_id TEXT, p_name TEXT, 
  p_score NUMERIC, p_total INT, p_correct INT, p_wrong INT, p_unanswered INT, 
  p_violations INT, p_time_used INT, p_course TEXT, p_category TEXT, 
  p_submit_status TEXT, p_is_auto BOOLEAN, p_answers JSONB
)
RETURNS UUID SECURITY DEFINER AS $$
DECLARE
  v_result_id UUID;
BEGIN
  -- Update attempt
  UPDATE public.exam_attempts
  SET submitted_at = now(), score = p_score, violations = p_violations, submit_status = p_submit_status, is_auto_submit = p_is_auto, answers = p_answers, time_left_secs = 0
  WHERE id = p_attempt_id;

  -- Insert result
  INSERT INTO public.exam_results (student_id, attempt_id, cet_student_id, student_name, score, total, correct_answers, wrong_answers, unanswered, violations, time_used_secs, course, category, submitted_at)
  VALUES (p_student_uuid, p_attempt_id, p_cet_student_id, p_name, p_score, p_total, p_correct, p_wrong, p_unanswered, p_violations, p_time_used, p_course, p_category, now())
  RETURNING id INTO v_result_id;

  -- Update student
  UPDATE public.students
  SET has_attempted = true, exam_status = CASE WHEN p_submit_status LIKE '%Terminated%' THEN 'TERMINATED' ELSE 'COMPLETED' END
  WHERE id = p_student_uuid;

  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: Lock Exam
CREATE OR REPLACE FUNCTION lock_exam_procedure(p_student_uuid UUID, p_cet_student_id TEXT, p_name TEXT, p_course TEXT, p_warnings INT, p_reason TEXT, p_attempt_id UUID)
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  UPDATE public.students SET exam_status = 'LOCKED', active_violations = p_warnings WHERE id = p_student_uuid;
  
  INSERT INTO public.locked_exams (student_id, cet_student_id, student_name, course, warning_count, reason, locked_at)
  VALUES (p_student_uuid, p_cet_student_id, p_name, p_course, p_warnings, p_reason, now())
  ON CONFLICT (cet_student_id) DO UPDATE SET warning_count = p_warnings, reason = p_reason, locked_at = now();

  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.exam_attempts SET submit_status = 'LOCKED' WHERE id = p_attempt_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RPC: Get Exam Status
CREATE OR REPLACE FUNCTION get_exam_status(p_student_uuid UUID)
RETURNS TEXT SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT exam_status INTO v_status FROM public.students WHERE id = p_student_uuid;
  RETURN v_status;
END;
$$ LANGUAGE plpgsql;
