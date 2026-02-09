"use client";

import Link from "next/link";

export default function HowToProtectPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">How to Protect Yourself from Scams</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Practical tips to keep your money and personal information safe. Being informed
          is the best protection against fraud.
        </p>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Before You Send Money</h2>
          <ul className="space-y-3">
            <li className="flex gap-3 text-gray-600 text-sm">
              <span className="text-green-600 font-bold flex-shrink-0">1.</span>
              <div>
                <strong className="text-gray-900">Verify the recipient.</strong>{" "}
                Search the phone number, paybill, or till number on{" "}
                <Link href="/" className="text-green-600 hover:text-green-700 underline">ScamBusterKE</Link>{" "}
                before transacting. Check if anyone has reported it.
              </div>
            </li>
            <li className="flex gap-3 text-gray-600 text-sm">
              <span className="text-green-600 font-bold flex-shrink-0">2.</span>
              <div>
                <strong className="text-gray-900">Confirm the name on M-Pesa.</strong>{" "}
                Before completing a transaction, M-Pesa shows the recipient&apos;s registered name.
                Make sure it matches who you expect to pay.
              </div>
            </li>
            <li className="flex gap-3 text-gray-600 text-sm">
              <span className="text-green-600 font-bold flex-shrink-0">3.</span>
              <div>
                <strong className="text-gray-900">Never share your PIN.</strong>{" "}
                No legitimate service — not Safaricom, not your bank, not anyone — will ever
                ask for your M-Pesa PIN, ATM PIN, or OTP codes.
              </div>
            </li>
            <li className="flex gap-3 text-gray-600 text-sm">
              <span className="text-green-600 font-bold flex-shrink-0">4.</span>
              <div>
                <strong className="text-gray-900">Be wary of urgency.</strong>{" "}
                Scammers create fake urgency (&quot;send now or lose the deal&quot;). Legitimate
                transactions can always wait for proper verification.
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">M-Pesa Safety Tips</h2>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Register for M-Pesa statements to track all transactions on your account
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Never respond to &quot;wrong number&quot; M-Pesa messages asking you to return money — call Safaricom on 100 to verify
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Lock your SIM card with a PIN to prevent SIM swap attacks (dial *100*100#)
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Safaricom will never call you asking for your PIN — their official number is 0722 000 000
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              For large transactions, meet in person at an M-Pesa agent or bank
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Be careful with &quot;Buy Goods&quot; till numbers — verify the business name displayed before confirming
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Verifying Businesses</h2>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Check company registration on the eCitizen portal (ecitizen.go.ke)
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              For investment companies, verify registration with the Capital Markets Authority (cma.or.ke)
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              For recruitment agencies, check registration with the National Employment Authority
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              For land transactions, conduct an official search at the Lands Registry before paying
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              For tenders, verify on the Public Procurement Information Portal (tenders.go.ke)
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Online Safety</h2>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Check that websites use HTTPS (padlock icon in browser) before entering personal information
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Be suspicious of social media stores with no reviews, no physical address, and only M-Pesa payment
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Never click on links in unsolicited SMS messages claiming to be from Safaricom, KRA, or banks
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Use unique passwords for each online account and enable two-factor authentication where possible
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 flex-shrink-0">•</span>
              Reverse-search images from online sellers to check if they&apos;re stolen from other sites
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">If You&apos;ve Been Scammed</h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-medium text-red-900 text-sm mb-2">Act Immediately</h3>
              <ul className="space-y-1.5 text-red-800 text-sm">
                <li className="flex gap-2">
                  <span className="flex-shrink-0">1.</span>
                  Call Safaricom on <strong>100</strong> to report the fraudulent transaction and request a reversal
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0">2.</span>
                  If a bank account was involved, contact your bank&apos;s fraud department immediately
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0">3.</span>
                  Screenshot all evidence — messages, transaction confirmations, phone numbers
                </li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-900 text-sm mb-2">Report to Authorities</h3>
              <ul className="space-y-1.5 text-blue-800 text-sm">
                <li className="flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  <strong>DCI (Directorate of Criminal Investigations):</strong> Report online at ficfb.dci.go.ke or call 0800 722 203
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  <strong>ODPC (Office of the Data Protection Commissioner):</strong> For data-related fraud at odpc.go.ke
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  <strong>Communications Authority of Kenya:</strong> For SIM-related fraud at ca.go.ke
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  Visit your nearest police station and file an OB report with all your evidence
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-green-50 rounded-xl border border-green-200 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold text-green-900 mb-2">Help Protect Others</h2>
          <p className="text-green-700 text-sm mb-4">
            After reporting to authorities, report the scam on ScamBusterKE so others can
            check the number before falling victim to the same scammer.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/report"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Report a Scam
            </Link>
            <Link
              href="/scam-types"
              className="inline-flex items-center px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
            >
              Learn About Scam Types
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
