-- Dev-only fixtures for the AEKOBABA_DEV_AUTH browser harness (dev-auth.ts).
-- NEVER run against a shared or production database: these rows are
-- deliberately unrealistic (deterministic IDs, .test emails).
--
-- Idempotent: every INSERT targets an explicit ID/unique key with
-- ON CONFLICT DO NOTHING, so re-running is a no-op.
--
-- Local run (embedded Postgres used for QA):
--   DATABASE_URL=... node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query(require('fs').readFileSync('scripts/dev-fixtures.sql','utf8'))).then(()=>c.end())"

-- Fixture identities (session maps the dev cookie to these supabaseUserId values).
INSERT INTO "User" (id, email, role, "supabaseUserId", "updatedAt") VALUES
  ('dev-admin-user',    'admin@dev.aekobaba.test',    'ADMIN',    'dev-admin-user', now()),
  ('dev-supplier-user', 'supplier@dev.aekobaba.test', 'SUPPLIER', 'dev-supplier-user', now()),
  ('dev-brand-user',    'brand@dev.aekobaba.test',    'BRAND',    'dev-brand-user', now())
ON CONFLICT (id) DO NOTHING;

-- The claiming supplier: owned by the dev SUPPLIER user, LISTED tier badge.
INSERT INTO "Supplier" (id, slug, name, website, location, "legalIdentity", "reviewScore", "reviewCount", status, "responseTimeHours", "updatedAt")
VALUES ('dev-supplier-active', 'dev-active-supplies', 'Dev Active Supplies', 'https://dev-active.example.com', 'US',
        'Dev Active Supplies LLC', 4.6, 87, 'LISTED', 12, now())
ON CONFLICT (id) DO NOTHING;

-- Queue supplier: PENDING with gate evidence for the admin verification page.
INSERT INTO "Supplier" (id, slug, name, website, location, "legalIdentity", "reviewScore", "reviewCount", status, "updatedAt")
VALUES ('dev-supplier-queue', 'dev-queue-supplies', 'Dev Queue Supplies', 'https://dev-queue.example.com', 'IN',
        'Dev Queue Supplies Pvt Ltd', 4.1, 23, 'PENDING', now())
ON CONFLICT (id) DO NOTHING;

-- Unclaimed listing for the claim flow walk-through.
INSERT INTO "Supplier" (id, slug, name, website, location, status, "updatedAt")
VALUES ('dev-supplier-unclaimed', 'dev-unclaimed-supplies', 'Dev Unclaimed Supplies', 'https://dev-unclaimed.example.com', 'DE', 'LISTED', now())
ON CONFLICT (id) DO NOTHING;

-- Products: two for the claiming supplier, one priced for the queue supplier.
INSERT INTO "Product" (id, "supplierId", title, material, "categoryId", "priceType", "basePrice", "priceBasis", moq, "moqUnit", "leadTimeDays", "stockOrCustom", "samplePolicyVerified", "sourceUrl", "sourceCapturedAt", "updatedAt")
VALUES
  ('dev-product-pouch',  'dev-supplier-active', 'Dev 8 oz Stand-Up Pouch', 'Plastic (PET/PE)', (SELECT id FROM "Category" WHERE slug = 'pouches-bags' LIMIT 1),
   'EXACT', 0.34, 'per pouch', 1000, 'pouches', 14, 'STOCK', true,
   'https://dev-active.example.com/products/stand-up-pouch', '2026-09-18 00:00:00+00', now()),
  ('dev-product-jar',    'dev-supplier-active', 'Dev 4 oz Glass Jar', 'Glass', (SELECT id FROM "Category" WHERE slug = 'glass-jars' LIMIT 1),
   'FROM', 0.92, 'per jar', 500, 'jars', NULL, 'STOCK', false,
   'https://dev-active.example.com/products/glass-jar', '2026-09-18 00:00:00+00', now()),
  ('dev-product-bottle', 'dev-supplier-queue',  'Dev 16 oz PET Bottle', 'Plastic (PET)', (SELECT id FROM "Category" WHERE slug = 'plastic-bottles' LIMIT 1),
   'EXACT', 0.51, 'per bottle', 2500, 'bottles', 21, 'STOCK', false,
   'https://dev-queue.example.com/products/pet-bottle', '2026-09-18 00:00:00+00', now())
ON CONFLICT (id) DO NOTHING;

-- One SENT quote request from the dev brand with two items at the active
-- supplier: first above MOQ, second below it (the inbox shows both honestly).
INSERT INTO "QuoteRequest" (id, "brandUserId", status, deadline, "artworkNotes", "updatedAt")
VALUES ('dev-quote-1', 'dev-brand-user', 'SENT', now() + interval '14 days',
        'Matte finish, single-color logo on the front panel.', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "QuoteRequestItem" (id, "quoteRequestId", "productId", quantity, status, "updatedAt") VALUES
  ('dev-quote-item-1', 'dev-quote-1', 'dev-product-pouch', 5000, 'SENT', now()),
  ('dev-quote-item-2', 'dev-quote-1', 'dev-product-jar',   120,  'SENT', now())
ON CONFLICT (id) DO NOTHING;

-- Ownership is an UPDATE (not an INSERT) so re-runs keep it true even after a
-- browser walk clears or claims rows: the dev SUPPLIER user owns the active
-- listing; the queue and unclaimed listings stay claimable through the UI.
UPDATE "Supplier" SET "ownerUserId" = 'dev-supplier-user', "updatedAt" = now()
  WHERE id = 'dev-supplier-active';
UPDATE "Supplier" SET "ownerUserId" = NULL WHERE id = 'dev-supplier-queue';
UPDATE "Supplier" SET "ownerUserId" = NULL, status = 'LISTED' WHERE id = 'dev-supplier-unclaimed';
UPDATE "User" SET role = 'BRAND', "updatedAt" = now() WHERE id = 'dev-brand-user';
