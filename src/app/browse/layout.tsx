import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Scam Reports - ScamBusterKE",
  description: "Browse all reported scams in Kenya. Filter by scam type, sort by recent, most upvoted, or highest amount lost.",
  openGraph: {
    title: "Browse Scam Reports - ScamBusterKE",
    description: "Browse all reported scams in Kenya. Filter by scam type, sort by recent, most upvoted, or highest amount lost.",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
