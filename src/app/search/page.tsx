import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSanityClient, postUrl } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Results",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  let results: Array<{
    id: string;
    type: string;
    typeLabel: string;
    title: string;
    url: string;
    description: string;
  }> = [];

  if (query.length >= 2) {
    try {
      const client = getSanityClient();
      const term = `${query.replace(/[*~"']/g, "")}*`;
      const groq = `*[_type in ["post", "event", "cause"] && (title match $term || description match $term || bodyMarkdown match $term)] | order(_createdAt desc) [0...30] {
        _id,
        _type,
        title,
        "slug": slug.current,
        description,
        publishedAt
      }`;
      const items = await client.fetch(groq, { term });
      results = items.map((item: any) => {
        let url = "/";
        let typeLabel = "News";
        if (item._type === "post") {
          typeLabel = "News";
          url = item.publishedAt && item.slug ? postUrl(item.publishedAt, item.slug) : `/news/`;
        } else if (item._type === "event") {
          typeLabel = "Event";
          url = `/events/${item.slug}/`;
        } else if (item._type === "cause") {
          typeLabel = "Cause";
          url = `/causes/${item.slug}/`;
        }
        return {
          id: item._id,
          type: item._type,
          typeLabel,
          title: item.title,
          url,
          description: item.description || "",
        };
      });
    } catch (err) {
      console.error("Search fetch error:", err);
    }
  }

  return (
    <>
      <PageHero
        title="Search"
        eyebrow="Find anything on the site"
        lead="News, events, causes, and key pages."
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <section className="section-pad">
        <div className="wrap max-w-3xl">
          <form action="/search/" method="get" role="search" className="mb-6">
            <label htmlFor="search-q" className="sr-only">
              Search
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="search-q"
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search news, events, causes, pages…"
                required
                autoComplete="off"
                className="flex-1 min-w-0 rounded border border-outline-variant bg-surface-container-lowest px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
              <button type="submit" className="btn btn-primary touch-target shrink-0">
                Search
              </button>
            </div>
          </form>

          <p className="text-on-surface-variant mb-6">
            {query.length < 2 ? (
              "Enter a keyword above to search the site."
            ) : results.length === 0 ? (
              <>
                No results for &ldquo;<strong>{query}</strong>&rdquo;
              </>
            ) : (
              <>
                Found {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;
                <strong>{query}</strong>&rdquo;
              </>
            )}
          </p>

          <ul className="space-y-4">
            {results.map((item) => (
              <li key={item.id} className="card p-5">
                <div className="flex items-center gap-2 mb-1.5">
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
                <Link
                  className="font-display font-semibold text-lg text-on-surface hover:text-primary transition-colors"
                  href={item.url}
                >
                  {item.title}
                </Link>
                {item.description && (
                  <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">
                    {item.description.replace(/<[^>]+>/g, "")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
