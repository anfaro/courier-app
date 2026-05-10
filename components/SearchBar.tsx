// components/SearchBar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize from URL param
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Debounce logic: trigger router push after user stops typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only push if the query has actually changed from the URL state
      const currentUrlQuery = searchParams.get("q") || "";
      
      if (query !== currentUrlQuery) {
        if (query.trim()) {
          router.push(`/customers?q=${encodeURIComponent(query)}`);
        } else {
          router.push(`/customers`);
        }
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [query, router, searchParams]);

  const clearSearch = () => {
    setQuery("");
    router.push(`/customers`);
  };

  return (
    <div className="mb-6 relative flex items-center group">
      {/* Search Icon */}
      <div className="absolute left-5 text-secondary transition-colors group-focus-within:text-blue-600">
        <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* M3 Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search names, addresses, or phones..."
        className="w-full rounded-full border border-transparent bg-card py-4 pl-14 pr-12 text-[16px] text-primary shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-secondary"
      />

      {/* Clear Button */}
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-secondary transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
