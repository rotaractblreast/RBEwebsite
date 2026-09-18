import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for rotaractblreast.org - acceptable use, membership applications, intellectual property, governing law (Karnataka, India), and your rights when using the Rotaract Bangalore East website.",
};

export default function TermsPage() {
  const filePath = path.join(process.cwd(), "src/content/terms.html");
  const termsHtml = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  return (
    <>
      <PageHero title="Terms of Service" />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Terms" }]} />
      <section className="section-pad">
        <div
          className="wrap prose-rbe"
          dangerouslySetInnerHTML={{ __html: termsHtml }}
        />
      </section>
    </>
  );
}
