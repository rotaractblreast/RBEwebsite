import React from "react";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";
import { SocialIcon } from "./SocialIcon";

interface Props {
  settings: SiteSettings;
}

export function Footer({ settings }: Props) {
  const year = new Date().getFullYear();
  const social = settings.siteSocial;

  return (
    <footer className="bg-inverse-surface text-inverse-on-surface mt-auto">
      <div className="wrap py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="col-span-2 lg:col-span-4">
            <Link href="/" className="inline-block mb-4">
              <img
                src="/images/site/footer-logo.png"
                alt="Rotaract Bangalore East"
                className="h-12 w-auto"
                width="160"
                height="48"
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-inverse-on-surface/80 mb-4 max-w-xs">
              District 3191 · Sponsored by Rotary Bangalore East. UNITE. RISE. EMPOWER.
            </p>
            <div className="flex gap-3">
              {social.instagram && (
                <a
                  className="touch-target inline-flex items-center justify-center hover:text-primary-container"
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <SocialIcon network="instagram" />
                </a>
              )}
              {social.facebook && (
                <a
                  className="touch-target inline-flex items-center justify-center hover:text-primary-container"
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <SocialIcon network="facebook" />
                </a>
              )}
              {social.linkedin && (
                <a
                  className="touch-target inline-flex items-center justify-center hover:text-primary-container"
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <SocialIcon network="linkedin" />
                </a>
              )}
              {social.twitter && (
                <a
                  className="touch-target inline-flex items-center justify-center hover:text-primary-container"
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                >
                  <SocialIcon network="twitter" />
                </a>
              )}
              {social.youtube && (
                <a
                  className="touch-target inline-flex items-center justify-center hover:text-primary-container"
                  href={social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <SocialIcon network="youtube" />
                </a>
              )}
            </div>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <h2 className="font-display font-semibold text-white mb-4">Explore</h2>
            <ul className="space-y-2 text-sm text-inverse-on-surface/80">
              <li><Link href="/about/" className="hover:text-primary-container">About</Link></li>
              <li><Link href="/news/" className="hover:text-primary-container">News</Link></li>
              <li><Link href="/causes/" className="hover:text-primary-container">Causes</Link></li>
              <li><Link href="/events/" className="hover:text-primary-container">Events</Link></li>
              <li><Link href="/join/" className="hover:text-primary-container">Join Us</Link></li>
            </ul>
          </div>
          <div className="col-span-1 lg:col-span-3">
            <h2 className="font-display font-semibold text-white mb-4">Tools &amp; legal</h2>
            <ul className="space-y-2 text-sm text-inverse-on-surface/80">
              <li><Link href="/search/" className="hover:text-primary-container">Search</Link></li>
              <li><Link href="/brandkit/" className="hover:text-primary-container">Brand Kit</Link></li>
              <li><Link href="/privacy/" className="hover:text-primary-container">Privacy</Link></li>
              <li><Link href="/terms/" className="hover:text-primary-container">Terms</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-3">
            <h2 className="font-display font-semibold text-white mb-4">Contact</h2>
            <ul className="space-y-2 text-sm text-inverse-on-surface/80">
              <li>{settings.location}</li>
              <li>
                <a className="hover:text-primary-container" href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
              <li>
                <a className="hover:text-primary-container" href={`tel:${settings.phone.replace(/\s/g, "")}`}>
                  {settings.phone}
                </a>
              </li>
              <li><Link href="/contact/" className="hover:text-primary-container">Contact →</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-inverse-on-surface/60">
          <p>&copy; {year} Rotaract Bangalore East. All rights reserved.</p>
          <p>RI District 3191</p>
        </div>
      </div>
    </footer>
  );
}
