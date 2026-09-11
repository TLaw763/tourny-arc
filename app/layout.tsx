import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tourny Arc — League Management",
  description: "Standalone league and tournament management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeScript />
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
