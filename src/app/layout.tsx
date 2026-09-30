import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aekobaba — Packaging Marketplace",
    template: "%s · Aekobaba",
  },
  description:
    "Find real, source-verified packaging suppliers and send one quote request to all of them.",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Aekobaba",
    title: "Aekobaba — Packaging Marketplace",
    description:
      "Find real, source-verified packaging suppliers and send one quote request to all of them.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Aekobaba — source-verified packaging marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aekobaba — Packaging Marketplace",
    description:
      "Find real, source-verified packaging suppliers and send one quote request to all of them.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
