import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Common Scam Types in Kenya",
  description: "Learn about common scam types in Kenya including M-Pesa fraud, land scams, fake jobs, investment ponzi schemes, and more. Know the warning signs.",
  alternates: { canonical: "/scam-types" },
  openGraph: {
    title: "Common Scam Types in Kenya - ScamBusterKE",
    description: "Learn about common scam types in Kenya including M-Pesa fraud, land scams, fake jobs, and more.",
  },
};

export default function ScamTypesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
