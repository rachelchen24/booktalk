import type { Metadata } from "next";
import { Geist, Literata } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

const description =
  "Pick a book back up in 30 seconds. Tell BookTalk where you are (page, chapter, audiobook time) and get a spoiler-free recap of what's happened so far.";

export const metadata: Metadata = {
  // Used to build absolute URLs for link previews.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  // Each page sets its own title; this adds " · BookTalk" after it, e.g. "Log in · BookTalk".
  title: { default: "BookTalk", template: "%s · BookTalk" },
  description,
  // What shows when the link is shared (LinkedIn, Slack, iMessage…).
  openGraph: {
    title: "BookTalk: spoiler-free recaps of what you've read so far",
    description,
    siteName: "BookTalk",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
