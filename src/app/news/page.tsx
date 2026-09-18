import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { Pagination } from "@/components/Pagination";
import { getPosts } from "@/lib/content";
import { POSTS_PER_PAGE, SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News & Updates",
  description:
    "Read the latest news, service project stories, and community updates from Rotaract Bangalore East (Easterners) in Bengaluru, India.",
};

export default async function NewsPage() {
  const posts = await getPosts();
  const page = 1;
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const slice = posts.slice(0, POSTS_PER_PAGE);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: slice.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: new URL(p.url, SITE.url).href,
      name: p.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="News & Updates"
        eyebrow="Stories from Easterners"
        lead="Projects, fellowship, and impact from Rotaract Bangalore East."
        showSearchLink
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "News & Updates" }]} />

      <section className="section-pad">
        <div className="wrap">
          {slice.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {slice.map((post) => (
                  <CardPost key={post._id} post={post} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} />
            </>
          ) : (
            <p className="text-center text-on-surface-variant">No news yet. Check back soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
