import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Results",
  description: "Search for phone numbers, paybills, companies, and other identifiers to check if they've been reported as scams in Kenya.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
