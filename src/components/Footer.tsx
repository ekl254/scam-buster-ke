import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-green-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                ScamBuster<span className="text-green-600">KE</span>
              </span>
            </Link>
            <p className="text-gray-600 text-sm max-w-md">
              Protecting Kenyans from fraud. Check before you pay, report when
              you&apos;re played. Together we can make Kenya safer from scammers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/browse" className="text-gray-600 hover:text-green-600 text-sm">
                  Browse Scams
                </Link>
              </li>
              <li>
                <Link href="/report" className="text-gray-600 hover:text-green-600 text-sm">
                  Report a Scam
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-green-600 text-sm">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/scam-types" className="text-gray-600 hover:text-green-600 text-sm">
                  Scam Types
                </Link>
              </li>
              <li>
                <Link href="/how-to-protect" className="text-gray-600 hover:text-green-600 text-sm">
                  How to Protect Yourself
                </Link>
              </li>
              <li>
                <a
                  href="https://www.dci.go.ke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-600 text-sm"
                >
                  Report to DCI
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} ScamBusterKE. Built to protect Kenya.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-green-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-green-600">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
