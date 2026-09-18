import type { NextConfig } from "next";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "t6bu0f9m";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const formsApi =
  process.env.NEXT_PUBLIC_FORMS_API_URL ||
  "https://script.google.com/macros/s/AKfycbwchW0c5HpKBvqSuhtownO-xtqGEoo3qtjo73CSmVvQINpNptmy_DMlkb5gq36Zoun1/exec";

const nextConfig: NextConfig = {
  trailingSlash: true,
  outputFileTracingIncludes: {
    "/**": ["./_data/**/*"],
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
    ];
  },
};

export default nextConfig;
