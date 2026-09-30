import { describe, expect, it } from "vitest";

import {
  DEV_AUTH_COOKIE,
  devAuthEmail,
  devAuthEnabled,
  devAuthRole,
  devAuthUserId,
} from "./dev-auth";
import { parseUserRole } from "./roles";

// The dev auth harness must be inert unless explicitly enabled outside
// production. A leaked enable flag in a deployed build is the failure mode
// this pins shut: production builds ignore AEKOBABA_DEV_AUTH entirely.

describe("devAuthEnabled", () => {
  const ORIGINAL_ENV = process.env;

  function withEnv(env: NodeJS.ProcessEnv, fn: () => void) {
    process.env = { ...ORIGINAL_ENV, ...env };
    try {
      fn();
    } finally {
      process.env = ORIGINAL_ENV;
    }
  }

  it("is on only when NODE_ENV is not production AND the flag is 1", () => {
    withEnv({ NODE_ENV: "development", AEKOBABA_DEV_AUTH: "1" }, () => {
      expect(devAuthEnabled()).toBe(true);
    });
    withEnv({ NODE_ENV: "test", AEKOBABA_DEV_AUTH: "1" }, () => {
      expect(devAuthEnabled()).toBe(true);
    });
  });

  it("is off in production even when the flag is set", () => {
    withEnv({ NODE_ENV: "production", AEKOBABA_DEV_AUTH: "1" }, () => {
      expect(devAuthEnabled()).toBe(false);
    });
  });

  it("is off when the flag is missing or any other value", () => {
    withEnv({ NODE_ENV: "development", AEKOBABA_DEV_AUTH: undefined }, () => {
      expect(devAuthEnabled()).toBe(false);
    });
    withEnv({ NODE_ENV: "development", AEKOBABA_DEV_AUTH: "true" }, () => {
      expect(devAuthEnabled()).toBe(false);
    });
    withEnv({ NODE_ENV: "development", AEKOBABA_DEV_AUTH: "0" }, () => {
      expect(devAuthEnabled()).toBe(false);
    });
  });
});

describe("devAuthRole", () => {
  it("parses real role values and rejects everything else", () => {
    expect(devAuthRole("ADMIN")).toBe("ADMIN");
    expect(devAuthRole("SUPPLIER")).toBe("SUPPLIER");
    expect(devAuthRole("BRAND")).toBe("BRAND");
    expect(devAuthRole("ROOT")).toBeNull();
    expect(devAuthRole(undefined)).toBeNull();
  });
});

describe("fixture identity", () => {
  it("produces distinct ids per role and parses back through the real enum", () => {
    const role = parseUserRole("SUPPLIER");
    if (!role) throw new Error("roles module broken");
    expect(devAuthUserId(role)).toBe("dev-supplier-user");
    expect(devAuthEmail(role)).toBe("supplier@dev.aekobaba.test");
    expect(devAuthUserId("ADMIN")).not.toBe(devAuthUserId("BRAND"));
    expect(typeof DEV_AUTH_COOKIE).toBe("string");
  });
});
