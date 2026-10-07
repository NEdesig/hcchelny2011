// ================================
// SUPABASE CONFIG
// ================================

window.SUPABASE_URL =
  "https://jxlbojosxaaqnyuzohnw.supabase.co";

window.SUPABASE_ANON_KEY =
  "sb_publishable_wNNvPktjjKpz3csoDMo3JA_4duyLAzL";

window.STORAGE_BUCKET = "site-media";


// ================================
// SUPABASE CLIENT
// ================================

window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
