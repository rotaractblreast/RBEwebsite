import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import sanity from "@sanity/astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { pagefindDevPlugin } from "./scripts/pagefind-dev-plugin.mjs";
import { rbeAdminShell } from "./scripts/rbe-admin-shell.mjs";
import { singleSitemap } from "./scripts/single-sitemap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const projectId =
  env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  "placeholder";
const dataset =
  env.PUBLIC_SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  "production";

export default defineConfig({
  site: "https://rotaractblreast.org",
  output: "static",
  trailingSlash: "always",
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    plugins: [pagefindDevPlugin(__dirname)],
    // Pre-bundle Studio + markdown-preview deps at startup so the first /admin/
    // visit (or adding new imports) does not mid-flight re-optimize and orphan
    // hashed chunks like resources-*.js.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-is",
        "styled-components",
        "sanity",
        "sanity/structure",
        "sanity/router",
        "@sanity/ui",
        "@sanity/vision",
        "sanity-plugin-markdown",
        "sanity-plugin-media",
        "easymde",
        "dompurify",
        "marked",
      ],
    },
    // Studio hydrates in the browser — stub env reads used by Sanity tooling.
    // Module dedupe for react/sanity is handled by @sanity/astro (do not alias
    // `sanity` to a folder path; that breaks `sanity/router` etc. subpaths).
    define: {
      "process.env.PUBLIC_SANITY_PROJECT_ID": JSON.stringify(projectId),
      "process.env.PUBLIC_SANITY_DATASET": JSON.stringify(dataset),
      "process.env.SANITY_STUDIO_PROJECT_ID": JSON.stringify(projectId),
      "process.env.SANITY_STUDIO_DATASET": JSON.stringify(dataset),
    },
  },
  integrations: [
    sanity({
      projectId,
      dataset,
      useCdn: false,
      apiVersion: "2025-01-01",
      studioBasePath: "/admin",
      studioRouterHistory: "hash",
    }),
    // Owns /admin HTML shell after Sanity injects the route (avoids duplicate-route warning).
    rbeAdminShell(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => {
        if (page.includes("/admin") || page.includes("/search") || page.includes("/connect")) return false;
        // Paginated list clones (page-2+) dilute crawl budget; page 1 hubs stay.
        if (/\/page-\d+\/?$/.test(page)) return false;
        // Thin news day archives (/news/YYYY/MM/DD/) — keep real posts under them.
        if (/\/news\/\d{4}\/\d{2}\/\d{2}\/?$/.test(page)) return false;
        return true;
      },
      serialize: (item) => {
        // Build-time lastmod helps crawlers recheck after publishes / daily rebuilds.
        item.lastmod = new Date();
        return item;
      },
    }),
    // Collapse Astro's sitemap-index.xml + sitemap-0.xml into a single sitemap.xml.
    singleSitemap(),
  ],
  redirects: {
    "/teamadmin": "/admin/",
  },
});
