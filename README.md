# Rotaract Bangalore East

[![Netlify Status](https://api.netlify.com/api/v1/badges/d4f68392-a404-44af-bcae-4ebd807ff1d1/deploy-status)](https://app.netlify.com/projects/rotaractblreast/deploys)

Official website of [Rotaract Bangalore East](https://rotaractblreast.org) — built with **Next.js 15 App Router**, content managed in **Sanity**, and deployed on **Netlify** with On-Demand Incremental Static Regeneration (ISR).

**UNITE · RISE · EMPOWER** · Brand orange `#ff9000`

## Features

- News, events, causes, and team managed in Sanity Studio embedded at `/admin`
- On-Demand Incremental Static Regeneration (ISR): live editorial updates in <1s with 0 Netlify build minutes
- Native Sanity GROQ search (`/api/search/` and `/search/` modal) — zero third-party service cost
- Join form and newsletter → Google Apps Script + Sheets (`NEXT_PUBLIC_FORMS_API_URL`), both confirming inline with no redirect; contact is details-only
- Dynamic event state transitions: automatically flips to "Past Event" in real time without rebuilds
- Dynamic XML sitemap (`/sitemap.xml`) and RSS feed (`/rss.xml`)
- Brand kit and club info from lightweight YAML + static assets
- Standalone Reviewer PWA portal in `connect-portal/` for independent deployment

## Quick start

```bash
cp .env.example .env
# Public Sanity settings are pre-configured with fallbacks, ready out of the box!
# Optional: SANITY_API_WRITE_TOKEN only if you run migration/repair scripts

npm install
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:3000/ | Public site |
| http://localhost:3000/admin/ | Sanity Studio |

## Content model

| Content | Where it lives |
|---------|----------------|
| News, events, causes, team, categories, tags | Sanity |
| Site settings, contact, home/about copy | `_data/info.yml` |
| Join FAQ | `_data/join_faq.yml` |
| Brand kit | `_data/brandkit.yml` + `public/images/brandkit/` |

Sanity is the source of truth for editorial content. Do not set `USE_FS_CONTENT=1` on Netlify.

## Editing content (`/admin`)

Editors use **Google** via Sanity (not GitHub).

1. Create a [Sanity](https://www.sanity.io) account (Google login is fine).
2. Ask a club admin to invite you to the project (Editor role).
3. Open [rotaractblreast.org/admin/](https://rotaractblreast.org/admin/) and sign in.
4. Use **Content**, **Media**, and **Query** (Vision) in the Studio toolbar.
5. Publish — a Sanity webhook invokes `/api/revalidate/` so changes go live in <1s across the global CDN.

Images live in Studio **Media** (Sanity CDN), not in the Git repo.

Ops setup for publish → webhook: see [`SANITY-NETLIFY.md`](./SANITY-NETLIFY.md).

## How deploys & ISR work

1. **Code changes:** Full production builds run when code is pushed to the `master` branch.
2. **Content changes:** Editors publishing in Sanity trigger `/api/revalidate/`. Next.js executes `revalidatePath(...)` to refresh edge cache nodes instantly with **0 build minutes**.
3. **Event conclusion:** Progressively enhanced on the client using timestamps, flipping to past state dynamically without requiring scheduled builds.

## Stack

- [Next.js 15+](https://nextjs.org) (App Router, Turbopack, ISR) + Tailwind CSS 3
- [Sanity](https://www.sanity.io) Studio embedded with `next-sanity`
- Native Sanity GROQ search
- Netlify (CDN, headers, redirects via `@netlify/plugin-nextjs`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build & static pre-rendering |
| `npm run start` | Start production server locally |
| `npm run purge:orphans` | List unused Sanity assets (dry-run) |
| `npm run repair:studio` | Sanity data repair script |

## Deploy (Netlify)

Build command and publish directory are defined in `netlify.toml`:

```text
npm run build
→ publish: .next
```

Netlify builds with `@netlify/plugin-nextjs`.
Public Sanity project settings live in `netlify.toml` `[build.environment]`. Keep `SANITY_API_WRITE_TOKEN` out of Netlify — it is only for local maintenance scripts.

Redirects stay minimal (legacy hosts, `/teamadmin` → `/admin/`, `/feed.xml` → `/rss.xml`). Do not add forced trailing-slash redirects; Next.js manages trailing slashes natively with `trailingSlash: true`.

## Contributing

Issues and pull requests are welcome. For agent / maintainer context (architecture pitfalls, env rules, rebuild hooks), see [`AGENTS.md`](./AGENTS.md). Production ship checklist: [`SHIP-CRITERIA.md`](./SHIP-CRITERIA.md).

## License / club

Website of Rotaract Bangalore East. Brand assets and club marks remain club property; code contributions follow the repository’s license and contribution norms.
