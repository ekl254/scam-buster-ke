"use client";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: February 2026</p>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <p className="text-gray-600 leading-relaxed">
            ScamBusterKE is designed with privacy at its core. We allow anonymous scam reporting
            and take measures to protect the identity of reporters. This policy explains what
            data we collect, how we use it, and your rights.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data We Collect</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Scam Reports</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                When you submit a report, we store the scam identifier (phone number, paybill, etc.),
                scam type, your description, any evidence URLs, and the amount lost. Reporter phone
                numbers (if provided for verification) are stored as one-way SHA-256 hashes with a
                salt — we cannot reverse these to recover your actual number.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">IP Addresses</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We collect a hashed version of your IP address solely for anti-fraud detection
                (identifying coordinated false reports). The raw IP address is never stored.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Search Queries</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                When you search for an identifier, we log the search query for analytics purposes
                (e.g., tracking which numbers are most frequently looked up). These logs are not
                linked to your identity.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What We Do Not Collect</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>We do not use tracking cookies or third-party analytics</li>
            <li>We do not require account creation or login</li>
            <li>We do not sell, share, or trade any user data with third parties</li>
            <li>We do not store raw IP addresses or device fingerprints</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Storage</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            All data is stored securely on Supabase (PostgreSQL) with Row Level Security (RLS)
            enabled on all tables. Data is hosted on servers with industry-standard encryption
            at rest and in transit. We retain report data indefinitely to maintain the scam
            database, except for Tier 1 (unverified) reports which expire after 90 days.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
          <p className="text-gray-600 leading-relaxed text-sm mb-3">
            Under Kenya&apos;s Data Protection Act, 2019, you have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
            <li>Know what data we hold about you</li>
            <li>Request deletion of your data</li>
            <li>Dispute a report made against your phone number or business</li>
            <li>Object to the processing of your personal data</li>
          </ul>
          <p className="text-gray-600 leading-relaxed text-sm mt-3">
            Since reports are anonymous and reporter data is hashed, we may not be able to
            identify specific reports tied to you. If you believe you have been falsely reported,
            please use our dispute process.
          </p>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            For privacy-related inquiries, please reach out to us through our platform.
            We are committed to responding to all data protection requests within 30 days
            as required by the Kenya Data Protection Act.
          </p>
        </section>
      </div>
    </main>
  );
}
