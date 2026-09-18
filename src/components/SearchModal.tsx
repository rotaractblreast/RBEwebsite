"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  url: string;
  description: string;
  date?: string;
}

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K and custom events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenSearch = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-search", handleOpenSearch);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-search", handleOpenSearch);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search fetch
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="search-overlay"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-overlay-title"
    >
      <div
        className="fixed inset-0 bg-inverse-surface/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-outline-variant/30 overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-stone-400 text-[24px]">search</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news, events, causes…"
            className="flex-1 text-base text-stone-900 placeholder:text-stone-400 bg-transparent border-none focus:outline-none"
            autoComplete="off"
          />
          {loading && (
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1"
            aria-label="Close search"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
          {results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2">
                Matching Results ({results.length})
              </p>
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => setIsOpen(false)}
                  className="block p-3 rounded-xl hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.type === "post"
                          ? "bg-amber-100 text-amber-800"
                          : item.type === "event"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.typeLabel}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                      {item.description.replace(/<[^>]+>/g, "")}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : query.trim().length >= 2 && !loading ? (
            <div className="text-center py-10 text-stone-500">
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
              <button
                type="submit"
                onClick={handleSubmit}
                className="mt-3 text-xs text-primary font-semibold hover:underline"
              >
                Try full site search →
              </button>
            </div>
          ) : (
            <div className="py-6 px-2 text-stone-500 text-xs flex justify-between items-center">
              <span>Type at least 2 letters to search.</span>
              <span className="hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded text-[11px]">ESC</kbd> to close
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
