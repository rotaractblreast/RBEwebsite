#!/usr/bin/env node
/**
 * Submit site URLs to IndexNow (Bing, Yandex, Seznam, Naver, Yep).
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs                  # Submit all URLs from dist/sitemap.xml
 *   node scripts/submit-indexnow.mjs --dry-run        # Preview URLs without sending
 *   node scripts/submit-indexnow.mjs --url <url>      # Submit specific URL(s)
 *   node scripts/submit-indexnow.mjs --build          # Run as post-build (only active in production)
 *   node scripts/submit-indexnow.mjs --force          # Bypass live key check
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HOST = "rotaractblreast.org";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_KEY = "b689725f013d420fbf61a6c4df192c77";

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isBuild = args.includes("--build");
const isForce = args.includes("--force");

const specificUrls = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url" && args[i + 1]) {
    specificUrls.push(args[i + 1]);
    i++;
  }
}

/**
 * Locate or detect the IndexNow key in public/
 */
async function getKey() {
  try {
    const publicFiles = await fs.readdir(path.join(ROOT, "public"));
    const keyFile = publicFiles.find((f) => /^[a-f0-9]{32}\.txt$/i.test(f));
    if (keyFile) {
      const content = await fs.readFile(path.join(ROOT, "public", keyFile), "utf8");
      return content.trim();
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_KEY;
}

/**
 * Extract canonical URLs from dist/sitemap.xml
 */
async function getSitemapUrls() {
  const sitemapPath = path.join(ROOT, "dist", "sitemap.xml");
  try {
    const xml = await fs.readFile(sitemapPath, "utf8");
    const matches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = matches
      .map((tag) => tag.replace(/<\/?loc>/g, "").trim())
      .filter((url) => url.startsWith(`https://${HOST}`));
    return Array.from(new Set(urls));
  } catch (err) {
    throw new Error(`Failed to read sitemap at ${sitemapPath}: ${err.message}`);
  }
}

/**
 * Check whether the key file is already live on the production domain.
 */
async function isKeyLive(key) {
  const keyUrl = `https://${HOST}/${key}.txt`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(keyUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const text = await res.text();
    return text.trim() === key;
  } catch {
    return false;
  }
}

async function main() {
  // If running as part of the build step:
  if (isBuild) {
    const isProduction =
      process.env.CONTEXT === "production" ||
      process.env.INDEXNOW_SUBMIT === "1";

    if (!isProduction) {
      console.log("[IndexNow] Skipping submission during local/non-production build.");
      console.log("           Set INDEXNOW_SUBMIT=1 to test locally.");
      return;
    }
  }

  const key = await getKey();
  const keyLocation = `https://${HOST}/${key}.txt`;

  // Check if key is verified live on the domain (unless --force or --dry-run)
  if (!isDryRun && !isForce) {
    const live = await isKeyLive(key);
    if (!live) {
      console.warn(`[IndexNow] Verification file not yet live at ${keyLocation}.`);
      console.warn("           Deploy changes to Netlify first. Once live, submissions will succeed.");
      if (isBuild) {
        // Exit cleanly during initial deploy build so build succeeds
        return;
      } else {
        console.warn("           Use --force to submit anyway.");
        process.exit(1);
      }
    }
  }

  // Gather URLs
  let urls = [];
  if (specificUrls.length > 0) {
    urls = specificUrls;
  } else {
    try {
      urls = await getSitemapUrls();
    } catch (err) {
      if (isBuild) {
        console.warn(`[IndexNow] Warning: ${err.message}`);
        return;
      }
      throw err;
    }
  }

  if (urls.length === 0) {
    console.log("[IndexNow] No URLs found to submit.");
    return;
  }

  console.log(`[IndexNow] Found ${urls.length} URL(s) to submit for https://${HOST}`);
  console.log(`[IndexNow] Key file: ${keyLocation}`);

  if (isDryRun) {
    console.log("\n[IndexNow] DRY-RUN MODE: Preview of payload to be submitted:");
    console.log(
      JSON.stringify(
        {
          host: HOST,
          key,
          keyLocation,
          urlList: urls.slice(0, 10),
          _totalUrls: urls.length,
        },
        null,
        2,
      ),
    );
    if (urls.length > 10) {
      console.log(`... and ${urls.length - 10} more URLs.`);
    }
    return;
  }

  // Submit in batches of up to 10,000 URLs
  const BATCH_SIZE = 10000;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const payload = {
      host: HOST,
      key,
      keyLocation,
      urlList: batch,
    };

    console.log(
      `[IndexNow] Submitting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} URLs) to ${ENDPOINT}...`,
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 200) {
        console.log(`[IndexNow] ✓ Success: HTTP 200 OK — ${batch.length} URLs accepted.`);
      } else if (res.status === 202) {
        console.log(
          `[IndexNow] ✓ Accepted: HTTP 202 — ${batch.length} URLs received (key validation pending).`,
        );
      } else {
        const errorText = await res.text().catch(() => "");
        console.warn(
          `[IndexNow] ⚠ Submission returned HTTP ${res.status}: ${res.statusText} ${errorText}`,
        );
        if (!isBuild) {
          process.exitCode = 1;
        }
      }
    } catch (err) {
      console.warn(`[IndexNow] ⚠ Failed to reach IndexNow endpoint: ${err.message}`);
      if (!isBuild) {
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(`[IndexNow] Error: ${err.message}`);
  if (!isBuild) {
    process.exit(1);
  }
});
