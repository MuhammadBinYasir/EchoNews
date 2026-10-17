import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: {
    default: "Echo — Your Daily, Reimagined",
    template: "%s | Echo",
  },
  applicationName: "Echo",
  description:
    "A thoughtful daily newspaper shaped around your interests. Read concise AI-assisted summaries, follow original reporting, and discover perspectives beyond your usual headlines.",
  keywords: [
    "personalized news",
    "daily news briefing",
    "AI news summaries",
    "news discovery",
    "Echo newspaper",
  ],
  category: "news",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/apple-icon",
  },
  openGraph: {
    type: "website",
    siteName: "Echo",
    title: "Echo — Your Daily, Reimagined",
    description:
      "A thoughtful daily newspaper shaped around your interests, with concise summaries and room for discovery.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Echo — the world, edited for you",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo — Your Daily, Reimagined",
    description:
      "A thoughtful daily newspaper shaped around your interests, with concise summaries and room for discovery.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f6f1e8] text-[#1a1917]">{children}</body>
    </html>
  );
}
