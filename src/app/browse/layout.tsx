import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Scam Reports",
  description: "Browse all reported scams in Kenya. Filter by scam type, sort by recent or highest amount lost.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse Scam Reports - ScamBusterKE",
    description: "Browse all reported scams in Kenya. Filter by scam type, sort by recent or highest amount lost.",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
