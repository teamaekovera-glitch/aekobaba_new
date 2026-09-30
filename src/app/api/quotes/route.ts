import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { artworkUploader, MAX_ARTWORK_BYTES, type ArtworkFile } from "@/lib/quotes/storage";
import { createQuoteRequest } from "@/lib/quotes/submit";
import { quoteSubmitSchema } from "@/lib/quotes/validation";

// POST /api/quotes — Quote Basket submission (build spec C9/C11).
//
// Multipart form: `payload` (JSON string: items, deadline, artworkNotes) plus
// the optional `artwork` file. Auth-gated per the role model: BRAND users
// send quote requests — anonymous callers get 401 (the client redirects to
// sign-in with the basket preserved in localStorage), other roles 403.
// Identity comes from the session; the fan-out and MOQ warnings live in
// src/lib/quotes/submit.ts.

const SUBMIT_FAILURE_STATUS = {
  empty_items: 400,
  no_brand_user: 403,
  unknown_products: 400,
} as const;

async function parseArtwork(value: FormDataEntryValue | null): Promise<ArtworkFile | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  return {
    bytes: Buffer.from(await value.arrayBuffer()),
    contentType: value.type || "application/octet-stream",
    name: value.name,
  };
}

export async function POST(request: Request) {
  const auth = await requireApiRole("BRAND");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "invalid_form");
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return jsonError(400, "invalid_payload");
  }

  const parsed = quoteSubmitSchema.safeParse(rawPayload);
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const artwork = await parseArtwork(form.get("artwork"));
  let artworkFileUrl: string | null = null;
  if (artwork) {
    if (artwork.bytes.byteLength > MAX_ARTWORK_BYTES) return jsonError(413, "artwork_too_large");
    const uploader = await artworkUploader();
    if (!uploader) return jsonError(503, "artwork_storage_unavailable");
    try {
      artworkFileUrl = await uploader(artwork);
    } catch (uploadError) {
      // Surface the storage failure — the brand must know their artwork did
      // not attach, never submit silently without it.
      console.error("[aekobaba] artwork upload failed", uploadError);
      return jsonError(502, "artwork_upload_failed");
    }
  }

  const result = await createQuoteRequest(db, {
    supabaseUserId: auth.supabaseUserId,
    items: parsed.data.items,
    deadline: parsed.data.deadline ? new Date(`${parsed.data.deadline}T00:00:00Z`) : null,
    artworkNotes: parsed.data.artworkNotes ?? null,
    artworkFileUrl,
  });

  if (!result.ok) {
    const status = SUBMIT_FAILURE_STATUS[result.reason];
    return Response.json(
      { error: result.reason, unknownProductIds: result.unknownProductIds },
      { status },
    );
  }

  return Response.json(
    {
      quoteRequest: { id: result.request.id, status: result.request.status },
      itemCount: result.request.itemCount,
      supplierCount: result.request.supplierCount,
      warnings: result.warnings,
    },
    { status: 201 },
  );
}
