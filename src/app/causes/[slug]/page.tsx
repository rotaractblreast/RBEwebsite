import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MarkdownBody } from "@/components/MarkdownBody";
import { Share } from "@/components/Share";
import { getCauses } from "@/lib/content";
import { formatDate } from "@/lib/events";
import { formatInrCurrency } from "@/lib/format";
import { breadcrumbListJsonLd, causeWebPageJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const causes = await getCauses();
  return causes
    .filter((cause) => !/^page-\d+$/i.test(cause.slug))
    .map((cause) => ({ slug: cause.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const causes = await getCauses();
  const cause = causes.find((c) => c.slug === slug);
  if (!cause) return {};

  const fallbackCauseSummary = `${cause.title} - A community service and social impact cause by Rotaract Bangalore East in Bengaluru.`;
  const summary = (cause.description || cause.intro || fallbackCauseSummary).trim();

  return {
    title: cause.title,
    description: summary,
    openGraph: {
      title: cause.title,
      description: summary,
      url: cause.url,
      type: "website",
      images: cause.image ? [{ url: cause.image, alt: cause.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: cause.title,
      description: summary,
      images: cause.image ? [cause.image] : [],
    },
  };
}

export default async function CauseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const causes = await getCauses();
  const cause = causes.find((c) => c.slug === slug);
  if (!cause) notFound();

  const dueLabel = cause.due
    ? formatDate(cause.due, { month: "short", day: "numeric", year: "numeric" })
    : "Ongoing";
  const fallbackCauseSummary = `${cause.title} - A community service and social impact cause by Rotaract Bangalore East in Bengaluru.`;
  const summary = (cause.description || cause.intro || fallbackCauseSummary).trim();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Causes", href: "/causes/" },
    { label: cause.title },
  ];
  const jsonLd = [
    causeWebPageJsonLd({
      title: cause.title,
      description: summary,
      url: cause.url,
      image: cause.image,
      donationLink: cause.donationLink,
    }),
    breadcrumbListJsonLd(crumbs),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero title={cause.title} eyebrow={cause.focus || "Cause"} background={false} />
      <Breadcrumbs crumbs={crumbs} />
      <article className="section-pad pt-0">
        <div className="wrap grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {cause.image && (
              <img
                src={cause.image}
                alt={cause.title}
                className="w-full rounded-lg mb-8 aspect-[16/9] object-cover"
                width={1200}
                height={675}
              />
            )}
            {cause.intro && <p className="text-body-lg text-on-surface-variant mb-6">{cause.intro}</p>}
            <MarkdownBody markdown={cause.bodyMarkdown || cause.description} />
            <Share url={cause.url} title={cause.title} />
          </div>
          <aside className="lg:col-span-1">
            <div className="card p-6 sticky-panel space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Deadline</span>
                <span className="font-medium">{dueLabel}</span>
              </div>
              {cause.goal != null && Number.isFinite(cause.goal) && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Goal</span>
                  <span className="font-medium">{formatInrCurrency(cause.goal)}</span>
                </div>
              )}
              {cause.progress != null && (
                <div>
                  <div
                    className="progress mb-2"
                    role="progressbar"
                    aria-valuenow={cause.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${cause.progress}%` }} />
                  </div>
                  <p className="text-xs text-on-surface-variant">{cause.progress}% funded</p>
                </div>
              )}
              {cause.donationLink && (
                <a
                  href={cause.donationLink}
                  className="btn btn-primary w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contribute
                </a>
              )}
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
