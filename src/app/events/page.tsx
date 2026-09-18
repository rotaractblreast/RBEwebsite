import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardEvent } from "@/components/CardEvent";
import { Pagination } from "@/components/Pagination";
import { getEvents } from "@/lib/content";
import { eventState, nowStamp, toUnix } from "@/lib/events";
import { eventsPagePath } from "@/lib/paths";
import { paginateList } from "@/lib/paginate";
import { LIST_PAGE_SIZE, SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Events & Activities",
  description:
    "Explore upcoming and past events from Rotaract Bangalore East. Join community drives, skill workshops, and fellowship for young adults in Bangalore.",
};

export default async function EventsPage() {
  const events = await getEvents();
  const now = nowStamp();
  const eventsSorted = [...events].sort(
    (a, b) => (toUnix(a.start) ?? 0) - (toUnix(b.start) ?? 0)
  );
  const live = eventsSorted.filter((e) => {
    const s = eventState(e.start, e.end, now);
    return s === "ongoing" || s === "upcoming";
  });
  const past = [...events]
    .filter((e) => eventState(e.start, e.end, now) === "past")
    .sort((a, b) => (toUnix(b.start) ?? 0) - (toUnix(a.start) ?? 0));

  const { page, totalPages, slice: pastPage } = paginateList(past, 1, LIST_PAGE_SIZE);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: live.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: new URL(e.url, SITE.url).href,
      name: e.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="Events & Activities"
        eyebrow="Gather · Serve · Celebrate"
        lead="Workshops, drives, and fellowship with Easterners."
        showSearchLink
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Events & Activities" }]} />

      <section className="section-pad">
        <div className="wrap">
          <div id="live-events-container">
            {live.length > 0 && (
              <div id="live-events-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {live.map((event) => (
                  <CardEvent key={event._id} event={event} now={now} />
                ))}
              </div>
            )}
            <div
              id="live-events-empty"
              className={`card p-8 sm:p-10 text-center bg-surface-container-low max-w-2xl mx-auto border border-outline-variant/30 ${
                live.length > 0 ? "hidden" : ""
              }`}
            >
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                  event_available
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-on-surface mb-2">
                Planning Our Next Gathering
              </h3>
              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                We organize regular weekend community drives, general body meetings, and social fellowship gatherings across Bangalore. While our next public date is being scheduled, explore our recent project stories or apply to receive an invitation to our next assembly.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/news/" className="btn btn-outline text-sm touch-target">
                  Read Recent Stories
                </Link>
                <Link href="/join/" className="btn btn-primary text-sm touch-target">
                  Join as a Member
                </Link>
              </div>
            </div>
          </div>

          <div id="past-events-section" className={past.length > 0 ? "" : "hidden"}>
            <h2 className="font-display text-headline-md mt-16 mb-6">Past events</h2>
            <div id="past-events-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastPage.map((event) => (
                <CardEvent key={event._id} event={event} now={now} />
              ))}
            </div>
            {past.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/events/"
                pageHref={eventsPagePath}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
