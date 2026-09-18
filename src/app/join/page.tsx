import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JoinForm } from "@/components/JoinForm";
import { getJoinFaq, getSiteSettings } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Join Us",
  description:
    "Join Rotaract Club of Bangalore East. Open to young adults 18+. Connect with Easterners for leadership development, community service, and fellowship.",
};

export default async function JoinPage() {
  const settings = await getSiteSettings();
  const faq = await getJoinFaq();

  const serviceAreas = settings.areasOfFocus.map((area) => area.title);
  const clubSkills = [
    "Community service projects",
    "Event planning and hosting",
    "Design and creatives",
    "Social media and communications",
    "Professional development",
    "Fundraising",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="Join Us"
        eyebrow="Become an Easterner"
        lead="Connect with passionate peers, develop leadership skills, and create real community impact together."
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Join" }]} />

      <section className="section-pad bg-surface-container-low">
        <div className="wrap">
          <p className="label-caps text-center mb-2">Why join</p>
          <h2 className="font-display text-headline-lg text-center mb-10">What you get as a member</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <article className="card p-6">
              <span className="material-symbols-outlined text-3xl text-primary mb-3" aria-hidden="true">
                diversity_3
              </span>
              <h3 className="font-display text-lg font-semibold mb-2">Community</h3>
              <p className="text-on-surface-variant text-sm">
                A welcoming community of Easterners offering fellowship, mentorship, and lifelong friendships.
              </p>
            </article>
            <article className="card p-6">
              <span className="material-symbols-outlined text-3xl text-primary mb-3" aria-hidden="true">
                school
              </span>
              <h3 className="font-display text-lg font-semibold mb-2">Growth</h3>
              <p className="text-on-surface-variant text-sm">
                Professional development, leadership roles, and learning by doing.
              </p>
            </article>
            <article className="card p-6">
              <span className="material-symbols-outlined text-3xl text-primary mb-3" aria-hidden="true">
                volunteer_activism
              </span>
              <h3 className="font-display text-lg font-semibold mb-2">Impact</h3>
              <p className="text-on-surface-variant text-sm">
                Hands-on service across Rotary’s areas of focus in Bangalore and beyond.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-ink text-white py-12">
        <div className="wrap flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Ready to apply?</h2>
            <p className="text-white/80 mt-1">Fill the form below - we’ll get back to you soon.</p>
          </div>
          <a href="#application" className="btn btn-primary shrink-0">
            Start application
          </a>
        </div>
      </section>

      <section id="application" className="section-pad">
        <div className="wrap grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <h2 className="font-display text-headline-md mb-2">Membership application</h2>
            <p className="text-sm text-on-surface-variant mb-8">
              A few questions so we can get to know you. Fields marked{" "}
              <span className="req-mark text-error" aria-hidden="true">*</span> are required, and some
              questions appear based on your answers.
            </p>

            <JoinForm
              clubEmail={settings.email}
              serviceAreas={serviceAreas}
              clubSkills={clubSkills}
            />
          </div>

          <aside className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-2xl bg-surface-container-low p-6 border border-outline-variant/30">
                <h3 className="font-display font-bold text-lg mb-4">Membership FAQs</h3>
                <div className="space-y-4">
                  {faq.map((item, i) => (
                    <details key={i} className="group border-b border-outline-variant/20 pb-4 last:border-0 last:pb-0">
                      <summary className="font-semibold text-sm cursor-pointer list-none flex justify-between items-center text-on-surface hover:text-primary">
                        <span>{item.question}</span>
                        <span className="material-symbols-outlined text-stone-400 group-open:rotate-180 transition-transform text-[18px]">
                          expand_more
                        </span>
                      </summary>
                      <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
