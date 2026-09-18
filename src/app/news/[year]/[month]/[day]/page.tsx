import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CardPost } from "@/components/CardPost";
import { getPosts } from "@/lib/content";
import { postDateParts } from "@/lib/paths";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  const keys = new Set<string>();
  for (const post of posts) {
    const { year, month, day } = postDateParts(post);
    if (year && month && day) keys.add(`${year}/${month}/${day}`);
  }
  return [...keys].map((key) => {
    const [year, month, day] = key.split("/");
    return { year, month, day };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string }>;
}): Promise<Metadata> {
  const { year, month, day } = await params;
  const sample = new Date(`${year}-${month}-${day}T12:00:00+05:30`);
  const title = sample.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return {
    title: `${title} - News`,
    description: `News archive: ${title}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function NewsDayArchivePage({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string }>;
}) {
  const { year, month, day } = await params;
  const posts = await getPosts();
  const filtered = posts.filter((p) => {
    const parts = postDateParts(p);
    return parts.year === year && parts.month === month && parts.day === day;
  });

  if (filtered.length === 0) notFound();

  const sample = new Date(`${year}-${month}-${day}T12:00:00+05:30`);
  const title = sample.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHero title={title} eyebrow="News archive" />
      <Breadcrumbs
        crumbs={[{ label: "Home", href: "/" }, { label: "News", href: "/news/" }, { label: title }]}
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
