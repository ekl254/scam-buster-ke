import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - ScamBusterKE",
  description: "Learn about ScamBusterKE, Kenya's community-driven platform for reporting and verifying scams. Our mission, how the platform works, and the verification system.",
  openGraph: {
    title: "About - ScamBusterKE",
    description: "Learn about ScamBusterKE, Kenya's community-driven platform for reporting and verifying scams.",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
