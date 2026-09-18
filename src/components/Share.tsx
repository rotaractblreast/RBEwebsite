"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SocialIcon } from "./SocialIcon";
import { SITE } from "@/lib/site";
import { newsTagPath, normalizePostTag } from "@/lib/paths";
import type { PostTag } from "@/lib/types";

interface Props {
  url: string;
  title: string;
  tags?: Array<string | PostTag>;
}

export function Share({ url, title, tags = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  const absolute = typeof window !== "undefined" ? new URL(url, window.location.origin).href : `${SITE.url}${url}`;
  const encodedUrl = encodeURIComponent(absolute);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setHasNativeShare(true);
    }
  }, []);

  const tagList = (tags ?? [])
    .map((t) => {
      if (typeof t === "string") {
        const s = t.trim();
        return s ? normalizePostTag(s) : null;
      }
      if (t?.slug) return { title: t.title || t.slug, slug: t.slug };
      return null;
    })
    .filter((t): t is { title: string; slug: string } => Boolean(t?.slug));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: absolute });
    } catch {
      // User cancelled
    }
  };

  return (
    <div className="share-bar flex flex-wrap items-center gap-3 mt-10 pt-6 border-t border-outline-variant/40">
      <span className="text-sm font-semibold text-on-surface">Share</span>

      <div className="flex flex-wrap items-center gap-2">
        <a
          className="share-icon-btn"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
          aria-label="Share on X"
        >
          <span className="share-icon-btn__glyph">
            <SocialIcon network="twitter" />
          </span>
        </a>
        <a
          className="share-icon-btn"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://facebook.com/sharer.php?u=${encodedUrl}`}
          aria-label="Share on Facebook"
        >
          <span className="share-icon-btn__glyph">
            <SocialIcon network="facebook" />
          </span>
        </a>
        <a
          className="share-icon-btn"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`}
          aria-label="Share on LinkedIn"
        >
          <span className="share-icon-btn__glyph">
            <SocialIcon network="linkedin" />
          </span>
        </a>

        <div className="relative">
          <button
            type="button"
            className="share-icon-btn share-icon-btn--primary"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Share this page"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              upload
            </span>
          </button>

          {open && (
            <div
              className="share-popover absolute left-0 top-full mt-2 z-[60] bg-white border border-stone-200 rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[180px]"
              role="menu"
            >
              {hasNativeShare && (
                <button
                  type="button"
                  className="share-popover__item flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg text-left"
                  onClick={handleNativeShare}
                  role="menuitem"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary shrink-0" aria-hidden="true">
                    send
                  </span>
                  <span className="whitespace-nowrap">Share via device…</span>
                </button>
              )}
              <button
                type="button"
                className="share-popover__item flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg text-left"
                onClick={handleCopy}
                role="menuitem"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface shrink-0" aria-hidden="true">
                  {copied ? "check" : "link"}
                </span>
                <span className="whitespace-nowrap">
                  {copied ? "Copied!" : "Copy link"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {tagList.length > 0 && (
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-1" aria-label="Tags">
          {tagList.map((t) => (
            <Link
              key={t.slug}
              href={newsTagPath(t.slug)}
              className="text-xs uppercase tracking-wider bg-primary-container/35 text-on-primary-container px-2.5 py-1 rounded-full font-semibold hover:bg-primary-container/55"
            >
              {t.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
