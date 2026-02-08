import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-green-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              ScamBuster<span className="text-green-600">KE</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/browse"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Browse Scams
            </Link>
            <Link
              href="/report"
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full font-medium transition-colors"
            >
              Report a Scam
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-600 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
