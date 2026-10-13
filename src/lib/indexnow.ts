const HOST = "rotaractblreast.org";
const KEY = "b689725f013d420fbf61a6c4df192c77";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notify IndexNow (Bing, Copilot, Yandex, Seznam) of changed URLs in real-time.
 * Errors are caught and logged as non-blocking warnings so ISR revalidation never fails.
 */
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  if (!urls || urls.length === 0) return false;
  try {
    const formattedUrls = urls.map((u) =>
      u.startsWith("http") ? u : `https://${HOST}${u.startsWith("/") ? "" : "/"}${u}`
    );

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: formattedUrls,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const ok = res.status === 200 || res.status === 202;
    if (ok) {
      console.log(`[IndexNow] Successfully notified ${formattedUrls.length} URL(s)`);
    } else {
      console.warn(`[IndexNow] Submission returned HTTP ${res.status}`);
    }
    return ok;
  } catch (err: unknown) {
    console.warn("[IndexNow] Non-blocking ping error:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
