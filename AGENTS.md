# AGENTS.md — Rotaract Bangalore East website

Persistent guidance for coding agents working in this repository.
Prefer this file over chat history when resuming work.

## Project

- **Site:** [rotaractblreast.org](https://rotaractblreast.org)
- **Repo:** open-source club website for Rotaract Bangalore East
- **Hosting:** Netlify (production branch: `master`)
- **CMS:** Sanity Studio embedded at `/admin` (Google login; editors do not need GitHub)

## Stack (current)

- **Astro 5** static site (`output: "static"`, `trailingSlash: "always"`)
- **Tailwind 3** with RBE design tokens (`#ff9000` brand orange)
- **Sanity 3** via `@sanity/astro` + React Studio
- **Pagefind** search (built into `npm run build`)
- **RSS** (`/rss.xml`), **sitemap**, Apps Script + Sheets for join/subscribe (contact page is details-only)

Jekyll, Decap, and Git Gateway are **gone**. Do not reintroduce them.

## Content sources

| Content | Source of truth |
|--------|------------------|
| News (`post`), events, causes, team, categories, tags | **Sanity** |
| Site settings / contact / home copy | `_data/info.yml` |
| Join FAQ | `_data/join_faq.yml` |
| Brand kit metadata | `_data/brandkit.yml` + `public/images/brandkit/` |
| Site chrome images | `public/images/site/`, `public/images/RBELogoHD/` |

- Local upload folders (`public/images/uploads`, `_posts`, `_events`, `_causes`, `_data/team.yml`) were removed after CDN migration.
- `USE_FS_CONTENT=1` is a **local debug-only** escape hatch. Production must leave it unset. `useFs()` in `src/lib/content.ts` returns true only when that flag is `"1"` — a missing Sanity project id must **not** fall back to deleted FS collections.

## Environment

| Variable | Where | Notes |
|----------|--------|--------|
| `PUBLIC_SANITY_PROJECT_ID` | Netlify build + local `.env` | Public; also pinned in `netlify.toml` |
| `PUBLIC_SANITY_DATASET` | Netlify build + local `.env` | Usually `production` |
| `PUBLIC_FORMS_API_URL` | Netlify build + local `.env` | Public Apps Script `/exec` URL; pinned in `netlify.toml` |
| `SANITY_API_WRITE_TOKEN` | **Local `.env` only** | Migration/repair/purge scripts — never commit, never put on Netlify |
| `USE_FS_CONTENT` | Optional local only | Do not set on Netlify |

`.env` is gitignored. Use `.env.example` as the template.

## Build & deploy

```text
npm run build   →   publish dist
```

Defined in `netlify.toml`. Netlify’s dependency phase already runs `npm ci` (cached) from `package-lock.json` — do not put `npm ci` in the build command. Node 20.

### Rebuild triggers (both needed)

1. **Sanity publish → Netlify build hook** — so Studio edits go live without Git. See `SANITY-NETLIFY.md`.
2. **Daily scheduled build** — upcoming / ongoing / past event buckets are computed at **build time** (`src/lib/events.ts` → `nowStamp()`). Without a daily rebuild, ended events stay “upcoming” until the next deploy.

This is a **static** site: visitors never hit Sanity at request time. HTML is baked at build.

## Studio / markdown

- Custom body editor: `src/studio/MarkdownBodyInput.tsx` (+ `markdownEditor.css`)
- Wired via `markdownSchema({ input: MarkdownBodyInput })` in `sanity.config.ts`
- Images: preview dialog (alt + caption) → upload to Sanity Media → insert full CDN URL
- Public markdown: `src/lib/markdown.ts` + `.prose-rbe` in `src/styles/global.css`
- Schema types: `schemaTypes/` (`post`, `event`, `cause`, `team`, `category`, `tag`)

## Netlify redirects — hard rule

**Never** add trailing-slash force redirects like:

```toml
from = "/about"
to = "/about/"
force = true
```

Netlify matches both `/about` and `/about/`, which causes `ERR_TOO_MANY_REDIRECTS`. Astro already emits `about/index.html`; Netlify serves `/about/` natively.

Keep redirects **minimal and critical**, for example:

- Legacy host → primary domain (`*.netlify.com`, old domains if still in use)
- `/teamadmin` → `/admin/`
- `/feed.xml` → `/rss.xml`

Do not pile on “compatibility” slash or category redirects unless there is a measured need.

## Key paths

```text
src/pages/           Public routes
src/components/      UI
src/lib/content.ts   Sanity (and optional FS) content API
src/lib/events.ts    Event state: upcoming | ongoing | past
src/studio/          Studio UI customizations
schemaTypes/         Sanity schemas
scripts/             migrate / repair / purge / QA (local)
_data/               Static YAML (not in Studio)
public/              Static assets + Pagefind output sync
netlify.toml         Build, headers, redirects
```

## Scripts agents may run

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local site + Studio |
| `npm run build` | Production build + Pagefind + IndexNow (prod) |
| `npm run qa` | `scripts/qa-astro.sh` |
| `npm run indexnow` | Submit canonical URLs to IndexNow API (Bing/Yandex) |
| `npm run purge:orphans` | Dry-run unused Sanity assets |
| `npm run repair:studio` | One-off data repairs (needs write token) |

Do **not** run destructive purge/delete or write migrations unless the user asks.

## Agent working agreements

- **Do not commit or push** unless the user explicitly asks.
- Prefer small, focused diffs; match existing Astro/Tailwind/RBE patterns.
- After content/architecture changes, verify `npm run build` (and smoke `/`, `/news/`, `/events/`, `/about/`, `/admin/`).
- Keep public docs (`README.md`) accurate for open-source readers; keep this file as the agent ops memory.
- Ship checklist: `SHIP-CRITERIA.md`.

## Forms / Google Apps Script

- Google Forms POSTs have been replaced by Apps Script + Sheets: `google-apps-script/forms-api/`. No form on the site posts to `docs.google.com` any more.
- One **spreadsheet-bound** Web App (Extensions → Apps Script from the Sheet — uses `getActiveSpreadsheet()`, no `SPREADSHEET_ID`). Three tabs: Join / Newsletter / Contact.
- Emails only for **join** (club + applicant). Newsletter/contact: store only. Config is the `CONFIG` object at the top of `Code.gs` (club notify, reply-to, from-name, soft origins) — not Script Properties. No form secret. Applicant thank-you always sets Reply-To to the club inbox(es); MailApp From is the script owner and must not be the reply target.
- Join emails are multipart: branded HTML (`applicantConfirmHtml_`, `clubNotifyHtml_`, shared `emailShell_`) plus plain-text fallback (`*Body_`). Edit both when changing copy. Table-based inline-styled markup only — email clients drop `<style>` and flex/grid. Escape all applicant input with `esc_()` / `nl2br_()`. Applicant mail CCs the club and replies to the club; club mail replies to the applicant.
- **Contact page:** form removed — details + social only (anti-spam).
- **No redirects on submit.** `/thankyou` is **deleted**; both forms confirm **inline** on the same page (a 301 `/thankyou` → `/` remains in `netlify.toml` for old links). Do not reintroduce a thank-you page or a hidden-iframe Google Form target.
- **Join form** (`src/pages/join.astro`) is a self-contained Astro form. With `PUBLIC_FORMS_API_URL` unset it validates and shows a preview thank-you panel. With the URL set it POSTs to Apps Script and only shows thank-you after `{ ok: true }`. Order: Get in touch → What you do → A bit about you → Your Rotaract story → Interests. Two branch radios (`occupation`, `rotaractStatus`) reveal conditional fields. Markup carries honeypot (`website`) and page-load timestamp (`t`).
- **Newsletter** (`src/components/Subscribe.astro`, rendered by `BaseLayout` on every page) POSTs `{ form: "newsletter", email, website, t }` to the same Web App and swaps the form for an inline confirmation. It re-arms `t` on email focus when the stamp is older than 30 min (and on bfcache restore), because a footer form can sit in an idle tab past the API's 2h staleness window.
- `Code.gs` matches the join payload: `name, email, phone, dob, gender, address, social, organizationType, organization, rotaractStatus, why, clubName, journey, hobbies, contribute, contributeOther`. Always send every key (`""` for the inactive branch) so Sheet columns stay stable, and never collapse `\n` in textarea values. Responses are `{ ok, status, form?, error? }` — gate thank-you on `ok === true && status === 200` (Apps Script cannot set real HTTP status).
- **Reviewer Dashboard (`/connect` & `Dashboard.gs`):** Independent portal at `/connect` (`noindex`, disallowed in `robots.txt`, omitted from sitemap). Uses `Dashboard.gs` in the same Apps Script project via a 3-line `body.action` dispatch in `Code.gs`. Authenticates reviewers against `Reviewers` sheet tab (`Email`, `Password`, `Name`, `Role`, `Active`). Reads `Join`, `Newsletter`, and `Contact`. Enables updating applicant `Status` (Col T) and adding `Notes` (Col U with reviewer attribution/timestamp) and exporting UTF-8 CSVs. **Strict rule:** Dashboard actions are storage-only and never trigger outgoing emails. Public nomination/join flow remains untouched.

## Recent cutover memory (2026-07)

- Migrated from Jekyll + Git-based CMS to Astro + Sanity.
- Merged to `master` via PR; production is Sanity-only.
- Production failures seen and fixed/understood:
  1. Missing `PUBLIC_SANITY_*` on Netlify → build fell back / threw → pin in `netlify.toml`.
  2. Trailing-slash `force` redirects → redirect loops on `/about/` etc. → remove those rules.
- Local uncommitted / in-flight: slimmed `netlify.toml` redirects (confirm before commit).
- Still required ops for editors: Sanity webhook → Netlify build hook; keep daily build for event dates.
