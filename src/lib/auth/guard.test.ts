import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { guardDecision, guardForPath } from "./guard";
import { parseUserRole, ROLE_VALUES } from "./roles";

// Route-guard decision matrix. Pure logic — no provider, no database.

describe("guardForPath", () => {
  it("guards /supplier and everything under it with SUPPLIER", () => {
    expect(guardForPath("/supplier")).toBe("SUPPLIER");
    expect(guardForPath("/supplier/inbox")).toBe("SUPPLIER");
    expect(guardForPath("/supplier/inbox/abc?page=2")).toBe("SUPPLIER");
  });

  it("guards /admin and everything under it with ADMIN", () => {
    expect(guardForPath("/admin")).toBe("ADMIN");
    expect(guardForPath("/admin/suppliers")).toBe("ADMIN");
  });

  it("does not guard look-alike paths without the slash boundary", () => {
    expect(guardForPath("/suppliers")).toBeNull();
    expect(guardForPath("/administrators")).toBeNull();
  });

  it("leaves the public brand journey anonymous", () => {
    expect(guardForPath("/")).toBeNull();
    expect(guardForPath("/results")).toBeNull();
    expect(guardForPath("/product/abc")).toBeNull();
    expect(guardForPath("/auth/sign-in")).toBeNull();
  });
});

describe("guardDecision", () => {
  it("allows public paths regardless of session", () => {
    expect(
      guardDecision({ pathWithQuery: "/results", hasSession: false, role: null }),
    ).toEqual({ kind: "allow" });
    expect(
      guardDecision({ pathWithQuery: "/", hasSession: true, role: "BRAND" }),
    ).toEqual({ kind: "allow" });
  });

  it("sends unauthenticated visitors to sign-in, preserving the target", () => {
    const decision = guardDecision({
      pathWithQuery: "/supplier/inbox?page=2",
      hasSession: false,
      role: null,
    });
    expect(decision).toEqual({
      kind: "redirect",
      to: `/auth/sign-in?next=${encodeURIComponent("/supplier/inbox?page=2")}`,
    });
  });

  it("sends authenticated users without the required role to access-denied", () => {
    expect(
      guardDecision({
        pathWithQuery: "/supplier/inbox",
        hasSession: true,
        role: "BRAND",
      }),
    ).toEqual({ kind: "redirect", to: "/auth/access-denied" });
    expect(
      guardDecision({
        pathWithQuery: "/admin",
        hasSession: true,
        role: "SUPPLIER",
      }),
    ).toEqual({ kind: "redirect", to: "/auth/access-denied" });
  });

  it("fails closed when a session exists but the role is unknown", () => {
    expect(
      guardDecision({
        pathWithQuery: "/admin",
        hasSession: true,
        role: null,
      }),
    ).toEqual({ kind: "redirect", to: "/auth/access-denied" });
  });

  it("allows the matching role through", () => {
    expect(
      guardDecision({
        pathWithQuery: "/supplier/inbox",
        hasSession: true,
        role: "SUPPLIER",
      }),
    ).toEqual({ kind: "allow" });
    expect(
      guardDecision({
        pathWithQuery: "/admin/suppliers",
        hasSession: true,
        role: "ADMIN",
      }),
    ).toEqual({ kind: "allow" });
  });

  it("opens the claim page to any signed-in role — it is the page that makes a supplier", () => {
    expect(
      guardDecision({
        pathWithQuery: "/supplier/claim",
        hasSession: true,
        role: "BRAND",
      }),
    ).toEqual({ kind: "allow" });
    expect(
      guardDecision({
        pathWithQuery: "/supplier/claim",
        hasSession: true,
        role: "ADMIN",
      }),
    ).toEqual({ kind: "allow" });
  });

  it("still requires sign-in for the claim page and denies anonymous visitors", () => {
    expect(
      guardDecision({
        pathWithQuery: "/supplier/claim",
        hasSession: false,
        role: null,
      }),
    ).toEqual({
      kind: "redirect",
      to: `/auth/sign-in?next=${encodeURIComponent("/supplier/claim")}`,
    });
  });

  it("keeps the strict role for the rest of the supplier area", () => {
    expect(
      guardDecision({
        pathWithQuery: "/supplier/inbox",
        hasSession: true,
        role: "BRAND",
      }),
    ).toEqual({ kind: "redirect", to: "/auth/access-denied" });
  });
});

describe("role values vs the Prisma schema", () => {
  // roles.ts exists so the edge middleware never imports Prisma. This pin
  // keeps its union in lockstep with the real enum so the two cannot drift.
  it("matches the Role enum in prisma/schema.prisma", () => {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const schema = readFileSync(schemaPath, "utf8");
    const match = schema.match(/enum Role\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();

    const prismaRoles = (match?.[1] ?? "")
      .split(/\s+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && !entry.startsWith("//"));

    expect(prismaRoles).toEqual([...ROLE_VALUES]);
  });

  it("parses known roles and rejects everything else", () => {
    expect(parseUserRole("BRAND")).toBe("BRAND");
    expect(parseUserRole("SUPPLIER")).toBe("SUPPLIER");
    expect(parseUserRole("ADMIN")).toBe("ADMIN");
    expect(parseUserRole("brand")).toBeNull();
    expect(parseUserRole("GOD")).toBeNull();
    expect(parseUserRole(null)).toBeNull();
    expect(parseUserRole(undefined)).toBeNull();
  });
});
