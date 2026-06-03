-- Migration: Create system_settings table to store global configurations like results_published
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to SELECT settings (e.g., checking if results are published)
CREATE POLICY "Allow public select on system_settings"
ON public.system_settings FOR SELECT
TO public
USING (true);

-- Allow admins to UPDATE or INSERT settings
CREATE POLICY "Allow admin update on system_settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');

CREATE POLICY "Allow admin insert on system_settings"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'admin@newarts-casas-pgcet.in');
