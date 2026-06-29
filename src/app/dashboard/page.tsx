import { supabase, supabaseAdmin } from "@/lib/supabase";
import CallAnalyticsDashboard, { CallData } from "@/components/ui/CallAnalyticsDashboard";

// Next.js Server Component
export default async function CallAnalyticsPage() {
  let data = null;
  let error = null;

  const client = supabaseAdmin || supabase;
  if (client) {
    const res = await client
      .from("call_analytics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    data = res.data;
    error = res.error;
  } else {
    error = { message: "Supabase client not initialized (check .env.local)" };
  }

  if (error) {
    console.warn("Supabase fetch warning:", error.message || error);
  }

  if (!data) {
    return (
      <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm text-center">
            Warning: Could not connect to Supabase table `call_analytics` (Are credentials set in .env.local?).
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-400">
            No analytics data available.
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <CallAnalyticsDashboard data={data as CallData} />
    </main>
  );
}
