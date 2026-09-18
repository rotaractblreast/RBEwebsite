import React from "react";
import Link from "next/link";
import type { Cause } from "@/lib/types";
import { formatInrCurrency } from "@/lib/format";
import { urlForCardImage } from "@/lib/content";

interface Props {
  cause: Cause;
}

export function CardCause({ cause }: Props) {
  const cardImage = urlForCardImage(cause.image);

  return (
    <article className="card card-lift group flex flex-col">
      <Link href={cause.url} className="block aspect-[16/10] overflow-hidden bg-surface-container">
        {cardImage && (
          <img
            src={cardImage}
            alt={cause.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width="750"
            height="420"
          />
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <p className="label-caps mb-2">{cause.focus || "Cause"}</p>
        <h3 className="font-display text-lg font-semibold text-on-surface mb-2">
          <Link href={cause.url} className="hover:text-primary">
            {cause.title}
          </Link>
        </h3>
        {cause.intro ? (
          <p className="text-sm text-on-surface-variant line-clamp-3 mb-4 flex-1">
            {cause.intro.replace(/<[^>]+>/g, "").slice(0, 120)}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        {!!cause.progress && (
          <>
            <div
              className="progress mb-2"
              role="progressbar"
              aria-valuenow={cause.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fundraising progress"
            >
              <span style={{ width: `${cause.progress}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              {cause.progress}% funded
              {cause.goal != null && Number.isFinite(cause.goal)
                ? ` · Goal ${formatInrCurrency(cause.goal)}`
                : ""}
            </p>
          </>
        )}
        <Link
          href={cause.url}
          className="text-metadata text-primary font-bold uppercase tracking-wider mt-auto inline-flex items-center gap-1 group-hover:gap-2 transition-all"
        >
          Support cause <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
