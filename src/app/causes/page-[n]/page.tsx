import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardCause } from "@/components/CardCause";
import { Pagination } from "@/components/Pagination";
import { getCauses } from "@/lib/content";
import { causesPagePath } from "@/lib/paths";
import { archivePagePaths, paginateList } from "@/lib/paginate";
import { LIST_PAGE_SIZE } from "@/lib/site";

export const revalidate = 60;

export async function generateStaticParams() {
  const causes = await getCauses();
  const inactive = causes.filter((c) => !c.active);
  const { totalPages } = paginateList(inactive, 1, LIST_PAGE_SIZE);
  return archivePagePaths(totalPages).map((page) => ({ n: String(page) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  return {
    title: `Completed causes - page ${n}`,
    description: "Completed fundraising and service causes from Rotaract Bangalore East.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CausesArchivePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const pageNum = parseInt(n, 10);
  if (isNaN(pageNum) || pageNum < 2) notFound();

  const causes = await getCauses();
  const inactive = causes.filter((c) => !c.active);
  const { totalPages, slice } = paginateList(inactive, pageNum, LIST_PAGE_SIZE);

  if (pageNum > totalPages) notFound();

  return (
    <>
      <PageHero
        title="Completed causes"
        eyebrow="Causes archive"
        lead="Earlier community projects and fundraising from Rotaract Bangalore East."
        showSearchLink
      />
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Causes", href: "/causes/" },
          { label: `Page ${pageNum}` },
        ]}
      />
      <section className="section-pad">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-90">
            {slice.map((cause) => (
              <CardCause key={cause._id} cause={cause} />
            ))}
          </div>
          <Pagination
            page={pageNum}
            totalPages={totalPages}
            basePath="/causes/"
            pageHref={causesPagePath}
          />
        </div>
      </section>
    </>
  );
}
