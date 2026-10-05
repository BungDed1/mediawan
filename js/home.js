/* =====================================================================
   MEDIAWAN - HOME
   Perhatikan: karena home.js dipanggil dari index.html (root),
   semua link ke artikel harus pakai prefix "pages/".
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPageChrome({ active: "beranda", footer: true });
  loadHero();
  loadLatest();
  loadFacts();
  loadPopular();
});

/* -------------------- HERO -------------------- */

async function loadHero() {
  const mount = document.getElementById("mw-hero");
  if (!mount) return;

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) throw error;

    let article = data?.[0];

    if (!article) {
      const fallback = await supabaseClient
        .from(TABLES.articles)
        .select(`
          id, title, slug, excerpt, cover_image_url, published_at, created_at,
          mw_categories ( name, slug )
        `)
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (fallback.error) throw fallback.error;
      article = fallback.data?.[0];
    }

    if (!article) {
      mount.innerHTML = emptyStateHTML(
        "Belum ada artikel",
        "Redaksi belum menerbitkan artikel apa pun. Cek lagi nanti ya."
      );
      return;
    }

    renderHero(article);
  } catch (err) {
    console.error("[home] hero error:", err);
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}

function renderHero(a) {
  const mount = document.getElementById("mw-hero");
  const url = `pages/${articleUrl(a.slug)}`;          // ⬅️ prefix "pages/"
  const img = a.cover_image_url || APP.defaultImage;
  const category = a.mw_categories?.name || "";
  const categorySlug = a.mw_categories?.slug || "";
  const date = formatDateId(a.published_at || a.created_at);

  mount.innerHTML = `
    <a href="${url}" class="mw-hero__media" aria-label="${escapeHtml(a.title)}">
      <img src="${escapeHtml(img)}" alt="${escapeHtml(a.title)}">
    </a>
    <div>
      ${category
        ? `<a href="pages/category.html?slug=${encodeURIComponent(categorySlug)}"
              class="mw-badge" style="margin-bottom:12px; display:inline-block;">
             ${escapeHtml(category)}
           </a>`
        : ""}
      <h1 class="mw-hero__title">
        <a href="${url}">${escapeHtml(a.title)}</a>
      </h1>
      ${a.excerpt ? `<p class="mw-hero__excerpt">${escapeHtml(a.excerpt)}</p>` : ""}
      <div class="mw-card__meta" style="margin-top:16px;">
        <span>${escapeHtml(date)}</span>
      </div>
    </div>
  `;
}

/* -------------------- TERBARU -------------------- */

async function loadLatest() {
  const mount = document.getElementById("mw-latest");
  if (!mount) return;

  mount.innerHTML = skeletonCards(APP.homeLatest);

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(APP.homeLatest);

    if (error) throw error;

    if (!data || data.length === 0) {
      mount.innerHTML = emptyStateHTML();
      return;
    }

    mount.innerHTML = data
      .map((a) => articleCardHTML(a, { prefix: "pages/" }))   // ⬅️ prefix
      .join("");
  } catch (err) {
    console.error("[home] latest error:", err);
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}

/* -------------------- FAKTA CEPAT -------------------- */

async function loadFacts() {
  const mount = document.getElementById("mw-facts");
  if (!mount) return;

  mount.innerHTML = skeletonCards(4);

  try {
    const { data: cat, error: catErr } = await supabaseClient
      .from(TABLES.categories)
      .select("id, name, slug")
      .eq("slug", "fakta")
      .maybeSingle();

    if (catErr) throw catErr;

    let query = supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(APP.homeFacts);

    if (cat?.id) query = query.eq("category_id", cat.id);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      const fallback = await supabaseClient
        .from(TABLES.articles)
        .select(`
          id, title, slug, excerpt, cover_image_url, published_at, created_at,
          mw_categories ( name, slug )
        `)
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(APP.homeFacts);

      if (fallback.error) throw fallback.error;

      if (!fallback.data || fallback.data.length === 0) {
        mount.innerHTML = emptyStateHTML();
        return;
      }
      mount.innerHTML = fallback.data
        .map((a) => `<div role="listitem">${articleCardHTML(a, { compact: true, prefix: "pages/" })}</div>`)
        .join("");
      return;
    }

    mount.innerHTML = data
      .map((a) => `<div role="listitem">${articleCardHTML(a, { compact: true, prefix: "pages/" })}</div>`)
      .join("");
  } catch (err) {
    console.error("[home] facts error:", err);
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}

/* -------------------- TERPOPULER -------------------- */

async function loadPopular() {
  const mount = document.getElementById("mw-popular");
  if (!mount) return;

  mount.innerHTML = skeletonList(APP.homePopular);

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, views,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .order("views", { ascending: false })
      .limit(APP.homePopular);

    if (error) throw error;

    if (!data || data.length === 0) {
      mount.innerHTML = `<li>${emptyStateHTML()}</li>`;
      return;
    }

    mount.innerHTML = data
      .map((a, i) => popularItemHTML(a, i, "pages/"))   // ⬅️ prefix
      .join("");
  } catch (err) {
    console.error("[home] popular error:", err);
    mount.innerHTML = `<li>${errorStateHTML(friendlyError(err))}</li>`;
  }
}