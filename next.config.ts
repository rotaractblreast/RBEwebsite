import type { NextConfig } from "next";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "t6bu0f9m";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const formsApi =
  process.env.NEXT_PUBLIC_FORMS_API_URL ||
  "https://script.google.com/macros/s/AKfycbwchW0c5HpKBvqSuhtownO-xtqGEoo3qtjo73CSmVvQINpNptmy_DMlkb5gq36Zoun1/exec";

const nextConfig: NextConfig = {
  trailingSlash: true,
  outputFileTracingIncludes: {
    "/**": ["./_data/**/*", "./src/content/**/*"],
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SANITY_PROJECT_ID: projectId,
    NEXT_PUBLIC_SANITY_DATASET: dataset,
    NEXT_PUBLIC_FORMS_API_URL: formsApi,
  },
  async redirects() {
    return [
      {
        source: "/feed.xml",
        destination: "/rss.xml",
        permanent: true,
      },
      {
        source: "/teamadmin",
        destination: "/admin/",
        permanent: true,
      },
      {
        source: "/community-service",
        destination: "/news/community-service/",
        permanent: true,
      },
      {
        source: "/club-service",
        destination: "/news/club-service/",
        permanent: true,
      },
      {
        source: "/international-service",
        destination: "/news/international-service/",
        permanent: true,
      },
      {
        source: "/professional-development",
        destination: "/news/professional-development/",
        permanent: true,
      },
      {
        source: "/news/tag/:slug",
        destination: "/news/tag-:slug/",
        permanent: true,
      },
      {
        source: "/news/tags/:slug",
        destination: "/news/tag-:slug/",
        permanent: true,
      },
      {
        source: "/news/category/:slug",
        destination: "/news/:slug/",
        permanent: true,
      },
      {
        source: "/news/2026/08/28/easteners-meet-2026/",
        destination: "/news/2026/08/28/easterners-meet-2026/",
        permanent: true,
      },
      {
        source: "/news/2026/07/01/:slug(President.*)",
        destination: "/news/2026/07/01/rtr-aakash-kashyap-president-ry-2026-2027/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
