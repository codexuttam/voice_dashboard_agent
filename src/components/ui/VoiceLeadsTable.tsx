"use client";

import React, { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Home,
  IndianRupee,
  Clock,
  Mic,
  Languages,
  Search,
  Filter,
  Trash2,
  X,
  Check,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/** Downloads transcript text from a URL as a .txt file */
function TranscriptButton({ url, name }: { url: string; name?: string | null }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(url);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${name || "transcript"}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download Transcript"
      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
    >
      {loading
        ? <span className="w-4 h-4 block border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        : <Download className="w-4 h-4" />
      }
    </button>
  );
}

export interface VoiceLead {
  id: string | number;
  call_id: string;
  call_time: string | null;
  duration_seconds: string | null;
  preferred_language: string | null;
  purpose: string | null;
  first_name: string | null;
  full_name: string | null;
  mobile_number: string | null;
  email: string | null;
  property_type: string | null;
  city: string | null;
  locality: string | null;
  budget: string | null;
  size_bhk: string | null;
  amenities: string | null;
  move_in_timeline: string | null;
  recording_url: string | null;
  transcript_url: string | null;
  phone_number: string | null;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md p-5">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const languageBadgeClasses = (lang: string | null) => {
  if (!lang) return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  switch (lang.toLowerCase()) {
    case "marathi": return "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    case "hindi":   return "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800";
    default:        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
};

const purposeBadgeClasses = (pur: string | null) => {
  if (!pur) return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  switch (pur.toLowerCase()) {
    case "rent": return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    case "buy":  return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    default:     return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
};

function formatDuration(seconds: string | null) {
  if (!seconds) return "—";
  const s = parseFloat(seconds);
  if (isNaN(s)) return "—";
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function formatDate(dt: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dt;
  }
}

export default function VoiceLeadsTable({ leads }: { leads: VoiceLead[] }) {
  const [rows, setRows] = useState<VoiceLead[]>(leads);
  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<"all" | "rent" | "buy">("all");
  const [confirmId, setConfirmId] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState<string | number | null>(null);

  async function handleDelete(lead: VoiceLead) {
    setDeleting(lead.id);
    if (supabase) {
      await supabase.from("lotlite_leads").delete().eq("id", lead.id);
    }
    setRows((prev) => prev.filter((r) => r.id !== lead.id));
    setConfirmId(null);
    setDeleting(null);
  }

  const filtered = rows.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (l.full_name ?? "").toLowerCase().includes(q) ||
      (l.first_name ?? "").toLowerCase().includes(q) ||
      (l.phone_number ?? "").toLowerCase().includes(q) ||
      (l.city ?? "").toLowerCase().includes(q) ||
      (l.property_type ?? "").toLowerCase().includes(q);
    const matchPurpose =
      purposeFilter === "all" || (l.purpose ?? "").toLowerCase() === purposeFilter;
    return matchSearch && matchPurpose;
  });

