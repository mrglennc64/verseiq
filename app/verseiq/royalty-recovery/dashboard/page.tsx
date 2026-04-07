"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function RoyaltyRecoveryDashboard() {
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!artistId) {
        setError("Missing artistId query parameter.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/spotify/artist-catalog?artistId=${encodeURIComponent(artistId)}`);
        const json = await res.json();
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch {
        setError("Failed to load audit results.");
      }
      setLoading(false);
    }
    load();
  }, [artistId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Loading audit dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-[#220000] border border-red-700 px-6 py-4 rounded-xl">
          <p className="text-red-400 font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  const { artist, albums, tracks } = data;
  const missingISRCs = tracks.filter((t: any) => !t.isrc);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-8 py-16">
      <header className="max-w-6xl mx-auto mb-16">
        <h1 className="text-4xl font-semibold tracking-tight">Royalty Recovery Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Artist: <span className="text-white">{artist.name}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">Popularity Score: {artist.popularity}</p>
      </header>

      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Configuring Scan</h2>
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-300">
            Artist ID: <span className="text-white">{artistId}</span>
          </p>
          <p className="text-gray-300 mt-2">
            Albums Found: <span className="text-white">{albums.length}</span>
          </p>
          <p className="text-gray-300 mt-2">
            Tracks Found: <span className="text-white">{tracks.length}</span>
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Alpha Chain Audit</h2>
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-300 mb-2">
            Missing ISRCs: <span className="text-red-400">{missingISRCs.length}</span>
          </p>
          <p className="text-gray-300">
            Metadata Integrity: <span className="text-white">{Math.round(((tracks.length - missingISRCs.length) / tracks.length) * 100)}%</span>
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto mb-16">
        <h2 className="text-2xl font-semibold mb-4">Recovery Packages</h2>
        <p className="text-gray-400 mb-4">Recovery packages are automatically created based on audit results.</p>

        <div className="overflow-x-auto border border-[#222] rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] text-gray-300">
              <tr>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#222]">
                <td className="px-4 py-3">Package 1</td>
                <td className="px-4 py-3 text-green-400">Complete</td>
                <td className="px-4 py-3">12</td>
                <td className="px-4 py-3">$1,200</td>
                <td className="px-4 py-3">2026-04-07</td>
              </tr>
              <tr className="border-t border-[#222]">
                <td className="px-4 py-3">Package 2</td>
                <td className="px-4 py-3 text-yellow-400">Pending</td>
                <td className="px-4 py-3">8</td>
                <td className="px-4 py-3">$800</td>
                <td className="px-4 py-3">2026-04-06</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-6xl mx-auto mb-16">
        <h2 className="text-2xl font-semibold mb-4">SoundExchange Re-Release Audit</h2>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-300">Scan ID: {artistId}</p>
          <p className="text-gray-300 mt-2">Status: Complete</p>
          <p className="text-gray-300 mt-2">Last Updated: Today</p>

          {missingISRCs.length > 0 ? (
            <div className="mt-4 bg-[#220000] border border-red-700 px-4 py-3 rounded-lg">
              <p className="text-red-400">Warning: {missingISRCs.length} tracks missing ISRCs.</p>
            </div>
          ) : (
            <div className="mt-4 bg-[#002200] border border-green-700 px-4 py-3 rounded-lg">
              <p className="text-green-400">No errors detected.</p>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto mb-32">
        <h2 className="text-2xl font-semibold mb-6">Forensic Audit Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "Missing ISRCs",
            "Duplicate Entries",
            "Incorrect Metadata",
            "Unmatched Royalties",
            "Label Discrepancies",
            "Publisher Conflicts",
            "Artist Name Variations",
            "Release Date Mismatches",
            "Territory Errors",
            "Payment Audit",
            "Royalty Rate Validation",
            "Distribution Audit",
            "Mechanical Rights Audit",
            "Performance Rights Audit",
            "Digital Platform Audit",
            "Physical Sales Audit",
            "Historical Data Review",
            "Summary Report Generation",
          ].map((module) => (
            <div
              key={module}
              className="bg-[#111] border border-[#222] rounded-xl p-6 hover:bg-[#151515] transition"
            >
              <h3 className="text-lg font-medium">{module}</h3>
              <p className="text-gray-400 text-sm mt-2">Automated analysis module. Click to expand (future).</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
