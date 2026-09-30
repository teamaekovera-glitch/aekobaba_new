import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// The callback route is tested with a stubbed Supabase client — no live
// provider required (live Supabase credentials are pending per the spec).

const mocks = vi.hoisted(() => {
  return {
    provisionUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
  };
});

vi.mock("@/lib/auth/session", () => ({
  provisionUser: mocks.provisionUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseEnv: () => ({
    url: "https://stub.supabase.co",
    anonKey: "stub-anon-key",
  }),
  createSupabaseServerClient: () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
  }),
}));

function requestFor(query: string) {
  return new NextRequest(`http://localhost:3000/auth/callback${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provisionUser.mockResolvedValue({
    created: true,
    user: { supabaseUserId: "u1", email: "b@example.com", role: "BRAND" },
  });
});

describe("GET /auth/callback", () => {
  it("redirects to sign-in with an error when the code is missing", async () => {
    const response = await GET(
      requestFor("?next=%2Fsupplier%2Finbox")
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/sign-in?error=missing_code",
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("passes the provider error code through to the sign-in page", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { code: "otp_disabled" },
    });
    const response = await GET(requestFor("?code=abc"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/sign-in?error=otp_disabled",
    );
    expect(mocks.provisionUser).not.toHaveBeenCalled();
  });

  it("exchanges the code, provisions the user, and honors a safe next path", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "b@example.com" } },
      error: null,
    });

    const response = await GET(
      requestFor("?code=abc&next=%2Fsupplier%2Finbox")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/supplier/inbox",
    );
    expect(mocks.provisionUser).toHaveBeenCalledWith({
      supabaseUserId: "u1",
      email: "b@example.com",
    });
  });

  it("ignores an unsafe next value and returns the user home", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "b@example.com" } },
      error: null,
    });

    const response = await GET(
      requestFor("?code=abc&next=https%3A%2F%2Fevil.test")
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("reports a failure when the session exists but no user comes back", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(requestFor("?code=abc"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/sign-in?error=exchange_failed",
    );
    expect(mocks.provisionUser).not.toHaveBeenCalled();
  });
});
