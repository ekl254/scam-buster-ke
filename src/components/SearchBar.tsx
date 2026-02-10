"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  size?: "default" | "large";
  dark?: boolean;
  className?: string;
}

export function SearchBar({ size = "default", dark = false, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    // Navigate to SEO-friendly check page
    router.push(`/check/${encodeURIComponent(query.trim())}`);
  };

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSearch} className={cn("w-full", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          {isSearching ? (
            <Loader2 className={cn("text-gray-400 animate-spin", isLarge ? "h-6 w-6" : "h-5 w-5")} />
          ) : (
            <Search className={cn("text-gray-400", isLarge ? "h-6 w-6" : "h-5 w-5")} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter phone number, Paybill, or company name..."
          className={cn(
            "w-full bg-white text-gray-900 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all",
            isLarge
              ? "pl-14 pr-32 py-5 text-lg placeholder:text-gray-400"
              : "pl-12 pr-24 py-3 text-base placeholder:text-gray-400"
          )}
        />
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium rounded-full transition-colors",
            isLarge
              ? "px-8 my-2 mr-2 text-lg"
              : "px-6 my-1.5 mr-1.5 text-base"
          )}
        >
          Check
        </button>
      </div>
      <p className={cn("mt-2", isLarge ? "text-sm" : "text-xs", dark ? "text-white/90" : "text-gray-500")}>
        Examples: 0712345678, 123456 (Paybill), Pettmall Shelters
      </p>
    </form>
  );
}
