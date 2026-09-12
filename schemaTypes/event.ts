import { defineField, defineType } from "sanity";

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "start", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "end", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "venue", type: "string" }),
    defineField({ name: "buttonOpen", type: "boolean", initialValue: true }),
    defineField({ name: "buttonText", type: "string" }),
    defineField({ name: "buttonUrl", type: "string" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "intro",
      title: "Intro (on-page lead & card teaser)",
      type: "text",
      description: "Short lead shown on the event page and on event cards / home spotlight.",
    }),
    defineField({
      name: "description",
      title: "SEO / social summary",
      type: "text",
      description:
        "Short summary for Google search, WhatsApp/social sharing, and JSON-LD. Ideal length: 120-155 characters. Lead with what the event is, date/venue, and why to attend. Used as page body if Body is empty.",
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
    { title: "Start, newest", name: "startDesc", by: [{ field: "start", direction: "desc" }] },
    { title: "Start, oldest", name: "startAsc", by: [{ field: "start", direction: "asc" }] },
    { title: "Title, A–Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
    { title: "Title, Z–A", name: "titleDesc", by: [{ field: "title", direction: "desc" }] },
    { title: "Last edited, newest", name: "updatedDesc", by: [{ field: "_updatedAt", direction: "desc" }] },
    { title: "Last edited, oldest", name: "updatedAsc", by: [{ field: "_updatedAt", direction: "asc" }] },
    { title: "Created, newest", name: "createdDesc", by: [{ field: "_createdAt", direction: "desc" }] },
    { title: "Created, oldest", name: "createdAsc", by: [{ field: "_createdAt", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", media: "image", start: "start" },
    prepare: ({ title, media, start }) => ({
      title,
      media,
      subtitle: start ? new Date(start).toLocaleString() : "",
    }),
  },
});
