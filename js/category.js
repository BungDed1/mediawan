/* =====================================================================
   MEDIAWAN - CATEGORY PAGE
   Menampilkan daftar artikel per kategori dengan pagination.
   URL: pages/category.html?slug=<slug-kategori>&page=<n>
   ===================================================================== */

const CAT_STATE = {
  slug: null,
  category: null,
  page: 1,
  pageSize: APP.pageSize,
  total: 0,
};

document.addEventListener("DOMContentLoaded", async () => {
  CAT_STATE.slug = getQueryParam("slug");
  CAT_STATE.page = Math.max(1, parseInt(getQueryParam("page") || "1", 10));

  initPageChrome({ active: CAT_STATE.slug || "", footer: true });

  if (!CAT_STATE.slug) {
    showCategoryError("Kategori tidak dipilih.");
    return;
  }

  await loadCategory();
  if (!CAT_STATE.category) return;

  await loadArticles();
});

/* -------------------- LOAD KATEGORI -------------------- */

async function loadCategory() {
  try {
    const { data, error } = await supabaseClient
      .from(TABLES.categories)
      .select("id, name, slug")
      .eq("slug", CAT_STATE.slug)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      showCategoryError("Kategori tidak ditemukan.", "Coba pilih kategori lain dari menu.");
      return;
    }

    CAT_STATE.category = data;

    document.title = `${data.name} — Mediawan`;
    setText(document.getElementById("mw-cat-title"), data.name);
    setText(document.getElementById("mw-cat-crumb"), data.name);
    setText(document.getElementById("mw-cat-desc"), `Semua artikel dalam kategori "${data.name}".`);
  } catch (err) {
    console.error("[category] loadCategory error:", err);
    showCategoryError(friendlyError(err));
  }
}

/* -------------------- LOAD ARTIKEL (dengan pagination) -------------------- */

async function loadArticles() {
  const mount = document.getElementById("mw-cat-grid");
  const pag   = document.getElementById("mw-cat-pagination");
  if (!mount) return;

  mount.innerHTML = skeletonCards(6);
  pag.innerHTML = "";

  const from = (CAT_STATE.page - 1) * CAT_STATE.pageSize;
  const to   = from + CAT_STATE.pageSize - 1;

  try {
    // Hitung total dulu (count only)
    const { count, error: countErr } = await supabaseClient
      .from(TABLES.articles)
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("category_id", CAT_STATE.category.id);

    if (countErr) throw countErr;
    CAT_STATE.total = count || 0;

    if (CAT_STATE.total === 0) {
      mount.innerHTML = emptyStateHTML(
        `Belum ada artikel di kategori ${CAT_STATE.category.name}`,
        "Silakan kembali lagi nanti."
      );
      return;
    }

    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .eq("category_id", CAT_STATE.category.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) throw error;

    if (!data || data.length === 0) {
      mount.innerHTML = emptyStateHTML("Halaman kosong", "Tidak ada artikel di halaman ini.");
      return;
    }

    mount.innerHTML = data
      .map((a) => articleCardHTML(a, { prefix: "" }))
      .join("");

    renderPagination();
  } catch (err) {
    console.error("[category] loadArticles error:", err);
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}

/* -------------------- PAGINATION -------------------- */

function renderPagination() {
  const mount = document.getElementById("mw-cat-pagination");
  if (!mount) return;

  const totalPages = Math.ceil(CAT_STATE.total / CAT_STATE.pageSize);
  if (totalPages <= 1) {
    mount.innerHTML = "";
    return;
  }

  const current = CAT_STATE.page;
  const makeUrl = (p) =>
    `category.html?slug=${encodeURIComponent(CAT_STATE.slug)}&page=${p}`;

  const parts = [];

  // Prev
  if (current > 1) {
    parts.push(`<a class="mw-page-btn" href="${makeUrl(current - 1)}" aria-label="Sebelumnya">‹</a>`);
  } else {
    parts.push(`<button class="mw-page-btn" disabled aria-label="Sebelumnya">‹</button>`);
  }

  // Nomor halaman (maks 7 di sekitar current)
  const windowSize = 2;
  const start = Math.max(1, current - windowSize);
  const end   = Math.min(totalPages, current + windowSize);

  if (start > 1) {
    parts.push(`<a class="mw-page-btn" href="${makeUrl(1)}">1</a>`);
    if (start > 2) parts.push(`<span class="mw-page-btn" style="border:none;background:transparent;">…</span>`);
  }

  for (let p = start; p <= end; p++) {
    if (p === current) {
      parts.push(`<a class="mw-page-btn" href="${makeUrl(p)}" aria-current="page">${p}</a>`);
    } else {
      parts.push(`<a class="mw-page-btn" href="${makeUrl(p)}">${p}</a>`);
    }
  }

  if (end < totalPages) {
    if (end < totalPages - 1) parts.push(`<span class="mw-page-btn" style="border:none;background:transparent;">…</span>`);
    parts.push(`<a class="mw-page-btn" href="${makeUrl(totalPages)}">${totalPages}</a>`);
  }

  // Next
  if (current < totalPages) {
    parts.push(`<a class="mw-page-btn" href="${makeUrl(current + 1)}" aria-label="Berikutnya">›</a>`);
  } else {
    parts.push(`<button class="mw-page-btn" disabled aria-label="Berikutnya">›</button>`);
  }

  mount.innerHTML = parts.join("");
}

/* -------------------- ERROR -------------------- */

function showCategoryError(message, hint = "") {
  const mount = document.getElementById("mw-cat-grid");
  const pag   = document.getElementById("mw-cat-pagination");
  setText(document.getElementById("mw-cat-title"), "Kategori");
  setText(document.getElementById("mw-cat-desc"), "");
  if (pag) pag.innerHTML = "";
  if (!mount) return;

  mount.innerHTML = `
    <div class="mw-state mw-state--error" style="grid-column:1/-1;">
      <div class="mw-state__title">${escapeHtml(message)}</div>
      ${hint ? `<p>${escapeHtml(hint)}</p>` : ""}
      <p style="margin-top:16px;">
        <a class="mw-btn mw-btn--primary" href="../index.html">Kembali ke Beranda</a>
      </p>
    </div>
  `;
}