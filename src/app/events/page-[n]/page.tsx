import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardEvent } from "@/components/CardEvent";
import { Pagination } from "@/components/Pagination";
import { getEvents } from "@/lib/content";
import { eventState, nowStamp, toUnix } from "@/lib/events";
import { eventsPagePath } from "@/lib/paths";
import { archivePagePaths, paginateList } from "@/lib/paginate";
import { LIST_PAGE_SIZE } from "@/lib/site";

export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getEvents();
  const now = nowStamp();
  const past = [...events]
    .filter((e) => eventState(e.start, e.end, now) === "past")
    .sort((a, b) => (toUnix(b.start) ?? 0) - (toUnix(a.start) ?? 0));
  const { totalPages } = paginateList(past, 1, LIST_PAGE_SIZE);

  return archivePagePaths(totalPages).map((page) => ({ n: String(page) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  return {
    title: `Past events - page ${n}`,
    description: "Past events from Rotaract Bangalore East - workshops, drives, and fellowship archives.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EventsArchivePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const pageNum = parseInt(n, 10);
  if (isNaN(pageNum) || pageNum < 2) notFound();

  const events = await getEvents();
  const now = nowStamp();
  const past = [...events]
    .filter((e) => eventState(e.start, e.end, now) === "past")
    .sort((a, b) => (toUnix(b.start) ?? 0) - (toUnix(a.start) ?? 0));

  const { totalPages, slice } = paginateList(past, pageNum, LIST_PAGE_SIZE);

  if (pageNum > totalPages) notFound();

  return (
    <>
      <PageHero
        title="Past events"
        eyebrow="Events archive"
        lead="Earlier workshops, drives, and fellowship with Easterners."
        showSearchLink
      />
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events/" },
          { label: `Page ${pageNum}` },
        ]}
      />
      <section className="section-pad">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {slice.map((event) => (
              <CardEvent key={event._id} event={event} now={now} />
            ))}
          </div>
          <Pagination
            page={pageNum}
            totalPages={totalPages}
            basePath="/events/"
            pageHref={eventsPagePath}
          />
        </div>
      </section>
    </>
  );
}
