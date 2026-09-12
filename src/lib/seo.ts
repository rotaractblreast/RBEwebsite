import { SITE } from "./site";

export type BreadcrumbCrumb = {
  label: string;
  /** Absolute or site-relative path; omit for current page. */
  href?: string;
};

/** Absolute URL for a site path. */
export function absoluteUrl(path: string): string {
  return new URL(path || "/", SITE.url).href;
}

/**
 * Strip HTML and produce clean, sentence-aware, and word-boundary safe meta descriptions.
 * - Strips HTML tags and collapses whitespace.
 * - If the first sentence ends cleanly between 75 and `max` characters, uses it directly for complete human context.
 * - Otherwise, breaks cleanly at the last full word before `max - 3` and appends `...`.
 * - Cleans any trailing punctuation before adding the ellipsis.
 */
export function metaDescription(raw: string | undefined | null, max = 155): string {
  const clean = String(raw ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean || clean.length <= max) return clean;

  // Check if the first sentence ends cleanly within an ideal snippet window (75 to max chars)
  const sentenceMatch = clean.match(/^([^.!?]+[.!?])/);
  if (sentenceMatch) {
    const firstSentence = sentenceMatch[1].trim();
    if (firstSentence.length >= 75 && firstSentence.length <= max) {
      return firstSentence;
    }
  }

  // Otherwise, break at the last word boundary before (max - 3)
  const target = max - 3;
  const lastSpace = clean.lastIndexOf(" ", target);
  const truncated = lastSpace > 50 ? clean.slice(0, lastSpace) : clean.slice(0, target);

  // Clean trailing punctuation before adding ellipsis
  const trimmed = truncated.replace(/[,;:\-\s]+$/, "");
  return `${trimmed}...`;
}

/** Twitter @handle from a twitter.com / x.com profile URL, if any. */
export function twitterHandleFromUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "twitter.com" && host !== "x.com") return undefined;
    const handle = u.pathname.split("/").filter(Boolean)[0];
    if (!handle || handle.startsWith("intent") || handle.startsWith("share")) return undefined;
    return `@${handle.replace(/^@/, "")}`;
  } catch {
    return undefined;
  }
}

export function breadcrumbListJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
}

export function organizationPublisherJsonLd() {
  return {
    "@type": "Organization" as const,
    name: SITE.title,
    url: SITE.url,
    logo: {
      "@type": "ImageObject" as const,
      url: absoluteUrl("/images/site/rbe.png"),
    },
  };
}

export function newsArticleJsonLd(input: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  image?: string | null;
  dateModified?: string;
}) {
  const imageUrl = input.image ? absoluteUrl(input.image) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.title,
    description: metaDescription(input.description, 300),
    datePublished: input.publishedAt,
    dateModified: input.dateModified ?? input.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(input.url),
    },
    image: imageUrl ? [imageUrl] : undefined,
    author: organizationPublisherJsonLd(),
    publisher: organizationPublisherJsonLd(),
  };
}

export function eventJsonLd(input: {
  title: string;
  description: string;
  url: string;
  start: string;
  end?: string | null;
  venue?: string;
  image?: string | null;
}) {
  const endDate = input.end || input.start;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    url: absoluteUrl(input.url),
    startDate: input.start,
    endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: input.venue
      ? {
          "@type": "Place",
          name: input.venue,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Bengaluru",
            addressRegion: "KA",
            addressCountry: "IN",
            streetAddress: input.venue,
          },
        }
      : {
          "@type": "Place",
          name: "Bengaluru",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Bengaluru",
            addressRegion: "KA",
            addressCountry: "IN",
          },
        },
    image: input.image ? [absoluteUrl(input.image)] : undefined,
    description: metaDescription(input.description, 500),
    organizer: {
      "@type": "Organization",
      name: SITE.title,
      url: SITE.url,
    },
  };
}

export function causeWebPageJsonLd(input: {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  donationLink?: string | null;
}) {
  const pageUrl = absoluteUrl(input.url);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: metaDescription(input.description, 500),
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE.title,
      url: SITE.url,
    },
    primaryImageOfPage: input.image
      ? { "@type": "ImageObject", url: absoluteUrl(input.image) }
      : undefined,
    about: {
      "@type": "NGO",
      name: SITE.title,
      url: SITE.url,
    },
    ...(input.donationLink
      ? {
          potentialAction: {
            "@type": "DonateAction",
            target: input.donationLink,
            name: `Donate - ${input.title}`,
          },
        }
      : {}),
  };
}

export function webSiteJsonLd(description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.title,
    url: SITE.url,
    description: metaDescription(description || SITE.description, 500),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/search/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Default social share image size (public/images/site/ogimage.png). */
export const DEFAULT_OG_IMAGE_SIZE = { width: 600, height: 600 } as const;

/** Typical size for Sanity-derived hero images used as OG. */
export const CONTENT_OG_IMAGE_SIZE = { width: 1200, height: 675 } as const;
