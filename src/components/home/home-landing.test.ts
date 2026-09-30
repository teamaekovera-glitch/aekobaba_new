import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeLanding } from "./home-landing";
import { POPULAR_CATEGORY_SLUGS } from "@/lib/catalog/popular";
import { makeProduct } from "@/lib/catalog/test-fixtures";
import type { CategoryVM } from "@/lib/catalog/view-models";

// Rendered-DOM verification for the redesigned home: featured rail renders
// product cards, popular tiles render image + name and keep their test ids,
// and the PR #9 material-only rule holds (no use-case entries in navigation).

const render = (node: React.ReactElement): string => renderToStaticMarkup(node);

function makeCategory(slug: string, name: string, productCount = 3): CategoryVM {
  return { slug, name, description: null, productCount };
}

// The five popular slugs plus a couple of non-popular material categories and
// a use-case-looking row that must never surface as a navigation entry.
const categories: CategoryVM[] = [
  makeCategory("mailers", "Mailers", 16),
  makeCategory("pouches-bags", "Pouches & Bags", 13),
  makeCategory("corrugated", "Corrugated Boxes", 9),
  makeCategory("glass-bottles", "Glass Bottles", 8),
  makeCategory("labels", "Labels", 5),
  makeCategory("glass-jars", "Glass Jars", 4),
  makeCategory("coffee-gift-sets", "Coffee Gift Sets", 2),
];

const featured = [
  makeProduct({ categorySlug: "mailers", categoryName: "Mailers" }),
  makeProduct({ categorySlug: "glass-bottles", categoryName: "Glass Bottles" }),
];

describe("HomeLanding — hero", () => {
  it("keeps the hero question, the search form, and the lineup photograph", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html).toContain("What are you packaging?");
    expect(html).toContain('role="search"');
    expect(html).toContain("hero-lineup.png");
  });
});

describe("HomeLanding — featured rail", () => {
  it("renders the featured products as product cards", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html).toContain('data-testid="featured-rail"');
    expect(html.match(/data-testid="product-card"/g)).toHaveLength(featured.length);
    expect(html).toContain(featured[0].title);
  });

  it("renders the rail between the popular tiles and the category grid", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    const popularAt = html.indexOf('data-testid="popular-entry"');
    const railAt = html.indexOf('data-testid="featured-rail-section"');
    const gridAt = html.indexOf('data-testid="category-grid"');

    expect(popularAt).toBeGreaterThan(-1);
    expect(railAt).toBeGreaterThan(popularAt);
    expect(gridAt).toBeGreaterThan(railAt);
  });

  it("renders no rail section when there are no featured products", () => {
    const html = render(createElement(HomeLanding, { categories, featured: [] }));

    expect(html).not.toContain('data-testid="featured-rail"');
  });
});

describe("HomeLanding — popular packaging tiles", () => {
  it("keeps the popular-entry test ids and pre-filtered result links", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html.match(/data-testid="popular-entry"/g)).toHaveLength(POPULAR_CATEGORY_SLUGS.length);
    expect(html).toContain('data-entry="mailers"');
    expect(html).toContain('href="/results?category=mailers"');
  });

  it("renders each tile with a representative packshot and the category name", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html).toContain("Mailers — representative packaging image");
    expect(html).toContain("mailer-bag.png");
    expect(html).toContain(">Mailers</span>");
  });
});

describe("HomeLanding — category grid", () => {
  it("renders every category row with a thumbnail", () => {
    const html = render(createElement(HomeLanding, { categories, featured })).replace(/<!-- -->/g, "");

    expect(html).toContain('data-testid="category-grid"');
    expect(html).toContain("glass-jar.png");
    expect(html).toContain("4 products");
  });
});

describe("HomeLanding — material-only navigation (PR #9 guard)", () => {
  it("never surfaces use-case rows as popular entries", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    // The use-case-looking category stays out of the popular navigation row;
    // every popular entry is a curated material slug.
    const entries = [...html.matchAll(/data-entry="([^"]+)"/g)].map((match) => match[1]);
    for (const entry of entries) {
      expect(POPULAR_CATEGORY_SLUGS).toContain(entry);
    }
    expect(entries).not.toContain("coffee-gift-sets");
  });
});
