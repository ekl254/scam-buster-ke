"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">About ScamBusterKE</h1>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            ScamBusterKE is a community-driven platform dedicated to protecting Kenyans from fraud.
            We provide a free, anonymous way for anyone to report scam phone numbers, M-Pesa paybills,
            till numbers, websites, and companies — and to check identifiers before transacting.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Scams cost Kenyans billions of shillings every year. From fake M-Pesa messages to
            elaborate land fraud and job scams, the tactics keep evolving. ScamBusterKE empowers
            the community to fight back by sharing information and warning others.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">1</span>
              <div>
                <h3 className="font-medium text-gray-900">Search Before You Transact</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Enter a phone number, paybill, till number, website, or company name to see if
                  it has been reported as a scam by other users.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">2</span>
              <div>
                <h3 className="font-medium text-gray-900">Report a Scam</h3>
                <p className="text-gray-600 text-sm mt-1">
                  If you&apos;ve been scammed or encountered a suspicious number, submit a report with
                  details. Your identity stays anonymous — we hash all personal information.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">3</span>
              <div>
                <h3 className="font-medium text-gray-900">Community Verification</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Reports are scored and verified through our three-tier system. Multiple independent
                  reports increase the verification level and concern rating.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification System</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We use a three-tier verification system to assess the credibility of reports:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-yellow-600 font-semibold text-sm whitespace-nowrap">Tier 1</span>
              <p className="text-gray-600 text-sm">
                <strong>Unverified</strong> — A single report with basic information. Expires after
                90 days unless corroborated. Treated as an unconfirmed alert.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-orange-600 font-semibold text-sm whitespace-nowrap">Tier 2</span>
              <p className="text-gray-600 text-sm">
                <strong>Corroborated</strong> — Multiple independent reports or strong evidence
                (screenshots, transaction IDs). Higher confidence level.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-red-600 font-semibold text-sm whitespace-nowrap">Tier 3</span>
              <p className="text-gray-600 text-sm">
                <strong>Verified</strong> — Thoroughly verified through multiple corroborated
                reports and verified reporter identities. Highest confidence.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anti-Fraud Protections</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We take the integrity of reports seriously. Our automated systems detect coordinated
            false reporting through IP analysis, timing patterns, and text similarity. Reports
            flagged as potentially coordinated are weighted lower in our assessments.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Anyone who believes they have been falsely reported can{" "}
            <Link href="/dispute" className="text-green-600 hover:text-green-700 underline">
              submit a dispute
            </Link>{" "}
            for review.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Get Involved</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            ScamBusterKE is only as strong as its community. You can help by:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>Reporting scams you encounter — even if you didn&apos;t lose money</li>
            <li>Checking identifiers before making transactions</li>
            <li>Sharing the platform with friends and family</li>
            <li>Upvoting reports you can confirm from personal experience</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/report"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Report a Scam
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Search an Identifier
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
