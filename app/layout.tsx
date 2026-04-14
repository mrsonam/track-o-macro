import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegistration } from "./components/PwaRegistration";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackOMacro",
  description:
    "Describe meals in plain language — calories from USDA-backed nutrition data.",
  icons: {
    icon: "/icon-192x192.svg",
    apple: "/icon-192x192.svg",
  },
  appleWebApp: {
    capable: true,
    title: "TrackOMacro",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="apple-mobile-web-app-title" content="TrackOMacro" />
      </head>
      <body className="flex min-h-full min-h-dvh flex-col font-sans">
        <Providers>
          <PwaRegistration />
          <Suspense fallback={<div className="min-h-dvh w-full" aria-hidden />}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
