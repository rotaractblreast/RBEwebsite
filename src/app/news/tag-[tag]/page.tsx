import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { getPosts } from "@/lib/content";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  const bySlug = new Set<string>();
  for (const p of posts) {
    for (const t of p.tags ?? []) {
      if (t?.slug) bySlug.add(t.slug);
    }
  }
  return [...bySlug].map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const posts = await getPosts();
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

export default async function TagArchivePage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: tagSlug } = await params;
  const posts = await getPosts();
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
