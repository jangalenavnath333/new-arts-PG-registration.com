-- Migration: Lock down student_documents and storage buckets to prevent unauthorized deletes/updates.
-- Note: This ensures true immutability. Students can INSERT, but cannot UPDATE or DELETE.
-- Only Admins (authenticated via the configured role/email) can DELETE or UPDATE.

-- 1. Enable RLS on student_documents
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (since applications are submitted anonymously or via frontend)
CREATE POLICY "Allow public insert on student_documents"
ON public.student_documents FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to SELECT their own documents (or all if public read is needed for preview)
CREATE POLICY "Allow public select on student_documents"
ON public.student_documents FOR SELECT
TO public
USING (true);

-- Block UPDATE and DELETE for anonymous users, but allow for authenticated admins.
-- Assuming admins are authenticated and have an email like 'admin@newarts-casas-pgcet.in'
CREATE POLICY "Allow admin update on student_documents"
ON public.student_documents FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

CREATE POLICY "Allow admin delete on student_documents"
ON public.student_documents FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');


-- 2. Storage Bucket Policies for 'student-documents', 'student-photos', 'payment-screenshots'
-- We cannot write standard SQL for storage here directly without `storage.objects` table.
-- Assuming you run this in Supabase SQL editor:

-- Drop existing generic storage policies if needed (replace names as applicable)
-- DROP POLICY IF EXISTS "public_upload" ON storage.objects;

-- Allow INSERT for public on specific buckets
CREATE POLICY "Allow public insert to buckets"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id IN ('student-documents', 'student-photos', 'payment-screenshots') );

-- Allow SELECT for public on specific buckets
CREATE POLICY "Allow public select from buckets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id IN ('student-documents', 'student-photos', 'payment-screenshots') );

-- Prevent UPDATE and DELETE by default, allow only for admins
CREATE POLICY "Allow admin update in buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

CREATE POLICY "Allow admin delete in buckets"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

-- Add tracking_id to student_documents
ALTER TABLE public.student_documents ADD COLUMN IF NOT EXISTS tracking_id TEXT;
