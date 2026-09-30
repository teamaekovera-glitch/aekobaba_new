import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The schema file IS the data contract (build spec art_MObD9666). These tests
// pin its two load-bearing rules at the contract level:
//
// 1. Provenance — commercial facts carry sourceUrl + sourceCapturedAt, and on
//    Product those are NOT NULL: an untraceable row cannot exist.
// 2. Honesty — basePrice / moq / leadTimeDays stay nullable. Null is the
//    supplier-does-not-publish-it signal that renders "Ask the supplier";
//    a NOT NULL default here would manufacture an estimate.

const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
const migrationsPath = path.resolve(__dirname, "../../prisma/migrations");
const schema = readFileSync(schemaPath, "utf8");

/** Extract a top-level `model X { ... }` or `enum X { ... }` block body. */
function block(kind: "model" | "enum", name: string): string {
  const match = schema.match(new RegExp(`${kind} ${name} \\{\\n([^}]*)\\}`));
  if (!match) throw new Error(`${kind} ${name} not found in schema`);
  return match[1];
}

/** Block lines, comments stripped, whitespace normalized to single spaces. */
function lines(blockBody: string): string[] {
  return blockBody
    .split("\n")
    .map((l) => l.split("//")[0].trim().replace(/\s+/g, " "))
    .filter((l) => l.length > 0);
}

function field(modelName: string, name: string): string {
  const line = lines(block("model", modelName)).find((l) => l.startsWith(`${name} `));
  if (!line) throw new Error(`field ${modelName}.${name} not found in schema`);
  return line;
}

describe("provenance contract", () => {
  it("requires sourceUrl and sourceCapturedAt on Product (NOT NULL)", () => {
    expect(field("Product", "sourceUrl")).toBe("sourceUrl String");
    expect(field("Product", "sourceCapturedAt")).toBe("sourceCapturedAt DateTime");
  });

  it("carries provenance on Review and Certification rows too", () => {
    for (const model of ["Review", "Certification"]) {
      expect(field(model, "sourceUrl")).toBe("sourceUrl String");
      expect(field(model, "sourceCapturedAt")).toBe("sourceCapturedAt DateTime");
    }
  });

  it("keeps unpublished commercial facts nullable — null means 'Ask the supplier'", () => {
    expect(field("Product", "basePrice")).toMatch(/^basePrice Decimal\?/);
    expect(field("Product", "moq")).toMatch(/^moq Int\?/);
    expect(field("Product", "leadTimeDays")).toMatch(/^leadTimeDays Int\?/);
  });

  it("never defaults a commercial fact", () => {
    for (const name of ["basePrice", "moq", "leadTimeDays"]) {
      expect(field("Product", name)).not.toContain("@default");
    }
  });

  it("gates the sample button on verified policy, defaulting to hidden", () => {
    expect(field("Product", "samplePolicyVerified")).toBe(
      "samplePolicyVerified Boolean @default(false)",
    );
  });

  it("lets quantity breaks inherit provenance — no separate source fields", () => {
    const quantityBreakLines = lines(block("model", "QuantityBreak")).join("\n");
    expect(quantityBreakLines).not.toContain("sourceUrl");
    expect(quantityBreakLines).not.toContain("sourceCapturedAt");
  });
});

describe("spec enums", () => {
  it("matches the spec's value sets exactly", () => {
    expect(lines(block("enum", "Role"))).toEqual(["BRAND", "SUPPLIER", "ADMIN"]);
    expect(lines(block("enum", "SupplierStatus"))).toEqual([
      "PENDING",
      "LISTED",
      "RECOMMENDED",
      "QUOTE_ONLY",
      "DISABLED",
    ]);
    expect(lines(block("enum", "PriceType"))).toEqual([
      "EXACT",
      "CALCULATOR",
      "FROM",
      "QUOTE_ONLY",
    ]);
    expect(lines(block("enum", "StockOrCustom"))).toEqual(["STOCK", "CUSTOM"]);
    expect(lines(block("enum", "QuoteStatus"))).toEqual(["DRAFT", "SENT", "RESPONDED", "CLOSED"]);
    expect(lines(block("enum", "QuoteItemStatus"))).toEqual([
      "SENT",
      "QUOTED",
      "DECLINED",
      "EXPIRED",
    ]);
  });
});

describe("model surface", () => {
  it("defines every model the spec requires", () => {
    const required = [
      "User",
      "BrandProfile",
      "Supplier",
      "Category",
      "Product",
      "QuantityBreak",
      "QuoteRequest",
      "QuoteRequestItem",
      "SampleRequest",
      "SavedList",
      "SavedListItem",
      "Review",
      "Certification",
      "Image",
      "PartnerSubscription",
      "FeaturedPlacement",
    ];
    for (const model of required) {
      expect(schema, model).toContain(`model ${model} {`);
    }
  });

  it("binds users to Supabase Auth and defaults to BRAND role", () => {
    expect(field("User", "role")).toBe("role Role @default(BRAND)");
    expect(field("User", "supabaseUserId")).toBe("supabaseUserId String @unique");
  });

  it("keys suppliers on a unique slug, unverified until an admin tiers them", () => {
    expect(field("Supplier", "slug")).toBe("slug String @unique");
    expect(field("Supplier", "status")).toBe("status SupplierStatus @default(PENDING)");
  });

  it("makes Category hierarchical via a self-relation", () => {
    const categoryBlock = block("model", "Category");
    expect(field("Category", "parentId")).toMatch(/^parentId String\?/);
    expect(categoryBlock).toContain('@relation("CategoryTree"');
  });

  it("enforces the seed importer's idempotency key: supplier + title", () => {
    const productBlock = block("model", "Product");
    expect(productBlock).toContain("@@unique([supplierId, title])");
  });

  it("fans one QuoteRequest out to per-product items", () => {
    expect(field("QuoteRequestItem", "quantity")).toMatch(/^quantity Int$/);
    expect(field("QuoteRequestItem", "status")).toBe("status QuoteItemStatus @default(SENT)");
  });
});

describe("filter indexes (Results-page facets)", () => {
  it("indexes the product filter columns", () => {
    const productBlock = block("model", "Product");
    for (const column of [
      "moq",
      "priceType",
      "stockOrCustom",
      "material",
      "leadTimeDays",
      "categoryId",
    ]) {
      expect(productBlock, column).toContain(`@@index([${column}])`);
    }
  });

  it("indexes supplier location for the location facet", () => {
    expect(block("model", "Supplier")).toContain("@@index([location])");
  });
});

describe("migrations", () => {
  it("ships every committed migration with its migration.sql", () => {
    const folders = readdirSync(migrationsPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(folders.length).toBeGreaterThan(0);
    for (const folder of folders) {
      expect(readdirSync(path.join(migrationsPath, folder)), folder).toContain("migration.sql");
    }
  });
});
