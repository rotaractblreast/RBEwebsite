"use client";

import React, { useState, useEffect, useRef } from "react";

export function Subscribe() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [stamp, setStamp] = useState<number>(0);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const STALE_MS = 30 * 60 * 1000;

  useEffect(() => {
    setStamp(Date.now());
  }, []);

  const handleFocus = () => {
    if (Date.now() - stamp > STALE_MS) {
      setStamp(Date.now());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatus({ text: "Please enter a valid email address.", isError: true });
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_FORMS_API_URL || "";

    if (!apiUrl) {
      setIsPreview(true);
      setSuccess(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          form: "newsletter",
          email: cleanEmail,
          website: website,
          t: stamp || Date.now(),
        }),
        redirect: "follow",
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Unexpected response from the server.");
      }

      if (data && data.ok === true && Number(data.status) === 200) {
        setSuccess(true);
      } else {
        const msg =
          data?.error ||
          (data?.status === 429
            ? "Too many attempts. Try again in a few minutes."
            : data?.status === 403
            ? "Request blocked. Reload the page and try again."
            : "Something went wrong.");
        throw new Error(msg);
      }
    } catch (err: any) {
      setStatus({
        text: `${err.message || "Error submitting."} You can also email info@rotaractblreast.org.`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-surface-container border-y border-outline-variant/40">
      <div className="wrap py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="label-caps mb-2">Stay in the loop</p>
          <h2 className="font-display text-headline-md text-on-surface">Subscribe for updates</h2>
          <p className="text-on-surface-variant mt-1 max-w-md">
            News, events, and causes from Rotaract Bangalore East.
          </p>
        </div>

        <div className="w-full md:max-w-md">
          {!success ? (
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3" noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="subscribe-website">Leave this field empty</label>
                <input
                  id="subscribe-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <label className="sr-only" htmlFor="subscribe-email">
                Email
              </label>
              <input
                id="subscribe-email"
                type="email"
                name="email"
                placeholder="Your email…"
                autoComplete="email"
                required
                value={email}
                onFocus={handleFocus}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary shrink-0 touch-target w-full md:w-auto"
              >
                {loading ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          ) : (
            <div
              className="rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-3"
              role="status"
              tabIndex={-1}
            >
              <p className="text-sm font-medium text-primary">You’re on the list</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {isPreview
                  ? "Preview only - nothing was sent. PUBLIC_FORMS_API_URL is not set."
                  : "Thanks for subscribing - we’ll send news, events, and causes your way."}
              </p>
            </div>
          )}

          {status && (
            <p
              className={`mt-2 text-sm font-medium ${
                status.isError ? "text-error" : "text-primary"
              }`}
              role="alert"
            >
              {status.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
