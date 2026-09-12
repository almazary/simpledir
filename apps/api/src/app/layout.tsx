import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpleDir — Desktop file manager for Cloudflare R2",
  description:
    "Kelola file Cloudflare R2 dari aplikasi desktop Mac & Windows. Multi-credential, drag & drop upload, search, dan credential terenkripsi.",
  metadataBase: new URL("https://simpledir.my.id"),
  openGraph: {
    title: "SimpleDir",
    description:
      "Desktop file manager for Cloudflare R2 — Mac & Windows.",
    url: "https://simpledir.my.id",
    siteName: "SimpleDir",
    type: "website",
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
