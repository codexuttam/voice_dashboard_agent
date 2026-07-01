"use client";

import React, { useEffect, useState } from "react";
import VoiceLeadsTable, { VoiceLead } from "@/components/ui/VoiceLeadsTable";

export default function VoiceLeadsPage() {
  const [leads, setLeads] = useState<VoiceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const token = sessionStorage.getItem("billing_auth_token");
        
        if (!token) {
          setError("Not logged in");
          setLoading(false);
          return;
        }

        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend.bitlancetechhub.com/api";
        
        const res = await fetch(`${BACKEND_URL}/billing/voice-leads`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!data.success) {
          setError(data.error || "Failed to fetch voice leads");
          setLoading(false);
          return;
        }

        setLeads(data.leads || []);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="animate-pulse">Loading voice leads...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center h-64 text-rose-400 font-semibold">
          Error: {error}
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Voice Leads
        </h1>
        <p className="text-slate-400 mt-1">
          All inbound leads captured by the Voice Dashboard.
        </p>
      </div>

      <VoiceLeadsTable leads={leads} />
    </main>
  );
}
