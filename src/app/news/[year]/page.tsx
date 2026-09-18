import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { getPosts } from "@/lib/content";
import { postDateParts } from "@/lib/paths";
import type { Post } from "@/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  const params: Array<{ year: string }> = [];

  const years = [...new Set(posts.map((p) => postDateParts(p, ["year"]).year))];
  for (const y of years) {
    if (y) params.push({ year: y });
  }

  const bySlug = new Set<string>();
  for (const p of posts) {
    for (const c of p.categories ?? []) {
      if (c?.slug) bySlug.add(c.slug);
    }
  }
  for (const cat of bySlug) {
    params.push({ year: cat });
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const posts = await getPosts();

  let title = year;
  for (const p of posts) {
    const cat = (p.categories ?? []).find((c) => c.slug === year);
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

export default async function NewsYearOrCategoryPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const posts = await getPosts();

  const isYear = /^\d{4}$/.test(year);
  let matchingPosts: Post[] = [];
  let title = year;

  if (isYear) {
    matchingPosts = posts.filter((p) => postDateParts(p, ["year"]).year === year);
  } else {
    matchingPosts = posts.filter((p) =>
      (p.categories ?? []).some((c) => c.slug === year)
    );
    for (const p of matchingPosts) {
      const cat = (p.categories ?? []).find((c) => c.slug === year);
      if (cat?.title) {
        title = cat.title;
        break;
      }
    }
  }

  if (matchingPosts.length === 0) notFound();

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
