import { describe, expect, it, vi } from "vitest";

// Artwork uploader (spec: artwork file upload via env-configured client).
// The pure factory is what the route uses through artworkUploader(); these
// tests pin the safety behavior — sanitized paths, error propagation, public
// URL return. Live Supabase credentials are pending (spec open question).

import { createArtworkUploader, type StorageBucketClient } from "./storage";

function bucketStub(): StorageBucketClient & {
  upload: ReturnType<typeof vi.fn>;
  getPublicUrl: ReturnType<typeof vi.fn>;
} {
  return {
    upload: vi.fn(async () => ({ error: null })),
    getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://storage.example/object/public/${path}` } })),
  };
}

const file = {
  bytes: Buffer.from("pdf-bytes"),
  contentType: "application/pdf",
  name: "brand logo FINAL.pdf",
};

describe("createArtworkUploader", () => {
  it("uploads under the prefix with a timestamp and sanitized filename, returning the public URL", async () => {
    const bucket = bucketStub();
    const upload = createArtworkUploader(bucket, "quote-requests");

    const url = await upload(file);

    const [path, body, options] = bucket.upload.mock.calls[0] as [string, Buffer, { contentType: string }];
    expect(path).toMatch(/^quote-requests\/\d+-brand_logo_FINAL\.pdf$/);
    expect(body).toBe(file.bytes);
    expect(options).toEqual({ contentType: "application/pdf" });
    expect(url).toBe(`https://storage.example/object/public/${path}`);
  });

  it("falls back to a safe name when the original sanitizes to nothing", async () => {
    const bucket = bucketStub();
    const upload = createArtworkUploader(bucket, "quote-requests");
    await upload({ ...file, name: "" });
    const [path] = bucket.upload.mock.calls[0] as [string];
    expect(path).toMatch(/^quote-requests\/\d+-artwork$/);
  });

  it("propagates the storage error — the caller surfaces it, never fakes success", async () => {
    const bucket = bucketStub();
    bucket.upload.mockResolvedValue({ error: { message: "bucket not found" } });
    const upload = createArtworkUploader(bucket, "quote-requests");
    await expect(upload(file)).rejects.toThrow("bucket not found");
  });
});
