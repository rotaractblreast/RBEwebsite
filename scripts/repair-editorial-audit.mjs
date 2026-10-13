import { createClient } from "@sanity/client";

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "t6bu0f9m";
const dataset = process.env.PUBLIC_SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!token) {
  console.error("SANITY_API_WRITE_TOKEN is required in .env");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2025-01-01",
  token,
  useCdn: false,
});

async function repair() {
  console.log("1. Fixing 'Easteners Meet' typo to 'Easterners Meet'...");
  await client
    .patch("032b9f46-734c-418c-85fe-eed10ceb49ee")
    .set({
      title: "Easterners Meet – Connecting, Collaborating & Moving Forward",
      slug: { _type: "slug", current: "easterners-meet-2026" },
    })
    .commit();
  console.log("   ✓ Easteners Meet title and slug fixed to 'easterners-meet-2026'");

  console.log("2. Fixing President 2026–27 slug from 'President | 26-27' to 'rtr-aakash-kashyap-president-ry-2026-2027'...");
  await client
    .patch("68267431-af78-4cba-b07a-6598bd5811cb")
    .set({
      slug: { _type: "slug", current: "rtr-aakash-kashyap-president-ry-2026-2027" },
    })
    .commit();
  console.log("   ✓ President 2026–27 slug fixed");

  console.log("3. Publishing pending September draft 'Global Echoes'...");
  const draft = await client.fetch(`*[_id == "drafts.f804c41f-0ad9-4975-9469-f4a6e65fcba0"][0]`);
  if (draft) {
    const publishedDoc = {
      ...draft,
      _id: "f804c41f-0ad9-4975-9469-f4a6e65fcba0",
      publishedAt: "2026-09-07T15:30:00.000Z",
    };
    delete publishedDoc._createdAt;
    delete publishedDoc._updatedAt;
    delete publishedDoc._rev;

    await client.createOrReplace(publishedDoc);
    await client.delete("drafts.f804c41f-0ad9-4975-9469-f4a6e65fcba0");
    console.log("   ✓ Published 'Global Echoes' with publishedAt: 2026-09-07");
  } else {
    console.log("   • Draft already published or absent");
  }

  console.log("\nEditorial repairs complete!");
}

repair().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
