import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandKitGallery } from "@/components/BrandKitGallery";
import { getBrandKit } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Brand Kit",
  description:
    "Download official logos and brand assets for Rotaract Bangalore East, Rotary, and District 3191 partners.",
};

export default async function BrandKitPage() {
  const groups = await getBrandKit();

  return (
    <>
      <PageHero title="Brand Kit" />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Brand Kit" }]} />

      <section className="section-pad">
        <div className="wrap">
          <BrandKitGallery groups={groups} />
        </div>
      </section>
    </>
  );
}
