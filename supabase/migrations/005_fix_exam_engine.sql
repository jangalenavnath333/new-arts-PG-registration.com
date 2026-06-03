-- Migration: Add UNIQUE constraint on student_id in exam_attempts
-- This is necessary to support the upsert() function during the exam start/resume flow.

ALTER TABLE public.exam_attempts
DROP CONSTRAINT IF EXISTS exam_attempts_student_id_key;

ALTER TABLE public.exam_attempts
ADD CONSTRAINT exam_attempts_student_id_key UNIQUE (student_id);
