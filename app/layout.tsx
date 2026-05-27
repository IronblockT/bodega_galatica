import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bodega Galáctica",
  description: "Loja virtual de Star Wars: Unlimited",
  // ✅ opcional (bom pra OG/links absolutos). Se não tiver APP_URL, pode remover.
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Providers>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>

          {/* ✅ espaço do header sem precisar de div “solta” */}
          <div className="pt-20 md:pt-36">{children}</div>
        </Providers>

        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}