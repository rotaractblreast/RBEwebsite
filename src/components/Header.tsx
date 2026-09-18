"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/types";

interface Props {
  nav: NavItem[];
}

function withSlash(url: string) {
  if (!url || url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("#")) return url;
  if (url === "/") return "/";
  return url.endsWith("/") ? url : `${url}/`;
}

export function Header({ nav }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = usePathname() || "/";

  const isActive = (url: string) => {
    const u = withSlash(url).replace(/\/$/, "") || "/";
    const p = currentPath.replace(/\/$/, "") || "/";
    if (u === "/") return p === "/";
    return p === u || p.startsWith(u + "/");
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent("open-search"));
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
      <div className="wrap flex justify-between items-center gap-3 h-16 md:h-20 min-w-0">
        <Link
          href="/"
          className="flex items-center shrink-0"
          aria-label="Rotaract Bangalore East - UNITE · RISE · EMPOWER"
        >
          <img
            src="/images/brandkit/RBEUniteRiseEmpower-crest.png"
            alt="Rotaract Bangalore East"
            className="h-11 md:h-14 w-auto object-contain"
            width="160"
            height="100"
            decoding="async"
          />
        </Link>

        <nav className="hidden lg:flex items-center lg:gap-4 xl:gap-7 min-w-0" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.url}
              href={withSlash(item.url)}
              className={`font-body text-body-md py-2 transition-colors ${
                isActive(item.url)
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {item.title}
            </Link>
          ))}

          <button
            type="button"
            onClick={handleOpenSearch}
            className="touch-target text-on-surface-variant hover:text-primary flex items-center justify-center p-2 rounded-lg"
            aria-label="Search"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>

          <Link href="/join/" className="btn btn-primary text-sm ml-1 touch-target">
            Join Us
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 lg:hidden shrink-0">
          <button
            type="button"
            onClick={handleOpenSearch}
            className="touch-target text-on-surface-variant hover:text-primary flex items-center justify-center p-2 rounded-lg"
            aria-label="Search"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>

          <Link
            href="/join/"
            className="btn btn-primary text-sm py-2 px-4 touch-target hidden sm:inline-flex"
          >
            Join
          </Link>

          <button
            type="button"
            id="nav-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="touch-target rounded border border-outline-variant text-on-surface p-2 flex items-center justify-center"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <span className="material-symbols-outlined">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="lg:hidden border-t border-outline-variant/40 bg-surface"
          aria-label="Mobile"
        >
          <div className="wrap py-4 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.url}
                href={withSlash(item.url)}
                onClick={() => setMobileOpen(false)}
                className={`rounded px-3 py-3 min-h-11 font-medium ${
                  isActive(item.url)
                    ? "bg-primary-container/20 text-primary"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                {item.title}
              </Link>
            ))}
            <Link
              href="/join/"
              onClick={() => setMobileOpen(false)}
              className="btn btn-primary mt-3 justify-center touch-target"
            >
              Join Us
            </Link>
            <Link
              href="/brandkit/"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-3 min-h-11 flex items-center text-sm text-on-surface-variant"
            >
              Brand Kit
            </Link>
            <Link
              href="/search/"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-3 min-h-11 flex items-center text-sm text-on-surface-variant"
            >
              Search
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
