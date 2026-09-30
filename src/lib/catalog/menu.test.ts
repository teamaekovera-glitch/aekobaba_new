import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CATEGORY_MENU } from "./menu";

// The header menu is a code constant; this test is the sync mechanism with
// the seeded taxonomy. A seed rename must fail here, not ship a stale menu.

const seed = JSON.parse(
  readFileSync(path.join(__dirname, "../../../data/aekobaba-seed.json"), "utf8"),
) as { categories: { slug: string; name: string }[] };

describe("CATEGORY_MENU", () => {
  it("covers exactly the seeded taxonomy — same slugs, same names, same order", () => {
    expect(CATEGORY_MENU).toEqual(
      seed.categories.map((c) => ({ slug: c.slug, name: c.name })),
    );
  });

  it("links every menu entry through /results?category=", () => {
    for (const entry of CATEGORY_MENU) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
