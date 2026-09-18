import Link from "next/link";
import { CardPost } from "@/components/CardPost";
import { CardEvent } from "@/components/CardEvent";
import { CardCause } from "@/components/CardCause";
import { getCauses, getEvents, getPosts, getSiteSettings } from "@/lib/content";
import { eventState, formatSpotlightDate, nowStamp, toUnix } from "@/lib/events";
import { SITE } from "@/lib/site";
import { webSiteJsonLd } from "@/lib/seo";

export const revalidate = 60; // Fallback time-based ISR (in addition to on-demand webhooks)

export default async function HomePage() {
  const settings = await getSiteSettings();
  const posts = await getPosts();
  const events = await getEvents();
  const causes = (await getCauses()).filter((c) => c.active);
  const now = nowStamp();

  const eventsSorted = [...events].sort(
    (a, b) => (toUnix(a.start) ?? 0) - (toUnix(b.start) ?? 0)
  );

  const ongoing = eventsSorted
    .filter((e) => eventState(e.start, e.end, now) === "ongoing")
    .sort((a, b) => (toUnix(a.end) ?? 0) - (toUnix(b.end) ?? 0));
  const upcoming = eventsSorted.filter(
    (e) => eventState(e.start, e.end, now) === "upcoming"
  );
  const spotlight = ongoing[0] ?? upcoming[0] ?? null;
  const spotlightState = spotlight
    ? eventState(spotlight.start, spotlight.end, now)
    : null;

  type MixItem =
    | { kind: "post"; data: (typeof posts)[0] }
    | { kind: "event"; data: (typeof events)[0] }
    | { kind: "cause"; data: (typeof causes)[0] };

  const liveEvents = eventsSorted.filter((e) => {
    const s = eventState(e.start, e.end, now);
    return (s === "ongoing" || s === "upcoming") && e !== spotlight;
  });

  const mix: MixItem[] = [];
  let pi = 0,
    ei = 0,
    ci = 0;
  for (let i = 0; i < 9 && mix.length < 9; i++) {
    const kind = i % 3;
    if (kind === 0 && ei < liveEvents.length) {
      mix.push({ kind: "event", data: liveEvents[ei++] });
    } else if (kind === 1 && ci < causes.length) {
      mix.push({ kind: "cause", data: causes[ci++] });
    } else if (kind === 2 && pi < posts.length) {
      mix.push({ kind: "post", data: posts[pi++] });
    }
  }
  while (mix.length < 9 && ci < causes.length) {
    mix.push({ kind: "cause", data: causes[ci++] });
  }
  while (mix.length < 9 && ei < liveEvents.length) {
    mix.push({ kind: "event", data: liveEvents[ei++] });
  }
  while (mix.length < 9 && pi < posts.length) {
    mix.push({ kind: "post", data: posts[pi++] });
  }

  const homeDescription =
    "Rotaract Club of Bangalore East (Easterners) is a voluntary youth organization in Bangalore for young adults 18+. Join us for leadership, service, and fellowship.";
  const jsonLd = [
    webSiteJsonLd(homeDescription),
    {
      "@context": "https://schema.org",
      "@type": "NGO",
      name: "Rotaract Club of Bangalore East",
      alternateName: ["Rotaract Bangalore East", "RBE", "Easterners"],
      url: SITE.url,
      logo: `${SITE.url}/images/site/rbe.png`,
      email: settings.email,
      telephone: settings.phone,
      foundingDate: "1975-01-17",
      slogan: SITE.subtitle,
      description: homeDescription,
      parentOrganization: {
        "@type": "Organization",
        name: "Rotary Bangalore East",
        url: "https://rotaractblreast.org/about/",
      },
      areaServed: {
        "@type": "City",
        name: "Bengaluru",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bengaluru",
        addressRegion: "KA",
        addressCountry: "IN",
      },
      knowsAbout: [
        "Youth Leadership",
        "Community Service",
        "Volunteering",
        "Professional Development",
        "Social Impact",
      ],
      sameAs: Object.values(settings.siteSocial).filter(Boolean),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative w-full min-h-[70vh] md:min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/site/slider-4.jpg"
            alt="Rotaract Bangalore East members at a club event"
            className="h-full w-full object-cover"
            width="1920"
            height="1080"
          />
          <div className="absolute inset-0 hero-scrim" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="wrap relative z-10 w-full flex flex-col items-start md:items-center text-left md:text-center py-16 md:py-24">
          <p className="label-caps text-primary-fixed mb-4 inline-block backdrop-blur-sm bg-inverse-surface/40 px-4 py-1.5 rounded">
            Voluntary Youth Organization · Bangalore, India
          </p>
          <h1 className="font-display mb-6 max-w-4xl tracking-tight">
            <span className="block text-primary-fixed text-sm sm:text-base md:text-xl font-bold tracking-widest uppercase mb-3 drop-shadow">
              Rotaract Club of Bangalore East
            </span>
            <span className="block text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
              Unite. Rise. Empower.
            </span>
          </h1>
          <p className="text-body-lg text-surface-container-highest mb-10 max-w-2xl leading-relaxed">
            A community of young adults, college students, and working professionals united by a shared passion for leadership, meaningful service, and lifelong fellowship. Join the family of Easterners to make a lasting difference and grow together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/join/" className="btn btn-primary px-8 py-4 text-base">
              Join the Movement{" "}
              <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link href="/about/" className="btn btn-ghost px-8 py-4 text-base">
              Discover Our Impact
            </Link>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="wrap relative z-20 -mt-8 md:-mt-16 lg:-mt-20 section-pad pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {settings.coreValues.map((value) => (
            <Link key={value.title} href={value.target} className="card card-lift p-0 overflow-hidden group block">
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={value.image}
                  alt={value.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  width="640"
                  height="400"
                />
              </div>
              <div className="p-6 md:p-8">
                <h2 className="font-display text-headline-md text-on-surface mb-3">{value.title}</h2>
                <p className="text-on-surface-variant mb-4">{value.brief}</p>
                <span className="text-metadata text-primary font-bold uppercase tracking-wider">
                  Learn more →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* About Overview Section */}
      <section className="section-pad bg-surface-container-low">
        <div className="wrap grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative overflow-hidden rounded-lg">
            <img
              src="/images/site/about.jpg"
              alt="Rotaract Bangalore East members"
              className="rounded-lg w-full object-cover aspect-[4/3]"
              loading="lazy"
              width="800"
              height="600"
            />
            <img
              src="/images/site/about-small.jpg"
              alt="Rotaract Bangalore East members volunteering together"
              className="hidden md:block absolute bottom-4 right-4 w-32 lg:w-40 rounded-lg border-4 border-background shadow-lift"
              loading="lazy"
              width="160"
              height="160"
            />
          </div>
          <div>
            <p className="label-caps mb-3">Who we are</p>
            <h2 className="font-display text-headline-lg text-on-surface mb-4">We are Rotaractors</h2>
            <p className="text-on-surface-variant text-body-lg mb-4">
              Rotaract Bangalore East is a community-based club sponsored by{" "}
              <a
                href="https://goodwillrbe.blogspot.com/"
                className="text-primary underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rotary Bangalore East
              </a>
              . We create positive social impact and share the joy of giving back.
            </p>
            <p className="text-on-surface-variant mb-8">
              Volunteer, collaborate, and support our events and projects. Let’s UNITE · RISE · EMPOWER.
            </p>
            <Link href="/about/" className="btn btn-ink">
              Our story
            </Link>
          </div>
        </div>
      </section>

      {/* Happenings Section */}
      <section className="section-pad">
        <div className="wrap">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <p className="label-caps mb-2">What’s happening</p>
              <h2 className="font-display text-headline-lg">News, events &amp; causes</h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/events/" className="btn btn-outline text-sm py-2 px-4 touch-target">
                All events
              </Link>
              <Link href="/news/" className="btn btn-outline text-sm py-2 px-4 touch-target">
                All news
              </Link>
              <Link href="/causes/" className="btn btn-outline text-sm py-2 px-4 touch-target">
                All causes
              </Link>
            </div>
          </div>

          {spotlight && (
            <Link
              href={spotlight.url}
              className="card card-lift mb-10 grid md:grid-cols-2 overflow-hidden group"
              data-event-spotlight=""
              data-start={toUnix(spotlight.start) ?? 0}
              data-end={toUnix(spotlight.end ?? spotlight.start) ?? 0}
            >
              {spotlight.image && (
                <div className="aspect-[16/10] md:aspect-auto md:min-h-[280px] overflow-hidden">
                  <img
                    src={spotlight.image}
                    alt={spotlight.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-6 md:p-10 flex flex-col justify-center">
                <p className="label-caps mb-2" data-event-badge="">
                  {spotlightState === "ongoing" ? "Ongoing" : "Upcoming event"}
                </p>
                <h3 className="font-display text-2xl font-bold text-on-surface mb-2">{spotlight.title}</h3>
                <p className="text-on-surface-variant mb-2">
                  {formatSpotlightDate(spotlight.start)}
                  {spotlight.venue ? ` · ${spotlight.venue}` : ""}
                </p>
                {spotlight.intro && (
                  <p className="text-on-surface-variant line-clamp-3 mb-4">
                    {spotlight.intro.replace(/<[^>]+>/g, "").slice(0, 160)}
                  </p>
                )}
                <span className="text-metadata text-primary font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  Learn more <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mix.map((item) =>
              item.kind === "post" ? (
                <CardPost key={item.data._id} post={item.data} />
              ) : item.kind === "event" ? (
                <CardEvent key={item.data._id} event={item.data} now={now} />
              ) : (
                <CardCause key={item.data._id} cause={item.data} />
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
