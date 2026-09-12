import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/web-auth";
import { RegisterSW } from "@/components/web/RegisterSW";
import "./webapp.css";

export const metadata: Metadata = {
  title: "SimpleDir App",
  description: "SimpleDir web app — manage Cloudflare R2 files",
  applicationName: "SimpleDir",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SimpleDir",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="webapp">
      <AuthProvider>
        <RegisterSW />
        {children}
      </AuthProvider>
    </div>
  );
}
