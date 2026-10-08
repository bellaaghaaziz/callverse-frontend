import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import { INTRO_GUARD_SCRIPT } from "@/lib/intro";

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
  description: "Digital Twin d'un centre de relation client bancaire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The intro guard may set data-intro on <html> before React hydrates.
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Compile-time constant (src/lib/intro.ts), no runtime data: not an injection surface. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_GUARD_SCRIPT }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${manrope.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}