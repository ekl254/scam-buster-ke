import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a Scam",
  description: "Report a scam to protect fellow Kenyans. Submit details about fraudulent phone numbers, Paybills, companies, and more.",
  alternates: { canonical: "/report" },
  openGraph: {
    title: "Report a Scam - ScamBusterKE",
    description: "Report a scam to protect fellow Kenyans. Submit details about fraudulent phone numbers, Paybills, companies, and more.",
  },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
