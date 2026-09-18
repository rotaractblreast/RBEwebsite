import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <section className="section-pad">
      <div className="wrap max-w-xl text-center py-16">
        <p className="label-caps mb-3">404</p>
        <h1 className="font-display text-headline-lg mb-4">Page not found</h1>
        <p className="text-on-surface-variant mb-8">That URL doesn’t exist on this site.</p>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </section>
  );
}
