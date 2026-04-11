"use client";

import { useCallback, useEffect, useState } from "react";
import {
  REGISTRATION_STATUSES,
  STATUS_LABELS,
  type RegistrationStatusCode,
} from "@/lib/registration/status";

type Row = {
  artistId: string;
  artistName: string;
  legalName: string;
  email: string | null;
  soundexchange: RegistrationStatusCode;
  mlc: RegistrationStatusCode;
  overall: "FULLY_REGISTERED" | "ACTION_REQUIRED" | "IN_PROGRESS" | "INCOMPLETE";
  lastUpdate: string;
};

const STATUS_COLORS: Record<RegistrationStatusCode, string> = {
  NOT_STARTED: "text-neutral-400",
  INTAKE_IN_PROGRESS: "text-sky-300",
  PACKET_GENERATED: "text-amber-300",
  ARTIST_ACTION_REQUIRED: "text-orange-400",
  SUBMITTED: "text-violet-300",
  VERIFIED: "text-lime-300",
  ACTIVE: "text-emerald-400",
};

const OVERALL_COLORS: Record<Row["overall"], string> = {
  FULLY_REGISTERED: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  ACTION_REQUIRED: "bg-orange-900/40 text-orange-300 border-orange-700",
  IN_PROGRESS: "bg-sky-900/40 text-sky-300 border-sky-700",
  INCOMPLETE: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

export default function AdminRegistrationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/registration/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(data.rows);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateStatus = async (artistId: string, org: "SOUNDEXCHANGE" | "MLC", status: RegistrationStatusCode) => {
    const key = `${artistId}:${org}:update`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/registration/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, org, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      flashToast(`${org} → ${STATUS_LABELS[status]}`);
      load();
    } catch (e: any) {
      flashToast(`Error: ${e?.message || "update failed"}`);
    } finally {
      setBusyKey(null);
    }
  };

  const remind = async (artistId: string, org: "SOUNDEXCHANGE" | "MLC") => {
    const key = `${artistId}:${org}:remind`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/registration/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, org }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reminder failed");
      flashToast(`Reminder logged for ${org}`);
    } catch (e: any) {
      flashToast(`Error: ${e?.message || "reminder failed"}`);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0807] text-white px-6 py-10 md:px-10 md:py-12">
      <header className="max-w-7xl mx-auto mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[#d0b49d]">Admin</p>
        <h1 className="text-3xl md:text-4xl font-semibold mt-2">Registration Management</h1>
        <p className="text-[#dac8b8] mt-2 max-w-3xl">
          Track SoundExchange and MLC progress across all artists. Mark submissions verified, trigger reminders, and
          see who&apos;s stuck.
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#a58f7d]">{rows.length} artist{rows.length === 1 ? "" : "s"}</p>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-[#4b3d32] px-4 py-2 text-sm text-[#ead7c6] hover:bg-[#1b1511]"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-[#c9b6a7]">Loading…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-700 bg-[#2b1111] px-6 py-4">
            <p className="text-red-300">Error: {error}</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[#a58f7d]">No artists yet. Run <code className="text-[#f2d8bf]">npx tsx scripts/seedRegistration.ts</code> to add demo data.</p>
        ) : (
          <div className="rounded-2xl border border-[#30261f] bg-[#14100d] overflow-hidden">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-[#c0a48d] bg-[#18130e]">
                <tr>
                  <th className="px-4 py-3">Artist</th>
                  <th className="px-4 py-3">Overall</th>
                  <th className="px-4 py-3">SoundExchange</th>
                  <th className="px-4 py-3">MLC</th>
                  <th className="px-4 py-3">Last update</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((r) => (
                  <tr key={r.artistId} className="border-t border-[#2a2119] align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">{r.artistName}</p>
                      {r.legalName !== r.artistName ? (
                        <p className="text-xs text-[#a58f7d]">{r.legalName}</p>
                      ) : null}
                      {r.email ? <p className="text-xs text-[#a58f7d]">{r.email}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-full border px-3 py-1 text-xs ${OVERALL_COLORS[r.overall]}`}>
                        {r.overall.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className={`px-4 py-4 ${STATUS_COLORS[r.soundexchange]}`}>
                      <StatusSelect
                        value={r.soundexchange}
                        busy={busyKey === `${r.artistId}:SOUNDEXCHANGE:update`}
                        onChange={(s) => updateStatus(r.artistId, "SOUNDEXCHANGE", s)}
                      />
                    </td>
                    <td className={`px-4 py-4 ${STATUS_COLORS[r.mlc]}`}>
                      <StatusSelect
                        value={r.mlc}
                        busy={busyKey === `${r.artistId}:MLC:update`}
                        onChange={(s) => updateStatus(r.artistId, "MLC", s)}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-[#a58f7d]">
                      {new Date(r.lastUpdate).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => remind(r.artistId, "SOUNDEXCHANGE")}
                          disabled={busyKey === `${r.artistId}:SOUNDEXCHANGE:remind`}
                          className="text-xs rounded border border-[#4b3d32] px-2 py-1 text-[#ead7c6] hover:bg-[#1b1511] disabled:opacity-40"
                        >
                          Remind SE
                        </button>
                        <button
                          type="button"
                          onClick={() => remind(r.artistId, "MLC")}
                          disabled={busyKey === `${r.artistId}:MLC:remind`}
                          className="text-xs rounded border border-[#4b3d32] px-2 py-1 text-[#ead7c6] hover:bg-[#1b1511] disabled:opacity-40"
                        >
                          Remind MLC
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-[#4b3d32] bg-[#18130e] px-4 py-3 text-sm text-[#ead7c6] shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function StatusSelect({
  value,
  busy,
  onChange,
}: {
  value: RegistrationStatusCode;
  busy: boolean;
  onChange: (next: RegistrationStatusCode) => void;
}) {
  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as RegistrationStatusCode)}
      className="bg-[#0d0a08] border border-[#46372d] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#d08754] disabled:opacity-50"
    >
      {REGISTRATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
