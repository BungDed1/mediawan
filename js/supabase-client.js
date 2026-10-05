/* =====================================================================
   MEDIAWAN - SUPABASE CLIENT
   Membuat satu instance client dan mengeksposnya sebagai `supabaseClient`.
   Dipakai oleh semua halaman (publik maupun admin).
   ===================================================================== */

(function initSupabaseClient() {
  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.error(
      "[Mediawan] Library Supabase belum dimuat. " +
      "Pastikan <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script> " +
      "dimuat SEBELUM js/supabase-client.js."
    );
    return;
  }

  // Satu instance global, dipakai di semua modul JS.
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
})();