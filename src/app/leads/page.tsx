import { supabase, supabaseAdmin } from "@/lib/supabase";
import LeadsTable, { LeadRecord } from "@/components/ui/LeadsTable";

export default async function LeadsPage() {
  let leads: LeadRecord[] | null = null;
  let error = null;

  const client = supabaseAdmin || supabase;
  if (client) {
    const res = await client
      .from("call_analytics")
      .select("id, created_at, call_outcome, interest_level, buying_intent, overall_sentiment, customer_name, customer_phone")
      .order("created_at", { ascending: false })
      .limit(50);
    
    leads = res.data as LeadRecord[];
    error = res.error;
  } else {
    error = { message: "Supabase client not initialized (check .env.local)" };
  }

  if (error) {
    console.warn("Supabase fetch warning on leads page:", error.message || error);
  }

  const displayLeads = leads || [];

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {error && (
        <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-lg text-sm border border-rose-500/20">
          <strong>Warning:</strong> Could not fetch leads from Supabase table `call_analytics`.
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-100">
          Leads Pipeline
        </h1>
        <p className="text-slate-400 mt-1">
          Track and manage your incoming calls and qualified prospects.
        </p>
      </div>

      <LeadsTable leads={displayLeads} />
    </main>
  );
}
