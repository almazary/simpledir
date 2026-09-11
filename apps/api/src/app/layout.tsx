import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpleDir API",
  description: "Auth and R2 credential API for SimpleDir",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
