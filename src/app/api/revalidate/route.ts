import { parseBody } from "next-sanity/webhook";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.SANITY_REVALIDATE_SECRET;

    let body: any = null;
    const querySecret = req.nextUrl.searchParams.get("secret");

    // If a secret is configured in Netlify
    if (expectedSecret) {
      const hasSignature = req.headers.has("sanity-webhook-signature");

      if (hasSignature) {
        // Official Sanity Webhook signature check using Secret field
        const { isValidSignature, body: parsed } = await parseBody<{
          _type?: string;
          slug?: string | { current?: string };
        }>(req, expectedSecret, false);

        if (isValidSignature === false) {
          return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
        }
        body = parsed;
      } else if (querySecret === expectedSecret) {
        // Fallback for manual test curls with ?secret=
        try {
          body = await req.json();
        } catch {
          body = {};
        }
      } else {
        return NextResponse.json({ message: "Missing or invalid secret" }, { status: 401 });
      }
    } else {
      // No secret configured on server - parse JSON directly
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const type = body?._type;
    const slug = typeof body?.slug === "string" ? body.slug : body?.slug?.current;
    const revalidatedPaths: string[] = [];

    const revalidate = (path: string) => {
      revalidatePath(path);
      revalidatedPaths.push(path);
    };

    // Always revalidate homepage when content changes
    revalidate("/");

    if (type === "post") {
      revalidate("/news/");
      revalidate("/rss.xml/");
      if (slug) {
        revalidate(`/news/${slug}/`);
      }
    } else if (type === "event") {
      revalidate("/events/");
      if (slug) {
        revalidate(`/events/${slug}/`);
      }
    } else if (type === "cause") {
      revalidate("/causes/");
      if (slug) {
        revalidate(`/causes/${slug}/`);
      }
    } else if (type === "team") {
      revalidate("/about/");
    } else if (type === "category") {
      revalidate("/news/");
      if (slug) {
        revalidate(`/news/${slug}/`);
      }
    } else if (type === "tag") {
      revalidate("/news/");
      if (slug) {
        revalidate(`/news/tag-${slug}/`);
      }
    } else {
      // General/new schema type fallback: revalidates the entire layout tree
      revalidatePath("/", "layout");
      revalidatedPaths.push("/* (all routes)");
    }

    return NextResponse.json({
      revalidated: true,
      paths: revalidatedPaths,
      type: type || "all",
      now: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Error revalidating", error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
