import React from "react";
import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  basePath?: string;
  pageHref?: (n: number) => string;
}

export function Pagination({
  page,
  totalPages,
  basePath = "/news/",
  pageHref = (n: number) => `/news/page-${n}/`,
}: Props) {
  if (totalPages <= 1) return null;

  const prevHref = page <= 1 ? null : page === 2 ? basePath : pageHref(page - 1);
  const nextHref = page < totalPages ? pageHref(page + 1) : null;

  return (
    <nav className="mt-12 flex justify-center gap-2" aria-label="Pagination">
      {prevHref && (
        <Link href={prevHref} className="btn btn-outline text-sm py-2">
          Previous
        </Link>
      )}
      <span className="inline-flex items-center px-4 text-sm text-on-surface-variant">
        Page {page} of {totalPages}
      </span>
      {nextHref && (
        <Link href={nextHref} className="btn btn-outline text-sm py-2">
          Next
        </Link>
      )}
    </nav>
  );
}
