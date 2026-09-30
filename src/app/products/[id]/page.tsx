import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailView } from "@/components/catalog/product-detail-view";
import { getProduct } from "@/lib/catalog/queries";

// Product page: thin data wrapper. The layout and rendering live in
// src/components/catalog/product-detail-view.tsx (presentational,
// test-covered); this file owns the query, metadata, and the 404.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product ? product.title : "Product" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return <ProductDetailView product={product} />;
}
