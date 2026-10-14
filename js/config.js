
window.SUPABASE_URL =
  "https://jxlbojosxaaqnyuzohnw.supabase.co";

window.SUPABASE_ANON_KEY =
  "ВСТАВЬ_СВОЙ_PUBLISHABLE_KEY";

window.STORAGE_BUCKET = "site-media";

if (!window.supabase) {
  throw new Error("Supabase SDK не загружен");
}

window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
