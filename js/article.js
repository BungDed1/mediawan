/* =====================================================================
   MEDIAWAN - ARTICLE PAGE
   Menampilkan detail artikel berdasarkan ?slug=..., menambah views via RPC,
   mengisi meta SEO/OG, tombol share, dan artikel terkait.
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPageChrome({ active: "", footer: true });

  const slug = getQueryParam("slug");
  if (!slug) {
    renderArticleError("Slug artikel tidak ditemukan di URL.");
    return;
  }

  loadArticle(slug);
});

/* -------------------- LOAD ARTIKEL -------------------- */

async function loadArticle(slug) {
  const mount = document.getElementById("mw-article");

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, content, cover_image_url,
        author, source_name, source_url,
        views, published_at, created_at, is_published,
        mw_categories ( id, name, slug )
      `)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      renderArticleError(
        "Artikel tidak ditemukan atau belum dipublikasikan.",
        "Coba cek beranda untuk artikel lain."
      );
      return;
    }

    renderArticle(data);

    // Tambah views (fire & forget, tidak boleh menghambat render)
    incrementViews(data.id);

    // Artikel terkait
    loadRelated(data);
  } catch (err) {
    console.error("[article] error:", err);
    renderArticleError(friendlyError(err));
  }
}

/* -------------------- RENDER ARTIKEL -------------------- */

function renderArticle(a) {
  const mount = document.getElementById("mw-article");
  if (!mount) return;

  const category = a.mw_categories?.name || "";
  const categorySlug = a.mw_categories?.slug || "";
  const date = formatDateId(a.published_at || a.created_at);
  const img = a.cover_image_url || "../" + APP.defaultImage;

  mount.innerHTML = `
    <nav class="mw-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Beranda</a>
      <span>›</span>
      ${category
        ? `<a href="category.html?slug=${encodeURIComponent(categorySlug)}">${escapeHtml(category)}</a>`
        : ""}
    </nav>

    ${category
      ? `<a href="category.html?slug=${encodeURIComponent(categorySlug)}"
            class="mw-badge">${escapeHtml(category)}</a>`
      : ""}

    <h1>${escapeHtml(a.title)}</h1>

    <div class="mw-card__meta">
      ${a.author ? `<span>Oleh <strong>${escapeHtml(a.author)}</strong></span><span>·</span>` : ""}
      <span>${escapeHtml(date)}</span>
      <span>·</span>
      <span>${a.views ?? 0} kali dibaca</span>
    </div>

    ${a.cover_image_url
      ? `<figure class="mw-article__cover">
           <img src="${escapeHtml(img)}" alt="${escapeHtml(a.title)}">
         </figure>`
      : ""}

    <div class="mw-article__content">
      ${renderArticleContent(a.content)}
    </div>

    ${a.source_name
      ? `<div class="mw-source">
           <div class="mw-source__label">Sumber</div>
           <div>
             ${escapeHtml(a.source_name)}
             ${a.source_url
               ? ` — <a href="${escapeHtml(a.source_url)}" target="_blank" rel="noopener noreferrer">
                    ${escapeHtml(a.source_url)}
                  </a>`
               : ""}
           </div>
         </div>`
      : ""}
  `;

  updateMeta(a);
}

/* -------------------- META SEO & OG -------------------- */

function updateMeta(a) {
  const desc = a.excerpt || stripHtml(a.content).slice(0, 155);
  const pageUrl = window.location.href;
  const imageUrl = a.cover_image_url || `${window.location.origin}/assets/images/og-cover.jpg`;

  document.title = `${a.title} — Mediawan`;

  setMetaContent("mw-meta-description", desc);
  setMetaContent("mw-og-title", a.title);
  setMetaContent("mw-og-description", desc);
  setMetaContent("mw-og-image", imageUrl);
  setMetaContent("mw-og-url", pageUrl);
  setMetaContent("mw-tw-title", a.title);
  setMetaContent("mw-tw-description", desc);
  setMetaContent("mw-tw-image", imageUrl);

  // <link rel="canonical">
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = pageUrl;
}

function setMetaContent(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute("content", value);
}

/* -------------------- SHARE -------------------- */

function bindShare(a) {
  const wrap = document.getElementById("mw-share");
  if (!wrap) return;

  const url = window.location.href;
  const text = a.title;

  wrap.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-share]");
    if (!btn) return;
    const type = btn.dataset.share;

    if (type === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        "_blank", "noopener"
      );
    } else if (type === "x") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        "_blank", "noopener"
      );
    } else if (type === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link disalin.", "success");
      } catch {
        // Fallback manual
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand("copy"); showToast("Link disalin.", "success"); }
        catch { showToast("Gagal menyalin link.", "error"); }
        document.body.removeChild(tmp);
      }
    }
  });
}

/* -------------------- INCREMENT VIEWS -------------------- */

async function incrementViews(articleId) {
  try {
    await supabaseClient.rpc(RPC_VIEWS, { article_id: articleId });
  } catch (err) {
    // Bukan error fatal; cukup catat di console
    console.warn("[article] gagal menambah views:", err);
  }
}

/* -------------------- ARTIKEL TERKAIT -------------------- */

async function loadRelated(a) {
  const section = document.getElementById("mw-related-section");
  const mount   = document.getElementById("mw-related");
  if (!section || !mount) return;

  try {
    let query = supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url, published_at, created_at,
        mw_categories ( name, slug )
      `)
      .eq("is_published", true)
      .neq("id", a.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(APP.relatedMax);

    // Prioritaskan artikel dari kategori yang sama
    if (a.mw_categories?.id) {
      query = query.eq("category_id", a.mw_categories.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let list = data;

    // Kalau kurang dari target, lengkapi dengan artikel terbaru lain
    if (!list || list.length < APP.relatedMax) {
      const extra = await supabaseClient
        .from(TABLES.articles)
        .select(`
          id, title, slug, excerpt, cover_image_url, published_at, created_at,
          mw_categories ( name, slug )
        `)
        .eq("is_published", true)
        .neq("id", a.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(APP.relatedMax * 2);

      if (extra.error) throw extra.error;

      const seen = new Set((list || []).map((x) => x.id));
      const merged = [...(list || [])];
      for (const item of extra.data || []) {
        if (!seen.has(item.id)) {
          merged.push(item);
          seen.add(item.id);
        }
        if (merged.length >= APP.relatedMax) break;
      }
      list = merged;
    }

    if (!list || list.length === 0) {
      section.hidden = true;
      return;
    }

    mount.innerHTML = list
      .slice(0, APP.relatedMax)
      .map((x) => articleCardHTML(x, { prefix: "" }))
      .join("");

    section.hidden = false;
  } catch (err) {
    console.error("[article] related error:", err);
    section.hidden = true;
  }
}

/* -------------------- ERROR STATE -------------------- */

function renderArticleError(message, hint = "") {
  const mount = document.getElementById("mw-article");
  if (!mount) return;

  document.title = "Artikel tidak ditemukan — Mediawan";

  mount.innerHTML = `
    <div class="mw-state mw-state--error">
      <div class="mw-state__title">${escapeHtml(message)}</div>
      ${hint ? `<p>${escapeHtml(hint)}</p>` : ""}
      <p style="margin-top:16px;">
        <a class="mw-btn mw-btn--primary" href="../index.html">Kembali ke Beranda</a>
      </p>
    </div>
  `;
}