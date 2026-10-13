import type { MetadataRoute } from "next";
import { getCauses, getEvents, getPosts } from "@/lib/content";
import { SITE } from "@/lib/site";

/** Revalidate sitemap in background every hour, or on-demand via Sanity webhook. */
export const revalidate = 3600;

/** Baseline release timestamp for stable static pages to avoid spoofing Googlebot lastmod. */
const STATIC_MODIFIED = new Date("2026-10-01T00:00:00.000Z");

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9][a-z0-9-_]*$/i.test(slug.trim());
}

function parseDate(value?: string, fallback: Date = STATIC_MODIFIED): Date {
  if (!value) return fallback;
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, events, causes] = await Promise.all([
    getPosts(),
    getEvents(),
    getCauses(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: STATIC_MODIFIED, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE.url}/about/`, lastModified: STATIC_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/news/`, lastModified: STATIC_MODIFIED, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/events/`, lastModified: STATIC_MODIFIED, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/causes/`, lastModified: STATIC_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/contact/`, lastModified: STATIC_MODIFIED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/join/`, lastModified: STATIC_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/brandkit/`, lastModified: STATIC_MODIFIED, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/privacy/`, lastModified: STATIC_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/terms/`, lastModified: STATIC_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
  ];

  const validPosts = posts.filter((post) => isValidSlug(post.slug));
  const postRoutes: MetadataRoute.Sitemap = validPosts.map((post) => ({
    url: new URL(post.url, SITE.url).href,
    lastModified: parseDate(post.updatedAt || post.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const validEvents = events.filter((event) => isValidSlug(event.slug));
  const eventRoutes: MetadataRoute.Sitemap = validEvents.map((event) => ({
    url: new URL(event.url, SITE.url).href,
    lastModified: parseDate(event.updatedAt || event.start),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const validCauses = causes.filter((cause) => isValidSlug(cause.slug));
  const causeRoutes: MetadataRoute.Sitemap = validCauses.map((cause) => ({
    url: new URL(cause.url, SITE.url).href,
    lastModified: parseDate(cause.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categorySlugs = new Set<string>();
  const tagSlugs = new Set<string>();
  for (const p of validPosts) {
    for (const c of p.categories ?? []) {
      if (c.slug && isValidSlug(c.slug)) categorySlugs.add(c.slug);
    }
    for (const t of p.tags ?? []) {
      if (t.slug && isValidSlug(t.slug)) tagSlugs.add(t.slug);
    }
  }

  const categoryRoutes: MetadataRoute.Sitemap = [...categorySlugs].map((slug) => ({
    url: `${SITE.url}/news/${slug}/`,
    lastModified: STATIC_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tagRoutes: MetadataRoute.Sitemap = [...tagSlugs].map((slug) => ({
    url: `${SITE.url}/news/tag-${slug}/`,
    lastModified: STATIC_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...eventRoutes, ...causeRoutes, ...categoryRoutes, ...tagRoutes];
}
