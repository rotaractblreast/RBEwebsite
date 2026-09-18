import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SITE, PRIMARY_NAV } from "@/lib/site";
import { getSiteSettings } from "@/lib/content";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Subscribe } from "@/components/Subscribe";
import { SearchModal } from "@/components/SearchModal";
import "@/styles/global.css";

export const viewport: Viewport = {
  themeColor: "#ff9000",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.title} (Easterners) - ${SITE.subtitle}`,
    template: `%s | ${SITE.title}`,
  },
  description: SITE.description,
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  icons: {
    icon: "/images/site/favicon.png",
  },
  openGraph: {
    title: `${SITE.title} (Easterners) - ${SITE.subtitle}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.title,
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: SITE.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.title} (Easterners) - ${SITE.subtitle}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <head>
        <link rel="llms-txt" href="/llms.txt" type="text/plain" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Header nav={[...PRIMARY_NAV]} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Subscribe />
        <Footer settings={settings} />
        <SearchModal />

        <button
          type="button"
          id="scroll-top"
          className="fixed bottom-6 right-6 z-40 hidden h-11 w-11 rounded-full bg-primary-container text-on-primary-container shadow-lift items-center justify-center hover:bg-primary hover:text-on-primary"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            arrow_upward
          </span>
        </button>

        <Script
          id="ga-setup"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute("data-ga", "${SITE.gaId}");`,
          }}
        />
        <Script src="/js/site.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
