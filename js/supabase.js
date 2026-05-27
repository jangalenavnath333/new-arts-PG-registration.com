// ============================================
// CET EXAM ONLINE - SUPABASE CLIENT
// ============================================
// This file initializes the Supabase client.
// It reads credentials from .env (via Vite).
// NEVER put the service_role key here — that stays on backend only.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file. ' +
    'Supabase features will be disabled. localStorage fallback will be used.'
  );
}

/**
 * The Supabase client instance.
 * Will be null if env vars are missing — all consumers must handle this gracefully.
 */
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Check if Supabase is available and connected.
 * @returns {boolean}
 */
export function isSupabaseReady() {
  return supabase !== null;
}

/**
 * Test the Supabase connection by making a simple query.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testConnection() {
  if (!supabase) {
    return { ok: false, message: 'Supabase client not initialized (missing env vars)' };
  }
  try {
    // Try to query a known table; if it doesn't exist yet, we'll get a specific error
    const { data, error } = await supabase.from('students').select('id').limit(1);
    if (error) {
      // "relation does not exist" means connection works but table not created yet — that's fine
      if (error.message.includes('does not exist')) {
        return { ok: true, message: 'Connected to Supabase! Tables not yet created.' };
      }
      return { ok: false, message: 'Supabase error: ' + error.message };
    }
    return { ok: true, message: 'Connected to Supabase successfully! ' + (data?.length || 0) + ' student(s) found.' };
  } catch (e) {
    return { ok: false, message: 'Connection failed: ' + e.message };
  }
}

export default supabase;
