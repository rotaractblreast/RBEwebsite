"use client";

import React, { useState } from "react";
import type { BrandKitGroup } from "@/lib/types";

interface Props {
  groups: BrandKitGroup[];
}

export function BrandKitGallery({ groups }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const activeGroupName =
    selectedGroup === "all"
      ? "All assets"
      : groups.find((_, i) => `group-${i + 1}` === selectedGroup)?.groupName || "Assets";

  const visibleAssets =
    selectedGroup === "all"
      ? groups.flatMap((g, gi) => g.items.map((item) => ({ ...item, groupName: g.groupName, groupKey: `group-${gi + 1}` })))
      : groups
          .filter((_, i) => `group-${i + 1}` === selectedGroup)
          .flatMap((g, gi) => g.items.map((item) => ({ ...item, groupName: g.groupName, groupKey: `group-${gi + 1}` })));

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-8 -mx-4 px-4 md:mx-0 md:px-0">
        <div
          className="flex flex-nowrap gap-2 overflow-x-auto pb-2 snap-x"
          role="tablist"
          aria-label="Brand kit groups"
        >
          <button
            type="button"
            onClick={() => setSelectedGroup("all")}
            className={`btn text-sm py-2 touch-target shrink-0 snap-start transition-colors ${
              selectedGroup === "all"
                ? "bg-primary-container text-on-primary-container font-bold"
                : "btn-outline text-on-surface hover:bg-surface-container-low"
            }`}
            aria-pressed={selectedGroup === "all"}
          >
            All
          </button>
          {groups.map((g, i) => {
            const key = `group-${i + 1}`;
            const isActive = selectedGroup === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGroup(key)}
                className={`btn text-sm py-2 touch-target shrink-0 snap-start whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "btn-outline text-on-surface hover:bg-surface-container-low"
                }`}
                aria-pressed={isActive}
              >
                {g.groupName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Heading & Count */}
      <div className="mb-8">
        <h2 className="font-display text-headline-md">{activeGroupName}</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Showing {visibleAssets.length} of {total} assets
        </p>
      </div>

      {/* Gallery Grid */}
      {visibleAssets.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleAssets.map((asset, i) => (
            <article key={i} className="card overflow-hidden flex flex-col">
              <div
                className={`aspect-square flex items-center justify-center p-6 ${
                  asset.white ? "bg-on-surface" : "bg-surface-muted"
                }`}
              >
                <img
                  src={asset.previewUrl}
                  alt={asset.title}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="label-caps mb-2 text-[11px]">{asset.groupName}</p>
                <h3 className="font-display font-semibold text-on-surface mb-1">{asset.title}</h3>
                <p className="text-sm text-on-surface-variant mb-4 flex-1">{asset.description}</p>
                <div className="flex gap-4 pt-2 border-t border-outline-variant/20">
                  <a
                    href={asset.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    View
                  </a>
                  <a
                    href={asset.fileUrl}
                    download={asset.title}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Download
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-center text-on-surface-variant py-12">No assets in this group.</p>
      )}
    </div>
  );
}
