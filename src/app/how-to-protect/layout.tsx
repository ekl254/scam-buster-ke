import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Protect Yourself from Scams",
  description: "Practical tips to protect yourself from scams in Kenya. M-Pesa safety, verifying businesses, what to do if scammed, and how to report to authorities.",
  alternates: { canonical: "/how-to-protect" },
  openGraph: {
    title: "How to Protect Yourself from Scams - ScamBusterKE",
    description: "Practical tips to protect yourself from scams in Kenya. M-Pesa safety and reporting guidance.",
  },
};

export default function HowToProtectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
