-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BRAND', 'SUPPLIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PENDING', 'LISTED', 'RECOMMENDED', 'QUOTE_ONLY', 'DISABLED');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('EXACT', 'CALCULATOR', 'FROM', 'QUOTE_ONLY');

-- CreateEnum
CREATE TYPE "StockOrCustom" AS ENUM ('STOCK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteItemStatus" AS ENUM ('SENT', 'QUOTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SampleRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'SHIPPED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BRAND',
    "supabaseUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "region" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "legalIdentity" TEXT,
    "reviewScore" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "status" "SupplierStatus" NOT NULL DEFAULT 'PENDING',
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "responseTimeHours" INTEGER,
    "logoUrl" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "material" TEXT NOT NULL,
    "subcategory" TEXT,
    "priceType" "PriceType" NOT NULL,
    "basePrice" DECIMAL(12,4),
    "priceBasis" TEXT,
    "priceUnit" DECIMAL(12,4),
    "moq" INTEGER,
    "moqUnit" TEXT,
    "leadTimeDays" INTEGER,
    "stockOrCustom" "StockOrCustom" NOT NULL,
    "samplePolicyVerified" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT NOT NULL,
    "sourceCapturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantityBreak" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unitPrice" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "QuantityBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceCapturedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceCapturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "brandUserId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "deadline" TIMESTAMP(3),
    "artworkNotes" TEXT,
    "artworkFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequestItem" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "QuoteItemStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleRequest" (
    "id" TEXT NOT NULL,
    "brandUserId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER,
    "notes" TEXT,
    "status" "SampleRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedList" (
    "id" TEXT NOT NULL,
    "brandUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Shortlist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedListItem" (
    "id" TEXT NOT NULL,
    "savedListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSubscription" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "plan" TEXT,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedPlacement" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "placement" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_ownerUserId_key" ON "Supplier"("ownerUserId");

-- CreateIndex
CREATE INDEX "Supplier_location_idx" ON "Supplier"("location");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_reviewScore_idx" ON "Supplier"("reviewScore");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_priceType_idx" ON "Product"("priceType");

-- CreateIndex
CREATE INDEX "Product_stockOrCustom_idx" ON "Product"("stockOrCustom");

-- CreateIndex
CREATE INDEX "Product_material_idx" ON "Product"("material");

-- CreateIndex
CREATE INDEX "Product_moq_idx" ON "Product"("moq");

-- CreateIndex
CREATE INDEX "Product_leadTimeDays_idx" ON "Product"("leadTimeDays");

-- CreateIndex
CREATE UNIQUE INDEX "Product_supplierId_title_key" ON "Product"("supplierId", "title");

-- CreateIndex
CREATE INDEX "QuantityBreak_productId_idx" ON "QuantityBreak"("productId");

-- CreateIndex
CREATE INDEX "Image_productId_idx" ON "Image"("productId");

-- CreateIndex
CREATE INDEX "Review_supplierId_idx" ON "Review"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_supplierId_name_key" ON "Certification"("supplierId", "name");

-- CreateIndex
CREATE INDEX "QuoteRequest_brandUserId_idx" ON "QuoteRequest"("brandUserId");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_idx" ON "QuoteRequest"("status");

-- CreateIndex
CREATE INDEX "QuoteRequestItem_quoteRequestId_idx" ON "QuoteRequestItem"("quoteRequestId");

-- CreateIndex
CREATE INDEX "QuoteRequestItem_productId_idx" ON "QuoteRequestItem"("productId");

-- CreateIndex
CREATE INDEX "QuoteRequestItem_status_idx" ON "QuoteRequestItem"("status");

-- CreateIndex
CREATE INDEX "SampleRequest_brandUserId_idx" ON "SampleRequest"("brandUserId");

-- CreateIndex
CREATE INDEX "SampleRequest_productId_idx" ON "SampleRequest"("productId");

-- CreateIndex
CREATE INDEX "SampleRequest_status_idx" ON "SampleRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SavedList_brandUserId_name_key" ON "SavedList"("brandUserId", "name");

-- CreateIndex
CREATE INDEX "SavedListItem_productId_idx" ON "SavedListItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedListItem_savedListId_productId_key" ON "SavedListItem"("savedListId", "productId");

-- CreateIndex
CREATE INDEX "PartnerSubscription_supplierId_idx" ON "PartnerSubscription"("supplierId");

-- CreateIndex
CREATE INDEX "FeaturedPlacement_supplierId_idx" ON "FeaturedPlacement"("supplierId");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuantityBreak" ADD CONSTRAINT "QuantityBreak_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_brandUserId_fkey" FOREIGN KEY ("brandUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestItem" ADD CONSTRAINT "QuoteRequestItem_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestItem" ADD CONSTRAINT "QuoteRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_brandUserId_fkey" FOREIGN KEY ("brandUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedList" ADD CONSTRAINT "SavedList_brandUserId_fkey" FOREIGN KEY ("brandUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListItem" ADD CONSTRAINT "SavedListItem_savedListId_fkey" FOREIGN KEY ("savedListId") REFERENCES "SavedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListItem" ADD CONSTRAINT "SavedListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSubscription" ADD CONSTRAINT "PartnerSubscription_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedPlacement" ADD CONSTRAINT "FeaturedPlacement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
