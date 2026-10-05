/* =====================================================================
   MEDIAWAN - SEARCH PAGE
   Mencari artikel berdasarkan judul dan isi (ilike).
   URL: pages/search.html?q=<kata kunci>
   ===================================================================== */

const SEARCH_STATE = {
  q: "",
  limit: 30,
};

document.addEventListener("DOMContentLoaded", () => {
  initPageChrome({ active: "", footer: true });

  const input = document.getElementById("mw-search-page-input");
  SEARCH_STATE.q = (getQueryParam("q") || "").trim();
  if (input) input.value = SEARCH_STATE.q;

  // Submit form pencarian -> update URL
  const form = document.getElementById("mw-search-form-page");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input?.value || "").trim();
    if (!q) return;
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });

  if (!SEARCH_STATE.q) {
    setText(document.getElementById("mw-search-info"),
      "Masukkan kata kunci untuk mulai mencari.");
    document.getElementById("mw-search-results").innerHTML = emptyStateHTML(
      "Belum ada pencarian",
      "Ketik kata kunci di kolom atas, lalu tekan Cari."
    );
    return;
  }

  loadSearchResults();
});

/* -------------------- LOAD HASIL -------------------- */

async function loadSearchResults() {
  const mount = document.getElementById("mw-search-results");
  const info  = document.getElementById("mw-search-info");
  if (!mount) return;

  document.title = `Cari: "${SEARCH_STATE.q}" — Mediawan`;

  mount.innerHTML = skeletonCards(6);
  if (info) info.textContent = `Mencari "${SEARCH_STATE.q}"…`;

  // Escape karakter khusus untuk filter PostgREST (.or)
  const q = SEARCH_STATE.q.replace(/[%,()]/g, " ").trim();
  if (!q) {
    mount.innerHTML = emptyStateHTML("Kata kunci tidak valid", "Coba kata kunci lain.");
    setText(info, "");
    return;
  }
  const pattern = `%${q}%`;

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, content, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .or(`title.ilike.${pattern},content.ilike.${pattern},excerpt.ilike.${pattern}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(SEARCH_STATE.limit);

    if (error) throw error;

    const count = data?.length || 0;
    if (info) {
      info.textContent = count > 0
        ? `Ditemukan ${count} artikel untuk "${SEARCH_STATE.q}".`
        : `Tidak ada hasil untuk "${SEARCH_STATE.q}".`;
    }

    if (count === 0) {
      mount.innerHTML = emptyStateHTML(
        "Tidak ada hasil",
        "Coba kata kunci yang lebih umum atau periksa ejaanmu."
      );
      return;
    }

    mount.innerHTML = data
      .map((a) => articleCardHTML(a, { prefix: "" }))
      .join("");
  } catch (err) {
    console.error("[search] error:", err);
    setText(info, "Terjadi kesalahan saat mencari.");
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}