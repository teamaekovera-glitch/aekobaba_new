// Header category menu — static navigation, not live data.
//
// The site header renders on every page, including prerendered auth pages, so
// it must not query the database (a DB query here broke CI builds with no
// Postgres, and stale counts in a nav menu would be dishonest anyway). The
// full category grid on Home keeps live counts via getCategories().
//
// Kept in lockstep with data/aekobaba-seed.json by menu.test.ts — a taxonomy
// rename fails the test instead of silently desyncing the menu.

export interface CategoryMenuEntry {
  slug: string;
  name: string;
}

export const CATEGORY_MENU: CategoryMenuEntry[] = [
  { slug: "pouches-bags", name: "Flexible Pouches & Bags" },
  { slug: "plastic-bottles", name: "Plastic Bottles" },
  { slug: "plastic-jars", name: "Plastic Jars & Canisters" },
  { slug: "tubs-pails", name: "Tubs, Cups & Pails" },
  { slug: "folding-cartons", name: "Folding Cartons" },
  { slug: "labels", name: "Labels" },
  { slug: "closures", name: "Closures" },
  { slug: "pumps-sprayers", name: "Pumps, Sprayers & Airless Dispensers" },
  { slug: "corrugated", name: "Corrugated Shippers & Secondary Packaging" },
  { slug: "glass-bottles", name: "Glass Bottles" },
  { slug: "glass-jars", name: "Glass Jars" },
  { slug: "collapsible-tubes", name: "Collapsible Tubes" },
  { slug: "metal-cans", name: "Metal Cans — Beverage & Food" },
  { slug: "metal-tins", name: "Metal Tins" },
  { slug: "sachets-stick-packs", name: "Sachets & Stick Packs" },
  { slug: "rollstock", name: "Flexible Film Rollstock & Flow Wrap" },
  { slug: "shrink-sleeves", name: "Shrink Sleeves" },
  { slug: "thermoforms", name: "Blister Packs, Clamshells & Thermoform Trays" },
  { slug: "setup-boxes", name: "Rigid Setup Boxes" },
  { slug: "droppers-vials", name: "Dropper Assemblies, Vials & Roll-Ons" },
  { slug: "aerosols", name: "Aerosol Cans" },
  { slug: "mailers", name: "Mailers & E-Commerce Shipping" },
  { slug: "cr-cannabis", name: "Child-Resistant & Cannabis Specialty Packaging" },
  { slug: "compostables", name: "Compostables & Sustainable Structures" },
  { slug: "brand-accessories", name: "Branding Accessories: Hang Tags, Stickers, Tissue & Tape" },
];
