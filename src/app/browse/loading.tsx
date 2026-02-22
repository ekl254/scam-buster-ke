export default function BrowseLoading() {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-9 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-80 animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 bg-gray-200 rounded-full animate-pulse"
                  style={{ width: `${60 + (i % 3) * 20}px` }}
                />
              ))}
            </div>
          </div>
          <div className="sm:w-48">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Count skeleton */}
        <div className="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse" />

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                <div className="h-5 bg-gray-200 rounded-full w-28" />
              </div>
              {/* Identifier */}
              <div className="h-6 bg-gray-200 rounded w-36 mb-3" />
              {/* Description lines */}
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
              </div>
              {/* Footer row */}
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
