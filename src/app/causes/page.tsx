import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardCause } from "@/components/CardCause";
import { Pagination } from "@/components/Pagination";
import { getCauses } from "@/lib/content";
import { causesPagePath } from "@/lib/paths";
import { paginateList } from "@/lib/paginate";
import { LIST_PAGE_SIZE, SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Causes",
  description:
    "Discover community service causes and fundraising drives by Rotaract Bangalore East. Support youth-led social impact and service across Bengaluru.",
};

export default async function CausesPage() {
  const causes = await getCauses();
  const active = causes.filter((c) => c.active);
  const inactive = causes.filter((c) => !c.active);
  const { page, totalPages, slice: completedPage } = paginateList(
    inactive,
    1,
    LIST_PAGE_SIZE
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: active.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: new URL(c.url, SITE.url).href,
      name: c.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="Our Causes"
        eyebrow="Serve with purpose"
        lead="Support community projects and fundraising from Rotaract Bangalore East."
        showSearchLink
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Causes" }]} />

      <section className="section-pad">
        <div className="wrap">
          {active.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {active.map((cause) => (
                <CardCause key={cause._id} cause={cause} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center bg-surface-container-low">
              <p className="text-on-surface-variant mb-4">
                No active causes at the moment. Explore our news and events meanwhile.
              </p>
              <Link href="/news/" className="btn btn-primary text-sm">
                Browse news
              </Link>
            </div>
          )}

          {inactive.length > 0 && (
            <>
              <h2 className="font-display text-headline-md mt-16 mb-6">Completed causes</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-90">
                {completedPage.map((cause) => (
                  <CardCause key={cause._id} cause={cause} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/causes/"
                pageHref={causesPagePath}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
