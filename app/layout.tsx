import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-script";
import { APP_DESCRIPTION, APP_NAME, resolveAppUrl } from "@/lib/branding";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(resolveAppUrl()),
  title: {
    default: `${APP_NAME} — League Management`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-color-mode="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeScript />
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
