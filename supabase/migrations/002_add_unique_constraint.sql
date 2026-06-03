-- Migration: Add UNIQUE constraint on email and course_applied
-- This prevents duplicate applications for the same course and allows upsert() to work correctly.

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_email_course_applied_key;

ALTER TABLE public.students
ADD CONSTRAINT students_email_course_applied_key UNIQUE (email, course_applied);
