import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import type {
  BrandKitGroup,
  Cause,
  EventDoc,
  Post,
  SiteSettings,
  TeamMember,
} from "./types";
import { normalizePostCategory, normalizePostTag } from "./paths";

const ROOT = process.cwd();

function readDirMd(dir: string) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(abs, f), "utf8");
      const { data, content } = matter(raw);
      return { file: f, data, content: content.trim() };
    });
}

function loadYaml<T>(rel: string): T {
  return yaml.load(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

function postUrl(date: string, slug: string) {
  const d = new Date(String(date).replace(" ", "T"));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `/news/${get("year")}/${get("month")}/${get("day")}/${slug}/`;
}

function slugFromFilename(file: string) {
  return file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function toIsoLocal(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00+05:30`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(" ", "T") + "+05:30").toISOString();
  }
  return s;
}

export function loadPostsFromFs(): Post[] {
  return readDirMd("_posts")
    .map(({ file, data, content }) => {
      const slug = slugFromFilename(file);
      const publishedAt = toIsoLocal(data.date);
      return {
        title: String(data.title ?? slug),
        slug,
        publishedAt,
        image: data.image ? String(data.image) : null,
        categories: Array.isArray(data.categories)
          ? data.categories.map((c: unknown) => normalizePostCategory(String(c)))
          : [],
        tags: Array.isArray(data.tags)
          ? data.tags.map((t: unknown) => normalizePostTag(String(t)))
          : [],
        description: String(data.description ?? ""),
        bodyMarkdown: content,
        url: postUrl(publishedAt, slug),
      } satisfies Post;
    })
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export function loadEventsFromFs(): EventDoc[] {
  return readDirMd("_events")
    .map(({ file, data, content }) => {
      const slug = slugFromFilename(file);
      return {
        title: String(data.title ?? slug),
        slug,
        start: toIsoLocal(data.start),
        end: toIsoLocal(data.end),
        venue: String(data.venue ?? ""),
        buttonOpen: Boolean(data.button_open ?? true),
        buttonText: String(data.button_text ?? ""),
        buttonUrl: String(data.button_url ?? ""),
        image: data.image ? String(data.image) : null,
        intro: String(data.intro ?? ""),
        description: String(data.description ?? ""),
        bodyMarkdown: content,
        url: `/events/${slug}/`,
      } satisfies EventDoc;
    })
    .sort((a, b) => +new Date(b.start) - +new Date(a.start));
}

export function loadCausesFromFs(): Cause[] {
  return readDirMd("_causes").map(({ file, data, content }) => {
    const slug = file.replace(/\.md$/, "");
    const goalRaw = data.goal;
    const goal =
      goalRaw === "---" || goalRaw === "" || goalRaw == null
        ? null
        : Number(goalRaw);
    return {
      title: String(data.title ?? slug),
      slug,
      focus: String(data.focus ?? ""),
      image: data.image ? String(data.image) : null,
      due: data.due ? String(data.due) : null,
      active: Boolean(data.active),
      goal: Number.isFinite(goal as number) ? (goal as number) : null,
      progress: Number(data.progress ?? 0),
      featured: Boolean(data.featured),
      donationLink: data.donation_link ? String(data.donation_link) : null,
      intro: String(data.intro ?? ""),
      description: String(data.description ?? ""),
      bodyMarkdown: content,
      url: `/causes/${slug}/`,
    } satisfies Cause;
  });
}

let cachedSiteSettings: SiteSettings | null = null;
export function loadSiteSettingsFromFs(): SiteSettings {
  if (cachedSiteSettings) return cachedSiteSettings;
  const info = loadYaml<Record<string, unknown>>("_data/info.yml");
  cachedSiteSettings = {
    email: String(info.email ?? ""),
    phone: String(info.phone ?? ""),
    location: String(info.location ?? ""),
    siteSocial: (info.site_social as SiteSettings["siteSocial"]) ?? {},
    coreValues: (info.coreValues as SiteSettings["coreValues"]) ?? [],
    areasOfFocus: (info.areasoffocus as SiteSettings["areasOfFocus"]) ?? [],
  };
  return cachedSiteSettings;
}

let cachedTeam: TeamMember[] | null = null;
export function loadTeamFromFs(): TeamMember[] {
  if (cachedTeam) return cachedTeam;
  const data = loadYaml<{ members?: Array<Record<string, unknown>> }>("_data/team.yml");
  cachedTeam = (data.members ?? []).map((m) => ({
    name: String(m.name ?? ""),
    role: String(m.role ?? ""),
    memberSince: m.member_since ? String(m.member_since) : undefined,
    image: m.image ? String(m.image) : null,
    featurelink: m.featurelink ? String(m.featurelink) : undefined,
    social: (m.social as Record<string, string>) ?? {},
  }));
  return cachedTeam;
}

let cachedJoinFaq: Array<{ question: string; answer: string }> | null = null;
export function loadJoinFaqFromFs(): Array<{ question: string; answer: string }> {
  if (cachedJoinFaq) return cachedJoinFaq;
  const data = loadYaml<unknown>("_data/join_faq.yml");
  if (Array.isArray(data)) {
    cachedJoinFaq = data.map((i: Record<string, string>) => ({
      question: String(i.question ?? ""),
      answer: String(i.answer ?? ""),
    }));
  } else {
    const obj = data as { items?: Array<Record<string, string>> };
    cachedJoinFaq = (obj.items ?? []).map((i) => ({
      question: String(i.question ?? ""),
      answer: String(i.answer ?? ""),
    }));
  }
  return cachedJoinFaq;
}

let cachedBrandKit: BrandKitGroup[] | null = null;
export function loadBrandKitFromFs(): BrandKitGroup[] {
  if (cachedBrandKit) return cachedBrandKit;
  const data = loadYaml<{
    groups?: Array<{
      group_name: string;
      items_list?: Array<{
        title: string;
        description: string;
        preview: string;
        file: string;
        white?: boolean;
      }>;
    }>;
  }>("_data/brandkit.yml");
  cachedBrandKit = (data.groups ?? []).map((g) => ({
    groupName: g.group_name,
    items: (g.items_list ?? []).map((it) => ({
      title: it.title,
      description: it.description,
      previewUrl: it.preview,
      fileUrl: it.file,
      white: it.white,
    })),
  }));
  return cachedBrandKit;
}
