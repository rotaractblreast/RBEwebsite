import { defineField, defineType } from "sanity";

export const cause = defineType({
  name: "cause",
  title: "Cause",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "focus", type: "string" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "due", type: "date" }),
    defineField({ name: "active", type: "boolean", initialValue: true }),
    defineField({
      name: "goal",
      title: "Goal (₹)",
      type: "number",
      description: "Fundraising target in INR. Shown as ₹10,000 style on the site.",
    }),
    defineField({
      name: "progress",
      type: "number",
      validation: (r) => r.min(0).max(100),
      initialValue: 0,
    }),
    defineField({ name: "featured", type: "boolean", initialValue: false }),
    defineField({ name: "donationLink", type: "url" }),
    defineField({
      name: "intro",
      title: "Intro (on-page lead & card teaser)",
      type: "text",
      description: "Short lead shown on the cause page and on cause cards.",
    }),
    defineField({
      name: "description",
      title: "SEO / social summary",
      type: "text",
      description:
        "Short summary for search engines, WhatsApp/social previews, and Open Graph. Ideal length: 120-155 characters. Also used as page body if Body is empty.",
    }),
    defineField({
      name: "bodyMarkdown",
      title: "Body",
      type: "markdown",
      description:
        "Markdown body — toolbar covers headings, strike, lists, checklist, table, HR, code, and images. The image button opens a preview (alt + optional caption); Insert uploads to Media, Cancel discards.",
    }),
  ],
  orderings: [
    { title: "Due date, soonest", name: "dueAsc", by: [{ field: "due", direction: "asc" }] },
    { title: "Due date, latest", name: "dueDesc", by: [{ field: "due", direction: "desc" }] },
    { title: "Active first", name: "activeDesc", by: [{ field: "active", direction: "desc" }, { field: "title", direction: "asc" }] },
    { title: "Inactive first", name: "activeAsc", by: [{ field: "active", direction: "asc" }, { field: "title", direction: "asc" }] },
    { title: "Title, A–Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
    { title: "Title, Z–A", name: "titleDesc", by: [{ field: "title", direction: "desc" }] },
    { title: "Last edited, newest", name: "updatedDesc", by: [{ field: "_updatedAt", direction: "desc" }] },
    { title: "Last edited, oldest", name: "updatedAsc", by: [{ field: "_updatedAt", direction: "asc" }] },
    { title: "Created, newest", name: "createdDesc", by: [{ field: "_createdAt", direction: "desc" }] },
    { title: "Created, oldest", name: "createdAsc", by: [{ field: "_createdAt", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", media: "image", active: "active" },
    prepare: ({ title, media, active }) => ({
      title,
      media,
      subtitle: active ? "Active" : "Inactive",
    }),
  },
});
