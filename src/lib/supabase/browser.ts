import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client for the brand's realtime subscription. Built
// lazily — NEXT_PUBLIC_ env is inlined at build time, and when it is absent
// (pre-credentials dev) callers fall back to the dev SSE bridge instead.

export interface SupabaseBrowserEnv {
  url: string;
  anonKey: string;
}

/** Read Supabase env as the browser sees it, or null when unset. */
export function supabaseBrowserEnv(): SupabaseBrowserEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function createSupabaseBrowserClient(env: SupabaseBrowserEnv) {
  return createBrowserClient(env.url, env.anonKey);
}
