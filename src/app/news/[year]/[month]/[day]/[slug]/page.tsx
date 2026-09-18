import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MarkdownBody } from "@/components/MarkdownBody";
import { Share } from "@/components/Share";
import { getPosts } from "@/lib/content";
import { formatDate } from "@/lib/events";
import { newsCategoryPath, postDateParts } from "@/lib/paths";
import { SITE } from "@/lib/site";
import { breadcrumbListJsonLd, newsArticleJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => {
    const parts = postDateParts(post);
    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      slug: post.slug,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};

  const fallbackPostSummary = `${post.title} - News story and community project update from Rotaract Bangalore East (Easterners).`;
  const postDescription = (post.description || fallbackPostSummary).trim();

  return {
    title: post.title,
    description: postDescription,
    openGraph: {
      title: post.title,
      description: postDescription,
      url: post.url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      images: post.image ? [{ url: post.image, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: postDescription,
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function NewsPostDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const post = posts[index];
  const prev = posts[index + 1] ?? null;
  const next = posts[index - 1] ?? null;

  const authorName = SITE.title;
  const categories = (post.categories ?? []).filter((c) => c?.slug);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "News", href: "/news/" },
    { label: post.title },
  ];
  const fallbackPostSummary = `${post.title} - News story and community project update from Rotaract Bangalore East (Easterners).`;
  const postDescription = (post.description || fallbackPostSummary).trim();
  const jsonLd = [
    newsArticleJsonLd({
      title: post.title,
      description: postDescription,
      url: post.url,
      publishedAt: post.publishedAt,
      image: post.image,
    }),
    breadcrumbListJsonLd(crumbs),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero title={post.title} eyebrow="News" hideTitle background={false} />
      <Breadcrumbs crumbs={crumbs} />
      <article className="section-pad pt-0">
        <div className="wrap max-w-3xl">
          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              className="w-full rounded-lg mb-8 aspect-[16/9] object-cover"
              width={1200}
              height={675}
            />
          )}
          <p className="text-metadata text-on-surface-variant mb-3">
            {formatDate(post.publishedAt)}
            {authorName ? ` · ${authorName}` : ""}
          </p>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" aria-label="Categories">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={newsCategoryPath(cat.slug)}
                  className="text-xs uppercase tracking-wider border border-outline-variant/60 text-on-surface px-2.5 py-1 rounded-full font-semibold hover:border-primary hover:text-primary"
                >
                  {cat.title}
                </Link>
              ))}
            </div>
          )}
          <h1 className="font-display text-headline-lg text-on-surface mb-6">{post.title}</h1>
          <MarkdownBody markdown={post.bodyMarkdown} />
          <Share url={post.url} title={post.title} tags={post.tags} />
          <div className="flex justify-between gap-4 mt-10 pt-8 border-t border-outline-variant/40">
            {prev ? (
              <Link href={prev.url} className="btn btn-outline text-sm">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.url} className="btn btn-outline text-sm">
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}
