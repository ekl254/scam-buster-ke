import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ScamBusterKE privacy policy. Learn how we handle your data, protect reporter anonymity, and what information we collect.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy - ScamBusterKE",
    description: "ScamBusterKE privacy policy. Learn how we handle your data and protect reporter anonymity.",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
