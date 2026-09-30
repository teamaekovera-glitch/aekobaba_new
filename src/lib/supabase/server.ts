import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase server clients. Two distinct construction sites:
//
// - Server Components / Server Actions / Route Handlers use `cookies()` from
//   `next/headers` (Node runtime). Server Actions and Route Handlers may write
//   cookies, so token refresh works there; Server Components are read-only by
//   contract — the middleware keeps refresh cookies current for renders.
// - The edge middleware builds its own client against the request/response
//   cookie pair (see src/middleware.ts).

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Read Supabase env, or null when unset — callers fail closed on null. */
export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function createSupabaseServerClient(env: SupabaseEnv) {
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — cookies are read-only
          // there. The middleware refresh keeps sessions current for renders;
          // write paths (actions, route handlers) can set cookies and proceed.
        }
      },
    },
  });
}
