import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { Pagination } from "@/components/Pagination";
import { getPosts } from "@/lib/content";
import { POSTS_PER_PAGE } from "@/lib/site";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  return {
    title: `News - page ${n}`,
    description: "News and updates from Rotaract Bangalore East.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function NewsArchivePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const pageNum = parseInt(n, 10);
  if (isNaN(pageNum) || pageNum < 2) notFound();

  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  if (pageNum > totalPages) notFound();

  const slice = posts.slice((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE);

  return (
    <>
      <PageHero
        title="News & Updates"
        eyebrow="Stories from Easterners"
        lead="Projects, fellowship, and impact from Rotaract Bangalore East."
        showSearchLink
      />
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "News", href: "/news/" },
          { label: `Page ${pageNum}` },
        ]}
      />
      <section className="section-pad">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {slice.map((post) => (
              <CardPost key={post._id} post={post} />
            ))}
          </div>
          <Pagination page={pageNum} totalPages={totalPages} />
        </div>
      </section>
    </>
  );
}
