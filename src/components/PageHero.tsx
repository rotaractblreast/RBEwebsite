import React from "react";
import Link from "next/link";

interface Props {
  title: string;
  eyebrow?: string;
  lead?: string;
  showSearchLink?: boolean;
  background?: boolean;
  hideTitle?: boolean;
}

export function PageHero({
  title,
  eyebrow,
  lead,
  showSearchLink = false,
  background = true,
  hideTitle = false,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-inverse-surface text-inverse-on-surface">
      {background !== false && (
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/site/slider-4.jpg')" }}
          aria-hidden="true"
        />
      )}
      <div
        className={`absolute inset-0 hero-scrim ${background === false ? "opacity-90" : ""}`}
        aria-hidden="true"
      />
      <div className="wrap relative py-12 md:py-16 lg:py-20">
        {eyebrow && <p className="label-caps text-primary-fixed mb-3">{eyebrow}</p>}
        {!hideTitle && (
          <>
            <h1 className="font-display text-headline-lg md:text-display-hero text-white max-w-3xl">
              {title}
            </h1>
            {lead && (
              <p className="mt-4 text-body-lg text-surface-container-highest max-w-2xl">
                {lead}
              </p>
            )}
            {showSearchLink && (
              <p className="mt-6">
                <Link
                  href="/search/"
                  className="text-sm font-semibold text-primary-fixed hover:underline underline-offset-4"
                >
                  Search the site →
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
