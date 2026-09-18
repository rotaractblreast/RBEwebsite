import React from "react";

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: Props) {
  if (!crumbs || crumbs.length === 0) return null;

  return (
    <nav className="wrap py-4 text-sm text-on-surface-variant" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <li aria-hidden="true">/</li>}
            <li
              className={
                c.href ? undefined : "text-on-surface font-medium truncate max-w-[16rem]"
              }
              aria-current={c.href ? undefined : "page"}
            >
              {c.href ? (
                <a href={c.href} className="hover:text-primary">
                  {c.label}
                </a>
              ) : (
                c.label
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
