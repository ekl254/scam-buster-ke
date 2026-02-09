import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - ScamBusterKE",
  description: "ScamBusterKE terms of service. Understand the rules for using our platform, content policies, and disclaimers.",
  openGraph: {
    title: "Terms of Service - ScamBusterKE",
    description: "ScamBusterKE terms of service. Understand the rules for using our platform.",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
