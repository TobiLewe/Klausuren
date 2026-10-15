// Öffentliche Konfiguration für die Browser-Anwendung.
// Der Publishable-Key ist kein Secret. Die tatsächliche Sicherheit
// wird durch Row Level Security und Datenbankrechte sichergestellt.
(() => {
  const SUPABASE_URL = "https://taborotlsgsgghrwhdga.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TGk8R6DLn81v_WVMuGXP2w_mednCgaY";

  window.studiumSupabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;
})();
