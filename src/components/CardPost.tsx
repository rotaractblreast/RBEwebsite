import React from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { formatDateCard } from "@/lib/events";
import { newsCategoryPath } from "@/lib/paths";
import { urlForCardImage } from "@/lib/content";

interface Props {
  post: Post;
}

export function CardPost({ post }: Props) {
  const categories = (post.categories ?? []).filter((c) => c?.slug);
  const cardImage = urlForCardImage(post.image);

  return (
    <article className="card card-lift group flex flex-col">
      <Link href={post.url} className="block aspect-[16/10] overflow-hidden bg-surface-container">
        {cardImage && (
          <img
            src={cardImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width="750"
            height="420"
          />
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={newsCategoryPath(cat.slug)}
                className="label-caps text-[10px] hover:underline"
              >
                {cat.title}
              </Link>
            ))}
          </div>
        ) : (
          <p className="label-caps mb-2">News</p>
        )}
        <p className="text-metadata text-on-surface-variant mb-2">{formatDateCard(post.publishedAt)}</p>
        <h3 className="font-display text-lg font-semibold text-on-surface mb-2">
          <Link href={post.url} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {post.description ? (
          <p className="text-sm text-on-surface-variant line-clamp-3 mb-4 flex-1">
            {post.description.replace(/<[^>]+>/g, "").slice(0, 120)}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <Link
          href={post.url}
          className="text-metadata text-primary font-bold uppercase tracking-wider mt-auto inline-flex items-center gap-1 group-hover:gap-2 transition-all"
        >
          Learn more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
