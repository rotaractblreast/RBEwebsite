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
    const { year, month } = postDateParts(post, ["year", "month"]);
    if (year && month) keys.add(`${year}/${month}`);
  }
  return [...keys].map((key) => {
    const [year, month] = key.split("/");
    return { year, month };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}): Promise<Metadata> {
  const { year, month } = await params;
  const sample = new Date(`${year}-${month}-01T12:00:00+05:30`);
  const title = sample.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  });
  return {
    title: `${title} - News`,
    description: `Read community news, service projects, and club stories from ${title} by Rotaract Bangalore East.`,
  };
}

export default async function NewsMonthArchivePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const posts = await getPosts();
  const filtered = posts.filter((p) => {
    const parts = postDateParts(p, ["year", "month"]);
    return parts.year === year && parts.month === month;
  });

  if (filtered.length === 0) notFound();

  const sample = new Date(`${year}-${month}-01T12:00:00+05:30`);
  const title = sample.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
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
