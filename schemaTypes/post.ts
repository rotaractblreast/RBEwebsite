import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "News",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "publishedAt", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "category" }],
          options: { disableNew: false },
        },
      ],
      description: "Pick from the shared Categories list (add new ones under Categories in the sidebar).",
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [
        {
          type: "reference",
          to: [{ type: "tag" }],
          options: { disableNew: false },
        },
      ],
      description: "Pick from the shared Tags list (add new ones under Tags in the sidebar).",
    }),
    defineField({
      name: "description",
      title: "Card teaser & search/social summary",
      type: "text",
      description:
        "Short summary for news cards, meta description, Open Graph, and RSS. Ideal length: 120-155 characters. Not shown as the article body (use Body for that).",
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
    { title: "Published, newest", name: "pubDesc", by: [{ field: "publishedAt", direction: "desc" }] },
    { title: "Published, oldest", name: "pubAsc", by: [{ field: "publishedAt", direction: "asc" }] },
    { title: "Title, A–Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
    { title: "Title, Z–A", name: "titleDesc", by: [{ field: "title", direction: "desc" }] },
    { title: "Last edited, newest", name: "updatedDesc", by: [{ field: "_updatedAt", direction: "desc" }] },
    { title: "Last edited, oldest", name: "updatedAsc", by: [{ field: "_updatedAt", direction: "asc" }] },
    { title: "Created, newest", name: "createdDesc", by: [{ field: "_createdAt", direction: "desc" }] },
    { title: "Created, oldest", name: "createdAsc", by: [{ field: "_createdAt", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", media: "image", date: "publishedAt" },
    prepare: ({ title, media, date }) => ({
      title,
      media,
      subtitle: date ? new Date(date).toLocaleDateString() : "",
    }),
  },
});
