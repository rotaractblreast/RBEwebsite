import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TeamGrid } from "@/components/TeamGrid";
import { getSiteSettings, getTeam } from "@/lib/content";
import { SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Rotaract Club of Bangalore East (Easterners), established in 1975 and rechartered in 2019. A voluntary youth organization for young adults 18+.",
};

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const team = await getTeam();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Rotaract Club of Bangalore East",
    alternateName: ["Rotaract Bangalore East", "RBE", "Easterners"],
    url: SITE.url,
    email: settings.email,
    telephone: settings.phone,
    foundingDate: "1975-01-17",
    slogan: SITE.subtitle,
    description:
      "Rotaract Club of Bangalore East (Easterners) is a voluntary youth organization in Bangalore for young adults 18+. Dedicated to community service, leadership, and fellowship.",
    areaServed: {
      "@type": "City",
      name: "Bengaluru",
    },
    sameAs: Object.values(settings.siteSocial).filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="About Rotaract Bangalore East"
        eyebrow="Our Story · Since 1975"
        lead="A voluntary youth organization dedicated to leadership development, meaningful community service, and lifelong fellowship."
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <section className="section-pad pb-6">
        <div className="wrap max-w-3xl">
          <p className="text-body-lg text-on-surface-variant mb-6 leading-relaxed">
            Rotaract Club of Bangalore East, known as the Easterners, is a volunteer youth organization in Bengaluru. Established on January 17, 1975, rechartered on July 19, 2019, and sponsored by Rotary Bangalore East, the club brings together young adults 18 and older to lead community initiatives, hone professional skills, and build lifelong friendships.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 my-8 p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            <div>
              <span className="block text-xs uppercase tracking-wider text-primary font-bold mb-1">Organization</span>
              <span className="text-sm font-semibold text-on-surface">Rotaract Club of Bangalore East</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-primary font-bold mb-1">Eligibility</span>
              <span className="text-sm font-semibold text-on-surface">Young adults aged 18+</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-primary font-bold mb-1">Charter History</span>
              <span className="text-sm font-semibold text-on-surface">Jan 17, 1975 · Rechartered Jul 19, 2019</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-primary font-bold mb-1">Affiliation</span>
              <span className="text-sm font-semibold text-on-surface">Rotary Bangalore East · District 3191</span>
            </div>
          </div>
          <p className="text-on-surface-variant mb-4">
            <strong className="text-on-surface">UNITE:</strong> We are a welcoming family where every member finds mentorship, belonging, and encouragement.<br />
            <strong className="text-on-surface">RISE:</strong> We cultivate leadership, communication, and professional growth through hands-on responsibility.<br />
            <strong className="text-on-surface">EMPOWER:</strong> We channel our collective energy into impactful community drives, education support, and social welfare across Bangalore.
          </p>
          <p className="text-on-surface-variant">
            Volunteer, collaborate, and support our initiatives. Let&apos;s experience the joy of giving back together.
          </p>
        </div>
      </section>

      <section className="relative section-pad overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/site/background-3.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-inverse-surface/75" />
        </div>
        <div className="wrap relative grid md:grid-cols-2 gap-10 items-center text-inverse-on-surface">
          <img
            src="/images/site/feature-5.jpeg"
            alt="Fundraising for goodness"
            className="rounded-lg w-full object-cover aspect-[4/3]"
            loading="lazy"
          />
          <div>
            <p className="label-caps text-primary-fixed mb-3">Fundraising for goodness</p>
            <h2 className="font-display text-headline-lg text-white mb-4">Quick community response</h2>
            <p className="mb-6 text-inverse-on-surface/85">
              The support we give to the community is the rent we pay for our time on Earth. Be part of the change.
            </p>
            <Link href="/causes/" className="btn btn-primary">
              Our causes
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad bg-surface-container-low">
        <div className="wrap">
          <p className="label-caps text-center mb-2">Core values</p>
          <h2 className="font-display text-headline-lg text-center mb-10">UNITE · RISE · EMPOWER</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {settings.coreValues.map((value) => (
              <article key={value.title} className="card overflow-hidden">
                <div className="aspect-[16/10]">
                  <img
                    src={value.image}
                    alt={value.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-headline-md mb-2">{value.title}</h3>
                  <p className="text-on-surface-variant mb-4">{value.brief}</p>
                  <Link
                    href={value.target}
                    className="text-primary font-bold text-sm uppercase tracking-wider"
                  >
                    Explore →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="section-pad scroll-mt-24">
        <div className="wrap">
          <p className="label-caps text-center mb-2">#TeamRBE</p>
          <h2 className="font-display text-headline-lg text-center mb-3">Our team</h2>
          <p className="text-on-surface-variant text-center max-w-xl mx-auto mb-8">
            The Easterners who plan the projects, show up on the ground, and keep the club running.
          </p>

          <TeamGrid team={team} preview={7} />
        </div>
      </section>

      <section className="bg-primary-container text-on-primary-container py-16">
        <div className="wrap text-center">
          <h2 className="font-display text-headline-lg mb-3">We are Easterners</h2>
          <p className="text-lg mb-6 max-w-xl mx-auto">United to rise and empower the community.</p>
          <Link href="/join/" className="btn btn-ink">
            Become a Rotaractor
          </Link>
        </div>
      </section>

      <section className="section-pad">
        <div className="wrap">
          <p className="label-caps text-center mb-2">Areas of focus</p>
          <h2 className="font-display text-headline-lg text-center mb-10">Where we serve</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings.areasOfFocus.map((area) => (
              <article key={area.title} className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-6">
                <h3 className="font-display font-semibold text-on-surface mb-2">{area.title}</h3>
                <p className="text-sm text-on-surface-variant">{area.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
