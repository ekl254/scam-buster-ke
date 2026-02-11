import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-green-400">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
