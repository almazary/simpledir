import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpleDir — Desktop file manager for Cloudflare R2",
  description:
    "Kelola file Cloudflare R2 dari aplikasi desktop Mac & Windows. Multi-credential, drag & drop upload, search, dan credential terenkripsi.",
  metadataBase: new URL("https://simpledir.my.id"),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "SimpleDir",
    description:
      "Desktop file manager for Cloudflare R2 — Mac & Windows.",
    url: "https://simpledir.my.id",
    siteName: "SimpleDir",
    type: "website",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "SimpleDir" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