  const total = rows.length;
  const rentCount = rows.filter((l) => l.purpose?.toLowerCase() === "rent").length;
  const buyCount  = rows.filter((l) => l.purpose?.toLowerCase() === "buy").length;
  const topCity = (() => {
    const counts: Record<string, number> = {};
    rows.forEach((l) => { if (l.city) counts[l.city] = (counts[l.city] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  })();
  const avgDuration = (() => {
    const valid = rows.map((l) => parseFloat(l.duration_seconds ?? "")).filter((n) => !isNaN(n));
    if (!valid.length) return "—";
    return formatDuration(String(valid.reduce((a, b) => a + b, 0) / valid.length));
  })();

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Calls"  value={total} />
        <StatCard label="Rent Leads"   value={rentCount} sub={`${buyCount} buying`} />
        <StatCard label="Top City"     value={topCity} />
        <StatCard label="Avg Duration" value={avgDuration} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur-md"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {(["all", "rent", "buy"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setPurposeFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                purposeFilter === v
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/10"
                  : "bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards — visible below md */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900/40 backdrop-blur-md">No leads found.</div>
        ) : filtered.map((lead) => (
          <div key={lead.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-black text-slate-900 dark:text-slate-100 text-base">
                  {lead.full_name?.trim() || lead.first_name?.trim() || <span className="text-slate-500 font-normal">No name</span>}
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {lead.phone_number?.trim() || <span className="text-slate-500">No phone</span>}
                </div>
                {lead.email?.trim() && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                     <Mail className="w-3 h-3 shrink-0" />
                    {lead.email.trim()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {confirmId === lead.id ? (
                  <>
                    <button onClick={() => handleDelete(lead)} disabled={deleting === lead.id}
                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
                      {deleting === lead.id
                        ? <span className="w-4 h-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setConfirmId(null)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmId(lead.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${languageBadgeClasses(lead.preferred_language)}`}>
                {lead.preferred_language || "—"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${purposeBadgeClasses(lead.purpose)}`}>
                {lead.purpose || "—"}
              </span>
              {lead.property_type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 capitalize">
                  <Home className="w-3 h-3 text-slate-400" />{lead.property_type}
                </span>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Location</p>
                <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  {[lead.locality, lead.city].filter(Boolean).join(", ") || "—"}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Budget</p>
                <div className="flex items-center gap-1 text-slate-900 dark:text-slate-200 font-bold mt-0.5">
                  <IndianRupee className="w-3 h-3 text-slate-400 shrink-0" />
                  {lead.budget || "—"}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">BHK / Size</p>
                <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">{lead.size_bhk || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Timeline</p>
                <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  {lead.move_in_timeline || "—"}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400">{formatDate(lead.call_time)} · {formatDuration(lead.duration_seconds)}</span>
              <div className="flex items-center gap-1">
                {lead.recording_url && (
                  <a href={lead.recording_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <Mic className="w-4 h-4" />
                  </a>
                )}
                {lead.transcript_url && (
                  <TranscriptButton url={lead.transcript_url} name={lead.full_name || lead.phone_number} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table — hidden below md */}
      <div className="hidden md:block bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">No leads found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4 font-bold tracking-wide">Caller</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Language</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Purpose</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Property</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Location</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Budget</th>
                  <th className="px-5 py-4 font-bold tracking-wide">BHK / Size</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Timeline</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Duration</th>
                  <th className="px-5 py-4 font-bold tracking-wide">Date</th>
                  <th className="px-5 py-4 font-bold tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

                    {/* Caller */}
                    <td className="px-5 py-4 min-w-[160px]">
                      <div className="font-bold text-slate-950 dark:text-slate-200">
                        {lead.full_name?.trim() || lead.first_name?.trim() || <span className="text-slate-500 font-normal">No name</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3 shrink-0 text-emerald-500" />
                        <span>{lead.phone_number?.trim() || <span className="text-slate-500">No phone</span>}</span>
                      </div>
                      {lead.email?.trim() && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          {lead.email.trim()}
                        </div>
                      )}
                    </td>

                    {/* Language */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${languageBadgeClasses(lead.preferred_language)}`}>
                          {lead.preferred_language || "—"}
                        </span>
                      </div>
                    </td>

                    {/* Purpose */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${purposeBadgeClasses(lead.purpose)}`}>
                        {lead.purpose || "—"}
                      </span>
                    </td>

                    {/* Property */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="capitalize">{lead.property_type || "—"}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{[lead.locality, lead.city].filter(Boolean).join(", ") || "—"}</span>
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 font-bold text-slate-950 dark:text-slate-200">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {lead.budget || "—"}
                      </div>
                    </td>

                    {/* BHK */}
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {lead.size_bhk || "—"}
                    </td>

                    {/* Timeline */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {lead.move_in_timeline || "—"}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 tabular-nums font-medium">
                      {formatDuration(lead.duration_seconds)}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(lead.call_time)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {lead.recording_url && (
                          <a
                            href={lead.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Recording"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-colors"
                          >
                            <Mic className="w-4 h-4" />
                          </a>
                        )}
                        {lead.transcript_url && (
                          <TranscriptButton url={lead.transcript_url} name={lead.full_name || lead.phone_number} />
                        )}

                        {confirmId === lead.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(lead)}
                              disabled={deleting === lead.id}
                              title="Confirm delete"
                              className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            >
                              {deleting === lead.id
                                ? <span className="w-4 h-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              title="Cancel"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(lead.id)}
                            title="Delete lead"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* end hidden md:block */}

      <p className="text-xs text-slate-500 text-right font-medium">
        Showing {filtered.length} of {total} calls
      </p>
    </div>
  );
}
