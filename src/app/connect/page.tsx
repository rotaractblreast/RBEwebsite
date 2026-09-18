import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Connect Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConnectLauncherPage() {
  return (
    <>
      <PageHero
        title="RBE Connect Portal"
        eyebrow="Reviewer &amp; Officer Access"
        lead="Private applicant review dashboard and officer notification portal."
      />
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Connect" }]} />

      <section className="section-pad">
        <div className="wrap max-w-xl text-center py-8">
          <div className="size-16 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl" aria-hidden="true">
              dashboard_customize
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-on-surface mb-3">
            Officer &amp; Reviewer Portal
          </h2>
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            The RBE Connect Reviewer Portal is an independent standalone web application with dedicated PWA capabilities, offline storage, and push notifications.
          </p>

          <div className="card p-6 border border-outline-variant/30 text-left mb-8 bg-surface-container-low">
            <h3 className="font-semibold text-sm mb-2 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">
                info
              </span>
              Portal Deployment
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Club officers can access the portal directly at the dedicated reviewer subdomain (or standalone PWA installation).
            </p>
            <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 font-mono text-xs text-stone-700 select-all">
              https://connect.rotaractblreast.org/
            </div>
          </div>

          <Link href="/" className="btn btn-primary">
            Return to Homepage
          </Link>
        </div>
      </section>
    </>
  );
}
