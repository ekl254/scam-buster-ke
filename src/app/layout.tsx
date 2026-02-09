import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://scambuster.co.ke"),
  title: {
    default: "ScamBusterKE - Protect Yourself from Scams in Kenya",
    template: "%s | ScamBusterKE",
  },
  description:
    "Check phone numbers, Paybills, and companies before you transact. Report scams to protect fellow Kenyans.",
  keywords: ["scam", "fraud", "Kenya", "M-Pesa", "Paybill", "protection", "verify", "scam checker", "fake paybill", "scam report Kenya"],
  authors: [{ name: "ScamBusterKE" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ScamBusterKE - Protect Yourself from Scams in Kenya",
    description: "Check before you pay. Report when you're played.",
    url: "https://scambuster.co.ke",
    siteName: "ScamBusterKE",
    type: "website",
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScamBusterKE - Protect Yourself from Scams in Kenya",
    description: "Check before you pay. Report when you're played.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
