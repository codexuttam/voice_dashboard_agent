import { supabase, supabaseAdmin } from "@/lib/supabase";
import VoiceLeadsTable, { VoiceLead } from "@/components/ui/VoiceLeadsTable";

export default async function VoiceLeadsPage() {
  let leads: VoiceLead[] | null = null;
  let error = null;

  const client = supabaseAdmin || supabase;
  if (client) {
    const res = await client
      .from("lotlite_leads")
      .select(
        "id, call_id, call_time, duration_seconds, preferred_language, purpose, full_name, mobile_number, email, property_type, city, locality, budget, size_bhk, amenities, move_in_timeline, recording_url, transcript_url, phone_number"
      )
      .order("call_time", { ascending: false })
      .limit(100);

    leads = res.data as VoiceLead[];
    error = res.error;
  } else {
    error = { message: "Supabase client not initialized (check .env.local)" };
  }

  if (error) {
    console.warn("Supabase fetch warning on voice-leads page:", error.message || error);
  }

  const displayLeads = leads || [];

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-2 border-red-600">
          <strong>Warning:</strong> Could not fetch from Supabase table{" "}
          <code>lotlite_leads</code>.
          <br />
          <pre className="mt-2 text-xs">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {leads?.length === 0 && !error && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm border-2 border-blue-600">
          <strong>Debug Info:</strong> The query succeeded but returned 0 rows. 
          This usually means either the table is empty or Row Level Security (RLS) is blocking the read access for the anonymous key.
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-100">
          Voice Leads
        </h1>
        <p className="text-slate-400 mt-1">
          All inbound leads captured by the Bitlance Voice Dashboard.
        </p>
      </div>

      <VoiceLeadsTable leads={displayLeads} />
    </main>
  );
}
