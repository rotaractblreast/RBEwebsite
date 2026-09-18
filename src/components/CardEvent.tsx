import React from "react";
import Link from "next/link";
import type { EventDoc } from "@/lib/types";
import {
  eventState,
  formatDateCard,
  formatEventCardStart,
  nowStamp,
  toUnix,
} from "@/lib/events";
import { urlForCardImage } from "@/lib/content";

interface Props {
  event: EventDoc;
  now?: number;
}

export function CardEvent({ event, now = nowStamp() }: Props) {
  const state = eventState(event.start, event.end, now);
  const label =
    state === "ongoing" ? "Ongoing" : state === "upcoming" ? "Upcoming" : "Event";
  const cardImage = urlForCardImage(event.image);
  const startUnix = toUnix(event.start) ?? 0;
  const endUnix = toUnix(event.end ?? event.start) ?? startUnix;

  return (
    <article
      className="card card-lift group flex flex-col"
      data-event-card=""
      data-start={startUnix}
      data-end={endUnix}
      data-state={state}
    >
      <Link href={event.url} className="block aspect-[16/10] overflow-hidden bg-surface-container">
        {cardImage && (
          <img
            src={cardImage}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width="750"
            height="420"
          />
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <p className="label-caps mb-2" data-event-badge="">{label}</p>
        {event.start && (
          <p className="text-metadata text-on-surface-variant mb-2">
            {formatEventCardStart(event.start)}
            {event.end ? ` - ${formatDateCard(event.end)}` : ""}
          </p>
        )}
        <h3 className="font-display text-lg font-semibold text-on-surface mb-2">
          <Link href={event.url} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        {event.venue && <p className="text-sm text-on-surface-variant mb-2">{event.venue}</p>}
        {event.intro ? (
          <p className="text-sm text-on-surface-variant line-clamp-3 mb-4 flex-1">
            {event.intro.replace(/<[^>]+>/g, "").slice(0, 120)}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <Link
          href={event.url}
          className="text-metadata text-primary font-bold uppercase tracking-wider mt-auto inline-flex items-center gap-1 group-hover:gap-2 transition-all"
        >
          Learn more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
