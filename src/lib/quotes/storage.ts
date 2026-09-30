import { createSupabaseServerClient, supabaseEnv } from "@/lib/supabase/server";

// Artwork upload to Supabase Storage (the `artwork-uploads` bucket). The
// route handler uploads server-side through the session client so the file
// never passes through a client-side service key. Live Supabase credentials
// are pending (spec open question) — `artworkUploader()` returns null when
// env is missing and the route answers honestly instead of faking a URL.

export const ARTWORK_BUCKET = "artwork-uploads";
/** 10 MiB ceiling for a brand's artwork file. */
export const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;

export interface ArtworkFile {
  bytes: Buffer;
  contentType: string;
  name: string;
}

/** Narrow slice of the Supabase Storage bucket API the uploader touches. */
export interface StorageBucketClient {
  upload(
    path: string,
    body: Buffer,
    options: { contentType: string },
  ): Promise<{ error: { message: string } | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

export type ArtworkUploader = (file: ArtworkFile) => Promise<string>;

/**
 * Pure uploader factory — injectable in tests. Files land under the brand's
 * prefix with a timestamp guard against collisions; names are sanitized to a
 * safe storage path (the original name is not trusted).
 */
export function createArtworkUploader(bucket: StorageBucketClient, prefix: string): ArtworkUploader {
  return async (file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "artwork";
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { error } = await bucket.upload(path, file.bytes, { contentType: file.contentType });
    if (error) throw new Error(error.message);
    return bucket.getPublicUrl(path).data.publicUrl;
  };
}

/**
 * The route's uploader: session-scoped Supabase Storage client, or null when
 * Supabase env is not configured — callers surface that as an honest error,
 * never a fabricated URL.
 */
export async function artworkUploader(): Promise<ArtworkUploader | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const supabase = await createSupabaseServerClient(env);
  return createArtworkUploader(supabase.storage.from(ARTWORK_BUCKET), "quote-requests");
}
