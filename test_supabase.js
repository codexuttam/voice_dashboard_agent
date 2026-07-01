const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://paskzwoegduhzehkxoyu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc2t6d29lZ2R1aHplaGt4b3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU2MDQ4OSwiZXhwIjoyMDc3MTM2NDg5fQ.r8X-0gnfI7zseMzo4yENBqL1ezbBUcnBdPn20UB6wI8');
async function run() {
  const { data, error } = await supabase.from('call_analytics').select('id').limit(1);
  console.log('call_analytics', data, error);
}
run();
