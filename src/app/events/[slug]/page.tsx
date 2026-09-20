import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardEvent } from "@/components/CardEvent";
import { Pagination } from "@/components/Pagination";
import { MarkdownBody } from "@/components/MarkdownBody";
import { Share } from "@/components/Share";
import { getEvents } from "@/lib/content";
import { eventState, formatDateTime, nowStamp, toUnix } from "@/lib/events";
import { eventsPagePath } from "@/lib/paths";
import { archivePagePaths, paginateList } from "@/lib/paginate";
import { LIST_PAGE_SIZE } from "@/lib/site";
import { breadcrumbListJsonLd, eventJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getEvents();
  const eventParams = events
    .filter((event) => !/^page-\d+$/i.test(event.slug))
    .map((event) => ({ slug: event.slug }));

  const now = nowStamp();
  const past = [...events]
    .filter((e) => eventState(e.start, e.end, now) === "past")
    .sort((a, b) => (toUnix(b.start) ?? 0) - (toUnix(a.start) ?? 0));
  const { totalPages } = paginateList(past, 1, LIST_PAGE_SIZE);
  const pageParams = archivePagePaths(totalPages).map((page) => ({ slug: `page-${page}` }));

  return [...eventParams, ...pageParams];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Case A: Events Archive Pagination (/events/page-2/, etc.)
  if (/^page-\d+$/i.test(slug)) {
    const pageNum = slug.replace(/^page-/i, "");
    return {
      title: `Past events - page ${pageNum}`,
      description: "Past events from Rotaract Bangalore East - workshops, drives, and fellowship archives.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Case B: Single Event Detail
  const events = await getEvents();
  const event = events.find((e) => e.slug === slug);
  if (!event) return {};

  const datePart = event.start ? ` on ${formatDateTime(event.start)}` : "";
  const venuePart = event.venue ? ` at ${event.venue}` : "";
  const fallbackSummary = `${event.title} hosted by Rotaract Bangalore East${datePart}${venuePart}. Join Easterners for community service and fellowship.`;
  const summary = (event.description || event.intro || fallbackSummary).trim();

  return {
    title: event.title,
    description: summary,
    openGraph: {
      title: event.title,
      description: summary,
      url: event.url,
      type: "website",
      images: event.image ? [{ url: event.image, alt: event.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: summary,
      images: event.image ? [event.image] : [],
    },
  };
}

export default async function EventPageOrArchiveDispatcher({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Case A: Events Archive Pagination (/events/page-2/, /events/page-3/, etc.)
  if (/^page-\d+$/i.test(slug)) {
    const pageNum = parseInt(slug.replace(/^page-/i, ""), 10);
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

  // Case B: Single Event Detail
  const events = await getEvents();
  const event = events.find((e) => e.slug === slug);
  if (!event) notFound();

  const buttonHref = event.buttonUrl?.includes("://")
    ? event.buttonUrl
    : event.buttonUrl
    ? event.buttonUrl.startsWith("/")
      ? event.buttonUrl
      : `/${event.buttonUrl}`
    : "";

  const datePart = event.start ? ` on ${formatDateTime(event.start)}` : "";
  const venuePart = event.venue ? ` at ${event.venue}` : "";
  const fallbackSummary = `${event.title} hosted by Rotaract Bangalore East${datePart}${venuePart}. Join Easterners for community service and fellowship.`;
  const summary = (event.description || event.intro || fallbackSummary).trim();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Events", href: "/events/" },
    { label: event.title },
  ];
  const jsonLd = [
    eventJsonLd({
      title: event.title,
      description: summary,
      url: event.url,
      start: event.start,
      end: event.end,
      venue: event.venue,
      image: event.image,
    }),
    breadcrumbListJsonLd(crumbs),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero title={event.title} eyebrow="Event" background={false} />
      <Breadcrumbs crumbs={crumbs} />
      <article className="section-pad pt-0">
        <div className="wrap grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {event.image && (
              <img
                src={event.image}
                alt={event.title}
                className="w-full rounded-lg mb-8 aspect-[16/9] object-cover"
                width={1200}
                height={675}
              />
            )}
            {event.intro && <p className="text-body-lg text-on-surface-variant mb-6">{event.intro}</p>}
            <MarkdownBody markdown={event.bodyMarkdown || event.description} />
            <Share url={event.url} title={event.title} />
          </div>
          <aside className="lg:col-span-1">
            <div className="card p-6 sticky-panel space-y-4">
              <div>
                <p className="label-caps mb-1">Starts</p>
                <p className="font-medium">{formatDateTime(event.start)}</p>
              </div>
              {event.end && (
                <div>
                  <p className="label-caps mb-1">Ends</p>
                  <p className="font-medium">{formatDateTime(event.end)}</p>
                </div>
              )}
              {event.venue && (
                <div>
                  <p className="label-caps mb-1">Venue</p>
                  <p className="font-medium">{event.venue}</p>
                </div>
              )}
              {event.buttonOpen && event.buttonUrl ? (
                <a
                  href={buttonHref}
                  className="btn btn-primary w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-event-rsvp=""
                  data-end={toUnix(event.end ?? event.start) ?? 0}
                >
                  {event.buttonText || "RSVP"}
                </a>
              ) : (
                <span className="btn btn-outline w-full opacity-60 cursor-not-allowed">Closed</span>
              )}
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
