import { getSanityClient, postUrl } from "@/lib/content";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const client = getSanityClient();
    const term = `${query.replace(/[*~"']/g, "")}*`;

    const groq = `*[_type in ["post", "event", "cause"] && (title match $term || description match $term || bodyMarkdown match $term)] | order(_createdAt desc) [0...25] {
      _id,
      _type,
      title,
      "slug": slug.current,
      description,
      publishedAt,
      startDate,
      endDate
    }`;

    const items = await client.fetch(groq, { term });

    const results = items.map((item: any) => {
      let url = "/";
      let typeLabel = "News";

      if (item._type === "post") {
        typeLabel = "News";
        url = item.publishedAt && item.slug ? postUrl(item.publishedAt, item.slug) : `/news/`;
      } else if (item._type === "event") {
        typeLabel = "Event";
        url = `/events/${item.slug}/`;
      } else if (item._type === "cause") {
        typeLabel = "Cause";
        url = `/causes/${item.slug}/`;
      }

      return {
        id: item._id,
        type: item._type,
        typeLabel,
        title: item.title,
        url,
        description: item.description || "",
        date: item.publishedAt || item.startDate || null,
      };
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}
