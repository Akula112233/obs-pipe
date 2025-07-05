import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "../lib/utils";
import AnnouncementBanner from "../components/AnnouncementBanner";
import { AppStateProvider } from "../contexts/AppStateContext";
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { SideNavigation } from "@/components/SideNavigation";
import { PostHogProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  preload: true,
  adjustFontFallback: true
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  fallback: ['monospace'],
  preload: true,
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: "Pipeline Dashboard",
  description: "Monitor and manage your data pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        geistSans.variable,
        geistMono.variable,
        "min-h-screen bg-background antialiased"
      )} suppressHydrationWarning>
        <PostHogProvider>
          <OrganizationProvider>
            <AppStateProvider>
              <AnnouncementBanner />
              <div className="flex h-screen">
                <SideNavigation />
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
            </AppStateProvider>
          </OrganizationProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}