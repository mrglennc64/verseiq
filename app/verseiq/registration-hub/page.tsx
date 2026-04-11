"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  STATUS_LABELS,
  type RegistrationStatusCode,
} from "@/lib/registration/status";

type OverallStatus = "FULLY_REGISTERED" | "ACTION_REQUIRED" | "IN_PROGRESS" | "INCOMPLETE";

type HubResponse = {
  artist: { id: string; legalName: string; stageName: string | null; email: string | null };
  soundexchange: RegistrationStatusCode;
  mlc: RegistrationStatusCode;
  byOrg: Record<string, RegistrationStatusCode>;
  overall: OverallStatus;
};

const STATUS_TONE: Record<RegistrationStatusCode, string> = {
  NOT_STARTED: "text-neutral-400",
  INTAKE_IN_PROGRESS: "text-sky-300",
  PACKET_GENERATED: "text-amber-300",
  ARTIST_ACTION_REQUIRED: "text-orange-400",
  SUBMITTED: "text-violet-300",
  VERIFIED: "text-lime-300",
  ACTIVE: "text-emerald-400",
};

const OVERALL_TONE: Record<OverallStatus, { text: string; bg: string; border: string; label: string }> = {
  FULLY_REGISTERED: {
    text: "text-emerald-300",
    bg: "bg-emerald-900/20",
    border: "border-emerald-700",
    label: "Fully Registered",
  },
  ACTION_REQUIRED: {
    text: "text-orange-300",
    bg: "bg-orange-900/20",
    border: "border-orange-700",
    label: "Action Required",
  },
  IN_PROGRESS: {
    text: "text-sky-300",
    bg: "bg-sky-900/20",
    border: "border-sky-700",
    label: "In Progress",
  },
  INCOMPLETE: {
    text: "text-neutral-400",
    bg: "bg-neutral-900/40",
    border: "border-neutral-700",
    label: "Incomplete",
  },
};

function RegistrationHubContent() {
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId") || "";

  const [data, setData] = useState<HubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setError("Missing artistId query parameter. Try /verseiq/registration-hub?artistId=YOUR_ID");
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/artist/registration-hub/status?artistId=${encodeURIComponent(artistId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        if (!mounted) return;
        setData(json as HubResponse);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [artistId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0807] text-white flex items-center justify-center">
        <p className="text-[#c9b6a7]">Loading registration hub…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0807] text-white px-6 py-12 md:px-10">
        <header className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Registration Hub</h1>
        </header>
        <div className="max-w-4xl mx-auto rounded-xl border border-red-700 bg-[#2b1111] px-6 py-4">
          <p className="text-red-300">{error || "Unable to load registration data."}</p>
        </div>
      </div>
    );
  }

  const overallTone = OVERALL_TONE[data.overall];
  const displayName = data.artist.stageName || data.artist.legalName;

  return (
    <div className="min-h-screen bg-[#0a0807] text-white px-6 py-10 md:px-10 md:py-12">
      <header className="max-w-5xl mx-auto mb-10 rounded-3xl border border-[#3a2d22] bg-gradient-to-br from-[#1a1410] via-[#221a13] to-[#0d0a08] p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.24em] text-[#ceaf97] mb-4">Registration Hub</p>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-3">
          {displayName}
        </h1>
        <p className="text-lg text-[#e7d6c8] max-w-2xl">
          VerseIQ checks your catalog and guides you through SoundExchange and MLC setup. See where you&apos;re
          registered, what&apos;s missing, and what to do next.
        </p>
      </header>

      <section className="max-w-5xl mx-auto mb-8">
        <div className={`rounded-2xl border ${overallTone.border} ${overallTone.bg} p-6 md:p-8`}>
          <p className="text-xs uppercase tracking-widest text-[#b59a84] mb-2">Overall Status</p>
          <p className={`text-3xl md:text-4xl font-semibold ${overallTone.text}`}>{overallTone.label}</p>
          <p className="text-sm text-[#dac8b8] mt-3 max-w-2xl">{overallCopy(data.overall)}</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5 mb-10">
        <RegistrationCard
          title="SoundExchange"
          description="Digital performance royalties for sound recordings. SoundExchange pays the master rights holder when your music is played on satellite, internet, or cable radio."
          status={data.soundexchange}
          href={`/verseiq/soundexchange-gaps`}
          linkLabel="Check SoundExchange Gaps"
        />
        <RegistrationCard
          title="MLC"
          description="Mechanical Licensing Collective. Pays the songwriter/publisher side when your composition is reproduced on streaming services and downloads."
          status={data.mlc}
          href={`/verseiq/catalog`}
          linkLabel="Prepare MLC Catalog"
        />
      </section>

      <section className="max-w-5xl mx-auto rounded-2xl border border-[#3d3127] bg-[#14100d] p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-3">What VerseIQ Does For You</h2>
        <ul className="space-y-2 text-[#d9c7b8] text-sm">
          <li>• Prepares your SoundExchange packet and ingest-ready catalog</li>
          <li>• Generates Letters of Direction (LODs) and split sheets</li>
          <li>• Bundles your catalog metadata with ISRC validation</li>
          <li>• Guides you through the final verification on each platform</li>
        </ul>
        <p className="text-xs text-[#9f8c80] mt-4">
          SoundExchange and MLC require you to personally verify identity, tax info, and payment details. VerseIQ handles
          everything else.
        </p>
      </section>
    </div>
  );
}

function overallCopy(overall: OverallStatus): string {
  switch (overall) {
    case "FULLY_REGISTERED":
      return "Your catalog is fully registered with SoundExchange and MLC. You're collecting what you're owed.";
    case "ACTION_REQUIRED":
      return "VerseIQ has prepared your packet. Complete the short verification step at each platform to finalize.";
    case "IN_PROGRESS":
      return "Your registration is moving. Check the cards below to see which step you're on for each org.";
    case "INCOMPLETE":
    default:
      return "Registration hasn't started yet. Use the cards below to kick off SoundExchange and MLC preparation.";
  }
}

function RegistrationCard({
  title,
  description,
  status,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  status: RegistrationStatusCode;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[#33281f] bg-[#14100d] p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <span className={`text-xs uppercase tracking-wider ${STATUS_TONE[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <p className="text-sm text-[#d9c7b8] mb-5 flex-1">{description}</p>
      <Link
        href={href}
        className="rounded-lg bg-[#e18e5c] text-black font-medium px-4 py-2 text-center hover:bg-[#f3a170] transition"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function RegistrationHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0807] text-white flex items-center justify-center">
          <p className="text-[#c9b6a7]">Loading registration hub…</p>
        </div>
      }
    >
      <RegistrationHubContent />
    </Suspense>
  );
}
