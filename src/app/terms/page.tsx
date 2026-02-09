"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: February 2026</p>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            By accessing and using ScamBusterKE, you agree to be bound by these Terms of Service.
            If you do not agree with any part of these terms, you should not use the platform.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nature of Content</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-3">
            ScamBusterKE is a community-driven platform. All scam reports are submitted by users
            and reflect their individual experiences and opinions. Important disclaimers:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>Reports are <strong>not independently verified</strong> by ScamBusterKE unless marked as Tier 3 (Verified)</li>
            <li>The presence of a report does not constitute proof of fraud</li>
            <li>The absence of reports does not guarantee that an identifier is safe</li>
            <li>ScamBusterKE does not provide legal, financial, or professional advice</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptable Use</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-3">
            You agree to use ScamBusterKE responsibly and lawfully. You must not:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>Submit false or malicious reports to defame individuals or businesses</li>
            <li>Attempt to manipulate the verification system through coordinated reporting</li>
            <li>Use the platform to harass, threaten, or intimidate others</li>
            <li>Scrape, crawl, or harvest data from the platform for commercial purposes</li>
            <li>Attempt to bypass rate limits or security measures</li>
            <li>Submit reports containing personal identifying information beyond the scam identifier</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Removal &amp; Disputes</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-3">
            If you believe a report about you or your business is false, you have the right to
            dispute it. Our dispute process allows you to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>Submit a dispute with evidence that the report is inaccurate</li>
            <li>Request review by our administrators</li>
            <li>Have false reports removed or flagged after verification</li>
          </ul>
          <p className="text-gray-600 leading-relaxed text-sm mt-3">
            Visit our{" "}
            <Link href="/dispute" className="text-green-600 hover:text-green-700 underline">
              dispute page
            </Link>{" "}
            to submit a dispute.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-3">
            ScamBusterKE is provided &quot;as is&quot; without warranties of any kind. To the fullest
            extent permitted by Kenyan law:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>We are not liable for any losses resulting from reliance on information on the platform</li>
            <li>We are not liable for user-submitted content or its accuracy</li>
            <li>We are not responsible for any transactions you enter into based on search results</li>
            <li>We do not guarantee uninterrupted or error-free access to the platform</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            By submitting a report, you grant ScamBusterKE a non-exclusive, royalty-free,
            perpetual license to display, distribute, and use the content of your report on
            the platform. You retain any rights you have in the evidence and descriptions
            you submit.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Governing Law</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            These terms are governed by the laws of the Republic of Kenya. Any disputes arising
            from the use of this platform shall be subject to the jurisdiction of the courts
            of Kenya.
          </p>
        </section>
      </div>
    </main>
  );
}
