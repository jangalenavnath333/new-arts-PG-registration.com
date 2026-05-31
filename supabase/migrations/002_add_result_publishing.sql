-- =====================================================================
-- Migration 002: Add Result Publishing System
-- =====================================================================

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default value
INSERT INTO public.system_settings (key, value) VALUES ('results_published', 'false') ON CONFLICT DO NOTHING;

-- RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON public.system_settings FOR UPDATE USING (true);
CREATE POLICY "settings_insert" ON public.system_settings FOR INSERT WITH CHECK (true);

-- 2. Add rank columns to exam_results if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_results' AND column_name='overall_rank') THEN
    ALTER TABLE public.exam_results ADD COLUMN overall_rank INT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_results' AND column_name='category_rank') THEN
    ALTER TABLE public.exam_results ADD COLUMN category_rank INT;
  END IF;
END $$;
