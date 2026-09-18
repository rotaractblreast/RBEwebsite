import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import {
  loadBrandKitFromFs,
  loadCausesFromFs,
  loadEventsFromFs,
  loadJoinFaqFromFs,
  loadPostsFromFs,
  loadSiteSettingsFromFs,
  loadTeamFromFs,
} from "./contentFs";
import type {
  BrandKitGroup,
  Cause,
  EventDoc,
  Post,
  SiteSettings,
  TeamMember,
} from "./types";

function useFs(): boolean {
  // FS collections were removed in the Sanity cutover. Only opt in explicitly for local debugging
  // after restoring markdown collections - never treat a missing project id as FS mode.
  return process.env.USE_FS_CONTENT === "1";
}

let cachedSanityClient: ReturnType<typeof createClient> | null = null;
let cachedImageBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

export function getSanityClient() {
  if (cachedSanityClient) return cachedSanityClient;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "t6bu0f9m";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  cachedSanityClient = createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
  });
  return cachedSanityClient;
}

function getImageBuilder() {
  if (cachedImageBuilder) return cachedImageBuilder;
  cachedImageBuilder = imageUrlBuilder(getSanityClient());
  return cachedImageBuilder;
}

export function urlForImage(
  source: SanityImageSource | string | null | undefined,
  width = 1200,
): string | null {
  if (!source) return null;
  if (typeof source === "string") {
    if (source.includes("cdn.sanity.io")) {
      try {
        const url = new URL(source);
        url.searchParams.set("auto", "format");
        url.searchParams.set("w", String(width));
        return url.toString();
      } catch {
        return source;
      }
    }
    return source;
  }
  try {
    return getImageBuilder().image(source).width(width).auto("format").url();
  } catch {
    return null;
  }
}

export function urlForCardImage(
  source: SanityImageSource | string | null | undefined,
): string | null {
  return urlForImage(source, 800);
}

export function urlForHeroImage(
  source: SanityImageSource | string | null | undefined,
): string | null {
  return urlForImage(source, 1200);
}

export function postUrl(publishedAt: string, slug: string) {
  const d = new Date(publishedAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `/news/${get("year")}/${get("month")}/${get("day")}/${slug}/`;
}

import { cache } from "react";

export const getPosts = cache(async function getPosts(): Promise<Post[]> {
  return fetchPostsInternal();
});

async function fetchPostsInternal(): Promise<Post[]> {
  if (useFs()) return loadPostsFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "post"]|order(publishedAt desc){
      _id, title, "slug": slug.current, publishedAt, image, description, bodyMarkdown,
      "categories": categories[]->{
        title,
        "slug": slug.current
      },
      "tags": tags[]->{
        title,
        "slug": slug.current
      }
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    const publishedAt = String(r.publishedAt);
    const categories = ((r.categories as Array<Record<string, unknown>>) ?? [])
      .filter((c) => c && (c.slug || c.title))
      .map((c) => ({
        title: String(c.title ?? c.slug ?? ""),
        slug: String(c.slug ?? "").toLowerCase(),
      }))
      .filter((c) => c.slug);
    const tags = ((r.tags as Array<Record<string, unknown>>) ?? [])
      .filter((t) => t && (t.slug || t.title))
      .map((t) => ({
        title: String(t.title ?? t.slug ?? ""),
        slug: String(t.slug ?? "").toLowerCase(),
      }))
      .filter((t) => t.slug);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      publishedAt,
      image: urlForHeroImage(r.image as SanityImageSource),
      categories,
      tags,
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      url: postUrl(publishedAt, slug),
    };
  });
}

export const getEvents = cache(async function getEvents(): Promise<EventDoc[]> {
  return fetchEventsInternal();
});

async function fetchEventsInternal(): Promise<EventDoc[]> {
  if (useFs()) return loadEventsFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "event"]|order(start desc){
      _id, title, "slug": slug.current, start, end, venue, buttonOpen, buttonText, buttonUrl, image, intro, description, bodyMarkdown
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      start: String(r.start),
      end: String(r.end),
      venue: String(r.venue ?? ""),
      buttonOpen: Boolean(r.buttonOpen),
      buttonText: String(r.buttonText ?? ""),
      buttonUrl: String(r.buttonUrl ?? ""),
      image: urlForHeroImage(r.image as SanityImageSource),
      intro: String(r.intro ?? ""),
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      url: `/events/${slug}/`,
    };
  });
}

export const getCauses = cache(async function getCauses(): Promise<Cause[]> {
  return fetchCausesInternal();
});

async function fetchCausesInternal(): Promise<Cause[]> {
  if (useFs()) return loadCausesFromFs();
  const client = getSanityClient();
  const rows = await client.fetch<Array<Record<string, unknown>>>(
    `*[_type == "cause"]{
      _id, title, "slug": slug.current, focus, image, due, active, goal, progress, featured, donationLink, intro, description, bodyMarkdown
    }`,
  );
  return rows.map((r) => {
    const slug = String(r.slug);
    return {
      _id: String(r._id),
      title: String(r.title),
      slug,
      focus: String(r.focus ?? ""),
      image: urlForHeroImage(r.image as SanityImageSource),
      due: r.due ? String(r.due) : null,
      active: Boolean(r.active),
      goal: typeof r.goal === "number" ? r.goal : null,
      progress: Number(r.progress ?? 0),
      featured: Boolean(r.featured),
      donationLink: r.donationLink ? String(r.donationLink) : null,
      intro: String(r.intro ?? ""),
      description: String(r.description ?? ""),
      bodyMarkdown: String(r.bodyMarkdown ?? ""),
      url: `/causes/${slug}/`,
    };
  });
}

/** Site settings are static: `_data/info.yml` (contact, social, home/about copy). */
export async function getSiteSettings(): Promise<SiteSettings> {
  return loadSiteSettingsFromFs();
}

export const getTeam = cache(async function getTeam(): Promise<TeamMember[]> {
  return fetchTeamInternal();
});

async function fetchTeamInternal(): Promise<TeamMember[]> {
  if (useFs()) return loadTeamFromFs();
  const client = getSanityClient();
  const doc = await client.fetch(`*[_type == "team"][0]{members[]{..., "image": image.asset->url}}`);
  return (doc?.members ?? []).map((m: Record<string, unknown>) => ({
    name: String(m.name ?? ""),
    role: String(m.role ?? ""),
    memberSince: m.memberSince ? String(m.memberSince) : undefined,
    image: m.image ? String(m.image) : null,
    featurelink: m.featurelink ? String(m.featurelink) : undefined,
    social: (m.social as Record<string, string>) ?? {},
  }));
}

/** Always from `_data/join_faq.yml` - not managed in Sanity Studio. */
export async function getJoinFaq(): Promise<Array<{ question: string; answer: string }>> {
  return loadJoinFaqFromFs();
}

/** Brand kit is static: `_data/brandkit.yml` + `public/images/brandkit/` (Netlify). */
export async function getBrandKit(): Promise<BrandKitGroup[]> {
  return loadBrandKitFromFs();
}
