import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for rotaractblreast.org - what data we collect, how it is stored, third-party services used, and your rights under India's DPDPA and GDPR when visiting the Rotaract Bangalore East website.",
};

export default function PrivacyPage() {
  const filePath = path.join(process.cwd(), "src/content/privacy.html");
  const privacyHtml = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  return (
    <>
      <PageHero title="Privacy Policy" />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Privacy" }]} />
      <section className="section-pad">
        <div
          className="wrap prose-rbe"
          dangerouslySetInnerHTML={{ __html: privacyHtml }}
        />
      </section>
    </>
  );
}
