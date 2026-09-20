import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { Pagination } from "@/components/Pagination";
import { getPosts } from "@/lib/content";
import { postDateParts } from "@/lib/paths";
import { POSTS_PER_PAGE } from "@/lib/site";
import type { Post } from "@/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  const params: Array<{ year: string }> = [];

  // 1. Years
  const years = [...new Set(posts.map((p) => postDateParts(p, ["year"]).year))];
  for (const y of years) {
    if (y) params.push({ year: y });
  }

  // 2. Categories
  const categories = new Set<string>();
  for (const p of posts) {
    for (const c of p.categories ?? []) {
      if (c?.slug) categories.add(c.slug);
    }
  }
  for (const cat of categories) {
    params.push({ year: cat });
  }

  // 3. Tags (prefixed with tag-)
  const tags = new Set<string>();
  for (const p of posts) {
    for (const t of p.tags ?? []) {
      if (t?.slug) tags.add(t.slug);
    }
  }
  for (const t of tags) {
    params.push({ year: `tag-${t}` });
  }

  // 4. Pagination (page-2, page-3, ...)
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  for (let i = 2; i <= totalPages; i++) {
    params.push({ year: `page-${i}` });
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year: slug } = await params;
  const posts = await getPosts();

  // Case A: Pagination
  if (/^page-\d+$/i.test(slug)) {
    const pageNum = parseInt(slug.replace(/^page-/i, ""), 10);
    return {
      title: `News - Page ${pageNum}`,
      description: "News and updates from Rotaract Bangalore East.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Case B: Tag Archive
  if (/^tag-.+$/i.test(slug)) {
    const tagSlug = slug.replace(/^tag-/i, "").toLowerCase();
    let tagTitle = tagSlug;
    for (const p of posts) {
      const found = (p.tags ?? []).find((t) => t.slug === tagSlug);
      if (found?.title) {
        tagTitle = found.title;
        break;
      }
    }
    return {
      title: `Tag: ${tagTitle}`,
      description: `Explore news stories, service initiatives, and project updates tagged "${tagTitle}" from Rotaract Bangalore East.`,
    };
  }

  // Case C: Year Archive
  if (/^\d{4}$/.test(slug)) {
    return {
      title: `${slug} - News`,
      description: `Browse news updates, service milestones, and club activities from ${slug} by Rotaract Bangalore East.`,
    };
  }

  // Case D: Category Archive
  let title = slug;
  for (const p of posts) {
    const cat = (p.categories ?? []).find((c) => c.slug === slug);
    if (cat?.title) {
      title = cat.title;
      break;
    }
  }

  return {
    title: `${title} - News`,
    description: `Browse news updates, service milestones, and club activities from ${title} by Rotaract Bangalore East.`,
  };
}

export default async function NewsArchiveDispatcherPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: slug } = await params;
  const posts = await getPosts();

  // 1. Pagination (/news/page-2/, /news/page-3/, etc.)
  if (/^page-\d+$/i.test(slug)) {
    const pageNum = parseInt(slug.replace(/^page-/i, ""), 10);
    const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
    if (isNaN(pageNum) || pageNum < 2 || pageNum > totalPages) notFound();

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

  // 2. Tag Archive (/news/tag-:slug/)
  if (/^tag-.+$/i.test(slug)) {
    const tagSlug = slug.replace(/^tag-/i, "").toLowerCase();
    const filtered = posts.filter((p) =>
      (p.tags ?? []).some((t) => t.slug === tagSlug)
    );

    if (filtered.length === 0) notFound();

    let tagTitle = tagSlug;
    for (const p of filtered) {
      const found = (p.tags ?? []).find((t) => t.slug === tagSlug);
      if (found?.title) {
        tagTitle = found.title;
        break;
      }
    }

    const title = `Tag: ${tagTitle}`;

    return (
      <>
        <PageHero title={title} eyebrow="News archive" />
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "News", href: "/news/" },
            { label: tagTitle },
          ]}
        />
        <section className="section-pad">
          <div className="wrap">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <CardPost key={post._id} post={post} />
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  // 3. Year Archive (/news/2026/, /news/2025/, etc.)
  if (/^\d{4}$/.test(slug)) {
    const matchingPosts = posts.filter((p) => postDateParts(p, ["year"]).year === slug);
    if (matchingPosts.length === 0) notFound();

    return (
      <>
        <PageHero title={slug} eyebrow="News archive" />
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "News", href: "/news/" },
            { label: slug },
          ]}
        />
        <section className="section-pad">
          <div className="wrap">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchingPosts.map((post) => (
                <CardPost key={post._id} post={post} />
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  // 4. Category Archive (/news/community-service/, /news/club-service/, etc.)
  const matchingPosts = posts.filter((p) =>
    (p.categories ?? []).some((c) => c.slug === slug)
  );

  if (matchingPosts.length === 0) notFound();

  let title = slug;
  for (const p of matchingPosts) {
    const cat = (p.categories ?? []).find((c) => c.slug === slug);
    if (cat?.title) {
      title = cat.title;
      break;
    }
  }

  return (
    <>
      <PageHero title={title} eyebrow="News archive" />
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          { label: "News", href: "/news/" },
          { label: title },
        ]}
      />
      <section className="section-pad">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingPosts.map((post) => (
              <CardPost key={post._id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
