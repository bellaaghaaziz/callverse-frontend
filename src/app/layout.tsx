import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import BrandIntro from "@/components/BrandIntro";
import { INTRO_SCRIPT } from "@/lib/motion";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CallVerse",
  description:
    "Conversations, collaboration et supervision pour la relation client bancaire",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The inline script adds classes to <html> before React hydrates: expected, not a mismatch.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${manrope.variable} antialiased`}
      >
        <BrandIntro />
        {children}
      </body>
    </html>
  );
}
