/**
 * Service-role Supabase client for Edge Functions. The secret key exists only in the
 * function's environment and never ships in the app.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

/** The secret key: new-style `SUPABASE_SECRET_KEYS` (JSON, "default"), else the legacy one. */
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed: unknown = JSON.parse(keys);
    if (parsed && typeof parsed === 'object' && 'default' in parsed) {
      const key = (parsed as Record<string, unknown>).default;
      if (typeof key === 'string' && key) return key;
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('No secret key in the function environment.');
  return legacy;
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL is not set.');
  return createClient(url, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
