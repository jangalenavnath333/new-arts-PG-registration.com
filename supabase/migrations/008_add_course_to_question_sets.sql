-- Migration 008: Add course column to question_sets table
ALTER TABLE public.question_sets ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'All Courses';

-- Drop any potential policies on question_sets that restrict read access (just in case, to make sure offline fetch works)
-- We'll keep the existing policies for now.
