"use client";

import Link from "next/link";
import { SCAM_TYPES } from "@/types";

const scamDetails: Record<string, { warning: string[]; examples: string[] }> = {
  mpesa: {
    warning: [
      "Unsolicited M-Pesa messages claiming you received money",
      "Requests to \"reverse\" a transaction you never received",
      "Calls claiming your M-Pesa account will be suspended",
      "Requests for your M-Pesa PIN or SIM card details",
      "Fake Safaricom customer care numbers",
    ],
    examples: [
      "\"You have received KES 5,000 from...\" followed by a call asking you to send it back",
      "SIM swap attacks where fraudsters take over your phone number to access M-Pesa",
      "Fake M-Pesa agents offering above-market withdrawal rates",
      "Fuliza or M-Shwari loan scams requesting upfront fees",
    ],
  },
  land: {
    warning: [
      "Property prices significantly below market value",
      "Pressure to pay before conducting a land search",
      "Seller unable to produce original title deed",
      "Multiple people claiming ownership of the same plot",
      "\"Agent\" requesting large fees before showing the property",
    ],
    examples: [
      "Fake land companies selling non-existent plots in satellite towns",
      "Forged title deeds used to sell land already owned by someone else",
      "Succession scams where fraudsters impersonate deceased owners' relatives",
      "Double-selling of plots in new housing developments",
    ],
  },
  jobs: {
    warning: [
      "Job offers requiring upfront payment for \"processing\" or \"training\"",
      "Unsolicited job offers via SMS or WhatsApp for overseas positions",
      "Recruitment agencies not registered with the National Employment Authority",
      "Vague job descriptions with unrealistically high salaries",
      "Interviews conducted in informal locations rather than offices",
    ],
    examples: [
      "\"Kazi Majuu\" scams promising jobs abroad in exchange for upfront agency fees",
      "Fake calling letters from government ministries or the military",
      "Work-from-home schemes requiring purchase of \"starter kits\"",
      "Fake internship placements at well-known companies",
    ],
  },
  investment: {
    warning: [
      "Guaranteed returns with no risk — especially above 10% monthly",
      "Pressure to recruit others to earn more",
      "Unregistered with the Capital Markets Authority (CMA)",
      "Vague or secretive about how returns are generated",
      "Difficulty withdrawing your funds",
    ],
    examples: [
      "Pyramid schemes disguised as \"savings groups\" or \"investment clubs\"",
      "Fake cryptocurrency trading platforms promising daily profits",
      "Binary options scams targeting Kenyans on social media",
      "Ponzi schemes that pay early investors using new members' deposits",
    ],
  },
  tender: {
    warning: [
      "Tender opportunities shared via WhatsApp or personal contacts rather than official portals",
      "Requests for \"goodwill\" or processing fees to be shortlisted",
      "Tenders from non-existent government departments",
      "Extremely short deadlines that prevent proper due diligence",
      "Contact emails using free providers (Gmail, Yahoo) instead of official .go.ke domains",
    ],
    examples: [
      "Fake county government tenders requiring refundable \"security deposits\"",
      "Impersonation of PPRA or other procurement officials",
      "Fake tender awards followed by requests for \"tax clearance fees\"",
      "Middlemen claiming insider connections for government contracts",
    ],
  },
  online: {
    warning: [
      "Prices significantly lower than other established stores",
      "Payment only via M-Pesa to personal numbers (not paybill/till)",
      "No physical address or verifiable business registration",
      "New social media pages with few followers but many \"sales\"",
      "Seller becomes unresponsive after payment",
    ],
    examples: [
      "Instagram and Facebook shops collecting payments but never delivering goods",
      "Fake e-commerce websites cloning legitimate stores",
      "Advance payment for imported electronics that never arrive",
      "Dropshipping scams selling low-quality items at premium prices",
    ],
  },
  romance: {
    warning: [
      "Online relationship that moves unusually fast emotionally",
      "Partner avoids video calls or in-person meetings",
      "Sudden financial emergencies requiring urgent money transfers",
      "Claims of being a foreigner, often military, doctor, or engineer",
      "Stories designed to create sympathy and obligation",
    ],
    examples: [
      "Dating app matches who quickly move conversations to WhatsApp, then request money",
      "\"Foreign\" partners asking for money to pay for travel visas to visit Kenya",
      "Fake military personnel claiming they need money to \"process leave\"",
      "Sextortion — threats to share intimate images unless money is sent",
    ],
  },
  other: {
    warning: [
      "Any unsolicited request for money or personal information",
      "Deals that seem too good to be true",
      "Pressure tactics and artificial urgency",
      "Requests to keep the transaction secret",
    ],
    examples: [
      "Fake charity collections after disasters or emergencies",
      "Prize and lottery scams claiming you won a competition you never entered",
      "Fake insurance agents collecting premiums for non-existent policies",
      "Rental scams for properties the \"landlord\" doesn't own",
    ],
  },
};

export default function ScamTypesPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Common Scam Types in Kenya</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Understanding how scams work is your first line of defence. Below are the most common
          types of fraud reported in Kenya, with warning signs and real examples to help you
          stay safe.
        </p>

        <div className="space-y-6">
          {Object.entries(SCAM_TYPES).map(([key, scam]) => {
            const details = scamDetails[key];
            if (!details) return null;
            return (
              <article
                key={key}
                id={key}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{scam.label}</h2>
                <p className="text-gray-500 text-sm mb-4">{scam.description}</p>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-red-700 text-sm mb-2">Warning Signs</h3>
                    <ul className="space-y-1.5">
                      {details.warning.map((w, i) => (
                        <li key={i} className="text-gray-600 text-sm flex gap-2">
                          <span className="text-red-400 flex-shrink-0">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-2">Real Examples</h3>
                    <ul className="space-y-1.5">
                      {details.examples.map((e, i) => (
                        <li key={i} className="text-gray-600 text-sm flex gap-2">
                          <span className="text-gray-400 flex-shrink-0">•</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 bg-green-50 rounded-xl border border-green-200 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold text-green-900 mb-2">Been scammed or spotted a scam?</h2>
          <p className="text-green-700 text-sm mb-4">
            Help protect others by reporting it. Your report is anonymous and takes under 2 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/report"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Report a Scam
            </Link>
            <Link
              href="/how-to-protect"
              className="inline-flex items-center px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
            >
              How to Protect Yourself
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
