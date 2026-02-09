import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dispute a Report",
  description: "Dispute a false scam report on ScamBusterKE. Submit evidence to clear your name or business.",
  alternates: { canonical: "/dispute" },
  openGraph: {
    title: "Dispute a Report - ScamBusterKE",
    description: "Dispute a false scam report on ScamBusterKE. Submit evidence to clear your name or business.",
  },
};

export default function DisputeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
