import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SocialIcon } from "@/components/SocialIcon";
import { getSiteSettings } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Rotaract Club of Bangalore East (Easterners). Connect with us by email, phone, or social channels for volunteering and inquiries.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const social = Object.entries(settings.siteSocial || {}).filter(
    (entry): entry is [keyof typeof settings.siteSocial, string] => Boolean(entry[1])
  );

  return (
    <>
      <PageHero
        title="Contact Us"
        eyebrow="Connect With Us"
        lead="Connect with Easterners by email, phone, or social. We are always glad to hear from you."
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <section className="w-full h-48 md:h-64 lg:h-80 bg-surface-container">
        <iframe
          title="Map showing Rotaract Bangalore East in Bangalore"
          loading="lazy"
          className="w-full h-full border-0"
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d124410.28846350599!2d77.678933!3d12.9832651!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x6c3c101b0de06586!2sRotaract%20Bangalore%20East!5e0!3m2!1sen!2sin!4v1611615516117!5m2!1sen!2sin"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>

      <section className="section-pad">
        <div className="wrap max-w-3xl">
          <h2 className="font-display text-headline-md mb-2">Get in touch</h2>
          <p className="text-on-surface-variant mb-8">
            Have questions about membership, community initiatives, or partnerships? Reach out directly by email or phone, or follow our social channels for announcements.
          </p>
          <ul className="space-y-6 text-on-surface-variant">
            <li>
              <span className="block text-metadata text-on-surface font-semibold mb-1">Address</span>
              {settings.location}
            </li>
            <li>
              <span className="block text-metadata text-on-surface font-semibold mb-1">Email</span>
              <a href={`mailto:${settings.email}`} className="text-primary text-lg">
                {settings.email}
              </a>
            </li>
            <li>
              <span className="block text-metadata text-on-surface font-semibold mb-1">Phone</span>
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="text-primary text-lg">
                {settings.phone}
              </a>
            </li>
          </ul>
          {social.length > 0 && (
            <div className="mt-10 pt-8 border-t border-outline-variant/40">
              <p className="text-metadata text-on-surface font-semibold mb-4">Social</p>
              <ul className="flex flex-wrap gap-3">
                {social.map(([network, url]) => (
                  <li key={network}>
                    <a
                      href={url}
                      className="inline-flex items-center justify-center size-11 rounded-full bg-surface-container-low text-on-surface hover:bg-primary-container hover:text-on-primary-container transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={network}
                    >
                      <SocialIcon network={network as any} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-10 text-sm text-on-surface-variant">
            Interested in membership?{" "}
            <Link href="/join/" className="text-primary font-medium">
              Apply on the Join page
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
