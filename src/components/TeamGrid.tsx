"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { TeamMember } from "@/lib/types";
import { SocialIcon } from "./SocialIcon";

interface Props {
  team: TeamMember[];
  preview?: number;
}

const socialNetworks = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "facebook", label: "Facebook" },
] as const;

type MemberLink = {
  network: (typeof socialNetworks)[number]["key"];
  label: string;
  href: string;
};

function initial(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || name;
  return last.slice(0, 1).toUpperCase();
}

function teamPhoto(url: string) {
  if (!url.includes("cdn.sanity.io")) return url;
  return `${url}?w=600&h=800&fit=crop&crop=top&auto=format`;
}

function memberLinks(social: TeamMember["social"]): MemberLink[] {
  const links = social ?? {};
  return socialNetworks
    .filter((net) => links[net.key])
    .map((net) => ({ network: net.key, label: net.label, href: links[net.key] as string }));
}

export function TeamGrid({ team, preview = 7 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  if (!team || team.length === 0) {
    return (
      <div className="text-center max-w-md mx-auto mb-10">
        <p className="text-on-surface-variant mb-4">Team roster coming soon.</p>
        <Link href="/join/" className="btn btn-primary">
          Join Us
        </Link>
      </div>
    );
  }

  const visibleMembers = expanded ? team : team.slice(0, preview);

  return (
    <>
      <div
        id="team-grid"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-8"
      >
        {visibleMembers.map((member) => {
          const memberId = member._id || member.name;
          const links = memberLinks(member.social);
          const hasLinks = links.length > 0 || Boolean(member.social?.email);
          const isOpen = openCardId === memberId;

          return (
            <article
              key={memberId}
              onClick={() => {
                if (hasLinks) {
                  setOpenCardId(isOpen ? null : memberId);
                }
              }}
              className={`team-card group relative overflow-hidden rounded-xl bg-surface-container-high transition-all duration-300 ${
                isOpen ? "is-open -translate-y-1 shadow-xl" : "hover:-translate-y-1 hover:shadow-xl"
              }`}
            >
              {member.image ? (
                <img
                  src={teamPhoto(member.image)}
                  alt=""
                  className="aspect-[3/4] w-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                  width="600"
                  height="800"
                />
              ) : (
                <div
                  className="aspect-[3/4] w-full flex items-center justify-center bg-primary-container font-display text-5xl font-bold text-on-primary-container"
                  aria-hidden="true"
                >
                  {initial(member.name)}
                </div>
              )}

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent"
                aria-hidden="true"
              />

              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                <div
                  className={`team-plate rounded-lg px-2.5 py-2.5 text-center sm:px-3 backdrop-blur-sm transition-colors duration-300 ${
                    isOpen ? "bg-ink/80" : "bg-ink/45 group-hover:bg-ink/80"
                  }`}
                >
                  <h3 className="font-display text-sm sm:text-base font-semibold leading-snug text-white">
                    {member.featurelink ? (
                      <a
                        href={member.featurelink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {member.name}
                      </a>
                    ) : (
                      member.name
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs leading-snug text-white/85">{member.role}</p>
                  {member.memberSince && (
                    <p className="mt-1 text-[11px] leading-snug text-white/65">
                      Member since {member.memberSince}
                    </p>
                  )}

                  {hasLinks && (
                    <div
                      className={`team-reveal overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-16 opacity-100 mt-2" : "max-h-0 opacity-0 group-hover:max-h-16 group-hover:opacity-100 group-hover:mt-2"
                      }`}
                    >
                      <div className="flex justify-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        {links.map((link) => (
                          <a
                            key={link.network}
                            href={link.href}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on ${link.label}`}
                          >
                            <SocialIcon network={link.network} className="h-4 w-4" />
                          </a>
                        ))}
                        {member.social?.email && (
                          <a
                            href={`mailto:${member.social.email}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                            aria-label={`Email ${member.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                              mail
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        <Link
          href="/join/"
          className="group relative flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-container/60 bg-surface-container-low/60 p-3 text-center transition-colors hover:border-primary-container hover:bg-primary-container/10"
        >
          <span
            className="material-symbols-outlined mb-1 text-3xl text-primary transition-transform group-hover:scale-110"
            aria-hidden="true"
          >
            person_add
          </span>
          <span className="font-display text-sm font-semibold text-on-surface">Join the team</span>
          <span className="mt-1 text-xs text-on-surface-variant">Become an Easterner</span>
        </Link>
      </div>

      {team.length > preview && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="btn btn-outline text-sm touch-target"
            aria-expanded={expanded}
            aria-controls="team-grid"
          >
            {expanded ? "Show fewer" : `Show all ${team.length} members`}
          </button>
        </div>
      )}
    </>
  );
}
