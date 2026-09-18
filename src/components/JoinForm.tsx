"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  clubEmail: string;
  serviceAreas: string[];
  clubSkills: string[];
}

export function JoinForm({ clubEmail, serviceAreas, clubSkills }: Props) {
  const [stamp, setStamp] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [social, setSocial] = useState("");
  const [occupation, setOccupation] = useState<"student" | "professional" | "">("");
  const [organization, setOrganization] = useState("");
  const [rotaractStatus, setRotaractStatus] = useState<"new" | "experienced" | "">("");
  const [why, setWhy] = useState("");
  const [clubName, setClubName] = useState("");
  const [journey, setJourney] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [contribute, setContribute] = useState<string[]>([]);
  const [hasContributeOther, setHasContributeOther] = useState(false);
  const [contributeOther, setContributeOther] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot

  useEffect(() => {
    setStamp(Date.now());
  }, []);

  const handleCheckbox = (item: string) => {
    setContribute((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Basic Validations
    if (!name.trim()) return setErrorMsg("Please enter your full name.");
    if (!email.trim() || !email.includes("@")) return setErrorMsg("Please enter a valid email address.");
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim()))
      return setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
    if (!occupation) return setErrorMsg("Please select whether you are studying or working.");
    if (!organization.trim()) return setErrorMsg("Please enter your college or company name.");
    if (!dob) return setErrorMsg("Please enter your date of birth.");

    // 18+ check
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return setErrorMsg("You need to be 18 or older to join Rotaract.");
    }

    if (!address.trim()) return setErrorMsg("Please enter your locality / area.");
    if (!rotaractStatus) return setErrorMsg("Please select your Rotaract background.");
    if (rotaractStatus === "new" && !why.trim())
      return setErrorMsg("Please tell us why you would like to join.");
    if (rotaractStatus === "experienced" && (!clubName.trim() || !journey.trim()))
      return setErrorMsg("Please enter your previous club name and journey.");
    if (!hobbies.trim()) return setErrorMsg("Please tell us about your hobbies and interests.");

    const apiUrl = process.env.NEXT_PUBLIC_FORMS_API_URL || "";

    if (!apiUrl) {
      setIsPreview(true);
      setSubmitted(true);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        email,
        phone,
        dob,
        gender,
        address,
        social,
        organizationType: occupation,
        organization,
        rotaractStatus,
        why: rotaractStatus === "new" ? why : "",
        clubName: rotaractStatus === "experienced" ? clubName : "",
        journey: rotaractStatus === "experienced" ? journey : "",
        hobbies,
        contribute: contribute.join(", "),
        contributeOther: hasContributeOther ? contributeOther : "",
        website,
        t: stamp || Date.now(),
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Unexpected response from server.");
      }

      if (data && data.ok === true && Number(data.status) === 200) {
        setSubmitted(true);
      } else {
        throw new Error(data?.error || "Submission failed. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        id="join-success"
        className="rounded-xl border border-primary-container/40 bg-primary-container/10 px-6 py-10 sm:px-8"
        role="status"
      >
        <p className="label-caps text-primary mb-3">Application received</p>
        <h3 className="font-display text-headline-md mb-3">Thank you</h3>
        <p className="text-on-surface-variant mb-2">
          {isPreview
            ? "Preview only - nothing was sent because PUBLIC_FORMS_API_URL is not set."
            : "We’ve got your application. Our membership team will get in touch within about a week with next steps - usually an invite to meet the club."}
        </p>
        <p className="text-sm text-on-surface-variant mb-8">
          Check your inbox (and spam folder) for a confirmation. Questions in the meantime? Write to{" "}
          <a href={`mailto:${clubEmail}`} className="text-primary underline">
            {clubEmail}
          </a>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/events/" className="btn btn-outline">
            See upcoming events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
      {/* Honeypot */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="join-website">Website</label>
        <input
          id="join-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* 1. Contact Details */}
      <fieldset className="space-y-4">
        <legend className="form-legend mb-1 font-display font-bold text-lg text-on-surface border-b border-outline-variant/30 pb-2 w-full">
          Get in touch
        </legend>
        <div className="form-field">
          <label htmlFor="join-name" className="block text-sm font-semibold mb-1">
            Full name <span className="text-error">*</span>
          </label>
          <input
            id="join-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="form-field">
            <label htmlFor="join-email" className="block text-sm font-semibold mb-1">
              Email <span className="text-error">*</span>
            </label>
            <input
              id="join-email"
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="form-field">
            <label htmlFor="join-phone" className="block text-sm font-semibold mb-1">
              Mobile number <span className="text-error">*</span>
            </label>
            <input
              id="join-phone"
              type="tel"
              required
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 2. Occupation */}
      <fieldset className="space-y-4">
        <legend className="form-legend mb-1 font-display font-bold text-lg text-on-surface border-b border-outline-variant/30 pb-2 w-full">
          What you do
        </legend>
        <div>
          <label className="block text-sm font-semibold mb-2">
            Are you studying or working right now? <span className="text-error">*</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                occupation === "student"
                  ? "border-primary bg-primary-container/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name="occupation"
                value="student"
                checked={occupation === "student"}
                onChange={() => setOccupation("student")}
                className="text-primary focus:ring-primary"
              />
              <div>
                <span className="block font-semibold text-sm">Student</span>
                <span className="block text-xs text-on-surface-variant">In college or university</span>
              </div>
            </label>

            <label
              className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                occupation === "professional"
                  ? "border-primary bg-primary-container/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name="occupation"
                value="professional"
                checked={occupation === "professional"}
                onChange={() => setOccupation("professional")}
                className="text-primary focus:ring-primary"
              />
              <div>
                <span className="block font-semibold text-sm">Working professional</span>
                <span className="block text-xs text-on-surface-variant">Employed or working full-time</span>
              </div>
            </label>
          </div>
        </div>

        {occupation && (
          <div className="form-field pt-2">
            <label htmlFor="join-org" className="block text-sm font-semibold mb-1">
              {occupation === "student" ? "College / university" : "Company / organisation"}{" "}
              <span className="text-error">*</span>
            </label>
            <input
              id="join-org"
              type="text"
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        )}
      </fieldset>

      {/* 3. A Bit About You */}
      <fieldset className="space-y-4">
        <legend className="form-legend mb-1 font-display font-bold text-lg text-on-surface border-b border-outline-variant/30 pb-2 w-full">
          A bit about you
        </legend>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="form-field">
            <label htmlFor="join-dob" className="block text-sm font-semibold mb-1">
              Date of birth <span className="text-error">*</span>
            </label>
            <input
              id="join-dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-xs text-on-surface-variant mt-1">To confirm Rotaract age eligibility (18+).</p>
          </div>

          <div className="form-field">
            <label htmlFor="join-gender" className="block text-sm font-semibold mb-1">
              Gender
            </label>
            <select
              id="join-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="join-address" className="block text-sm font-semibold mb-1">
            Area / locality in Bangalore <span className="text-error">*</span>
          </label>
          <input
            id="join-address"
            type="text"
            required
            placeholder="e.g. Indiranagar, Whitefield, Koramangala"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="form-field">
          <label htmlFor="join-social" className="block text-sm font-semibold mb-1">
            Social profile (LinkedIn / Instagram / Twitter)
          </label>
          <input
            id="join-social"
            type="url"
            placeholder="https://linkedin.com/in/..."
            value={social}
            onChange={(e) => setSocial(e.target.value)}
            className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </fieldset>

      {/* 4. Rotaract Story */}
      <fieldset className="space-y-4">
        <legend className="form-legend mb-1 font-display font-bold text-lg text-on-surface border-b border-outline-variant/30 pb-2 w-full">
          Your Rotaract story
        </legend>
        <div>
          <label className="block text-sm font-semibold mb-2">
            Have you been part of Rotaract or Interact before? <span className="text-error">*</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                rotaractStatus === "new"
                  ? "border-primary bg-primary-container/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name="rotaractStatus"
                value="new"
                checked={rotaractStatus === "new"}
                onChange={() => setRotaractStatus("new")}
                className="text-primary focus:ring-primary"
              />
              <div>
                <span className="block font-semibold text-sm">New to Rotaract</span>
                <span className="block text-xs text-on-surface-variant">This would be my first club</span>
              </div>
            </label>

            <label
              className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                rotaractStatus === "experienced"
                  ? "border-primary bg-primary-container/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name="rotaractStatus"
                value="experienced"
                checked={rotaractStatus === "experienced"}
                onChange={() => setRotaractStatus("experienced")}
                className="text-primary focus:ring-primary"
              />
              <div>
                <span className="block font-semibold text-sm">Yes, previously involved</span>
                <span className="block text-xs text-on-surface-variant">In Rotaract or Interact</span>
              </div>
            </label>
          </div>
        </div>

        {rotaractStatus === "new" && (
          <div className="form-field pt-2">
            <label htmlFor="join-why" className="block text-sm font-semibold mb-1">
              Why do you want to join Rotaract Bangalore East? <span className="text-error">*</span>
            </label>
            <textarea
              id="join-why"
              rows={3}
              required
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Tell us what sparked your interest and what you hope to get out of it…"
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        )}

        {rotaractStatus === "experienced" && (
          <div className="space-y-4 pt-2">
            <div className="form-field">
              <label htmlFor="join-club-name" className="block text-sm font-semibold mb-1">
                Previous / current club name <span className="text-error">*</span>
              </label>
              <input
                id="join-club-name"
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="form-field">
              <label htmlFor="join-journey" className="block text-sm font-semibold mb-1">
                Tell us about your journey in Rotaract so far <span className="text-error">*</span>
              </label>
              <textarea
                id="join-journey"
                rows={3}
                required
                value={journey}
                onChange={(e) => setJourney(e.target.value)}
                placeholder="Roles held, memorable projects, or reasons for transferring/rejoining…"
                className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* 5. Interests & Contributions */}
      <fieldset className="space-y-4">
        <legend className="form-legend mb-1 font-display font-bold text-lg text-on-surface border-b border-outline-variant/30 pb-2 w-full">
          Interests &amp; contributions
        </legend>
        <div className="form-field">
          <label htmlFor="join-hobbies" className="block text-sm font-semibold mb-1">
            Hobbies &amp; passions outside work/study <span className="text-error">*</span>
          </label>
          <textarea
            id="join-hobbies"
            rows={2}
            required
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            placeholder="Photography, sports, reading, baking, debating, gaming…"
            className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            How would you like to contribute to the club? (Select all that apply)
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {[...serviceAreas, ...clubSkills].map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 p-2.5 rounded border border-outline-variant/50 hover:bg-surface-container-low cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={contribute.includes(item)}
                  onChange={() => handleCheckbox(item)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>{item}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 p-2.5 rounded border border-outline-variant/50 hover:bg-surface-container-low cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={hasContributeOther}
                onChange={() => setHasContributeOther(!hasContributeOther)}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Something else</span>
            </label>
          </div>
        </div>

        {hasContributeOther && (
          <div className="form-field pt-2">
            <label htmlFor="join-other" className="block text-sm font-semibold mb-1">
              Please specify
            </label>
            <input
              id="join-other"
              type="text"
              value={contributeOther}
              onChange={(e) => setContributeOther(e.target.value)}
              placeholder="Other ideas or special skills…"
              className="w-full rounded border border-outline-variant px-3 py-2.5 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        )}
      </fieldset>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary px-8 py-3 text-base w-full sm:w-auto"
        >
          {loading ? "Submitting application…" : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
