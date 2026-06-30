"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import VoiceLeadsTable, { VoiceLead } from "@/components/ui/VoiceLeadsTable";

export default function VoiceLeadsPage() {
  const [leads, setLeads] = useState<VoiceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const token = sessionStorage.getItem("billing_auth_token");
        const email = sessionStorage.getItem("billing_user_email");
        
        if (!token) {
          setError("Not logged in");
          setLoading(false);
          return;
        }

        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend.bitlancetechhub.com/api";
        
        // 1. Fetch user's own call history to know which numbers they own
        const historyRes = await fetch(`${BACKEND_URL}/billing/call-history?limit=250`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const historyData = await historyRes.json();
        
        if (!historyData.success) {
          setError(historyData.error || "Failed to fetch call history");
          setLoading(false);
          return;
        }

        const calls = historyData.calls || [];
        const normalize = (p: string) => p.replace(/^\+/, '').replace(/\s/g, '');
        const myPhonesSet = new Set(calls.map((c: any) => normalize(c.customer_number || '')).filter(Boolean));
        const myCallIdsSet = new Set(calls.map((c: any) => String(c.call_id || '')).filter(Boolean));

        // 2. Fetch voice leads from new Supabase
        if (!supabase) {
          setError("Database connection not initialized");
          setLoading(false);
          return;
        }

        const { data: voiceLeads, error: sbError } = await supabase
          .from("lotlite_leads")
          .select("id, call_id, call_time, duration_seconds, preferred_language, purpose, first_name, full_name, mobile_number, email, property_type, city, locality, budget, size_bhk, amenities, move_in_timeline, recording_url, transcript_url, phone_number")
          .order("call_time", { ascending: false });

        if (sbError) {
          setError(sbError.message);
          setLoading(false);
          return;
        }

        // Check if the user has Admin rights
        const isAdmin = email === "bitlanceai@gmail.com";

        // 3. Filter voice leads: show all for admins, otherwise filter by organization's calls
        const filteredLeads = (voiceLeads || []).filter((item: any) => {
          if (isAdmin) return true;
          if (item.call_id && myCallIdsSet.has(String(item.call_id))) return true;
          const num = item.mobile_number || item.phone_number;
          if (num && myPhonesSet.has(normalize(num))) return true;
          return false;
        }) as VoiceLead[];

        setLeads(filteredLeads);
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
