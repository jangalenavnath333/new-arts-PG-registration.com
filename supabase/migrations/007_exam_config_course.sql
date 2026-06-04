-- Migration 007: Add course column to exam_config table
ALTER TABLE public.exam_config ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'All Courses';

-- Drop the old policy that allows anyone to read
DROP POLICY IF EXISTS "public_read_config" ON public.exam_config;

-- Create a new policy that allows anyone to read active configs
CREATE POLICY "public_read_config" ON public.exam_config FOR SELECT TO public USING (is_active = true);
