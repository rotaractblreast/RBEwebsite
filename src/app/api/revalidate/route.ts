import { parseBody } from "next-sanity/webhook";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawExpected = process.env.SANITY_REVALIDATE_SECRET;
    const expectedSecret = rawExpected ? rawExpected.trim().replace(/^["']|["']$/g, "") : undefined;

    let body: any = null;
    const querySecret = req.nextUrl.searchParams.get("secret")?.trim();
    const authHeader = req.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const directSecretMatch = (querySecret && querySecret === expectedSecret) || (bearerSecret && bearerSecret === expectedSecret);

    // If a secret is configured in Netlify
    if (expectedSecret) {
      const hasSignature = req.headers.has("sanity-webhook-signature");

      if (hasSignature) {
        // Official Sanity Webhook signature check using Secret field
        const { isValidSignature, body: parsed } = await parseBody<{
          _type?: string;
          slug?: string | { current?: string };
        }>(req, expectedSecret, true);

        if (isValidSignature === false) {
          return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
        }
        body = parsed;
      } else if (directSecretMatch) {
        // Fallback for manual test curls or authorized webhooks with ?secret= or Bearer
        try {
          body = await req.json();
        } catch {
          body = {};
        }
      } else {
        return NextResponse.json(
          { message: "Missing or invalid secret / signature" },
          { status: 401 }
        );
      }
    } else {
      // No secret configured on server - parse JSON directly
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const type = body?._type || "all";
    const slug = typeof body?.slug === "string" ? body.slug : body?.slug?.current;

    console.log(`[revalidate] Triggered for type: ${type}, slug: ${slug || "none"}`);

    // Revalidate the entire site tree (layout + all child pages: home, news, events, causes, team, archives)
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/events");
    revalidatePath("/causes");
    revalidatePath("/about");
    revalidatePath("/rss.xml");

    return NextResponse.json({
      revalidated: true,
      type,
      slug: slug || null,
      scope: "full-site",
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
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({
      status: "ok",
      endpoint: "Sanity On-Demand ISR Webhook",
      revalidate: "Triggered via POST with sanity-webhook-signature or GET/POST with ?secret=",
    });
  }
  return POST(req);
}
