/* =====================================================================
   MEDIAWAN - ADMIN DASHBOARD (v3)
   ===================================================================== */

const DASH = {
  user: null,
  categories: [],
  articles: [],
  editingArticleId: null,
  editingCategoryId: null,
};

let DASH_INITIALIZED = false;

document.addEventListener("DOMContentLoaded", async () => {
  if (DASH_INITIALIZED) return;

  const auth = await requireAdmin();
  if (!auth) return;

  DASH_INITIALIZED = true;
  DASH.user = auth.user;

  document.getElementById("mw-admin").hidden = false;
  const emailEl = document.getElementById("mw-admin-email");
  if (emailEl) emailEl.textContent = auth.email;

  bindTabs();
  bindLogout();
  bindArticleModal();
  bindCategoryModal();
  bindAboutForm();
  bindSettingsForm();

  await loadCategories();
  await loadArticles();
  await loadCategoryList();
  await loadAboutForm();
  await loadSettingsForm();
});

/* ---------------- TABS ---------------- */

function bindTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-tab]"));
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
      ["articles", "categories", "about", "settings"].forEach((t) => {
        const el = document.getElementById(`mw-tab-${t}`);
        if (el) el.hidden = (t !== tab);
      });
    });
  });
}

/* ---------------- LOGOUT ---------------- */

function bindLogout() {
  document.getElementById("mw-logout-btn")?.addEventListener("click", async () => {
    if (!confirm("Keluar dari dashboard?")) return;
    try { await supabaseClient.auth.signOut(); } catch (e) { /* noop */ }
    window.location.replace("index.html");
  });
}

/* =====================================================================
   ARTIKEL
   ===================================================================== */

async function loadArticles() {
  const mount = document.getElementById("mw-articles-list");
  if (!mount) return;
  mount.innerHTML = `<div class="mw-skeleton" style="height:200px;"></div>`;

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, content, cover_image_url,
        author, source_name, source_url,
        is_featured, is_published, views, published_at, created_at,
        category_id, mw_categories ( id, name, slug )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    DASH.articles = data || [];
    renderArticlesTable();
  } catch (err) {
    console.error("[dashboard] loadArticles error:", err);
    mount.innerHTML = errorStateHTML(friendlyError(err));
  }
}

function renderArticlesTable() {
  const mount = document.getElementById("mw-articles-list");
  if (!mount) return;

  if (!DASH.articles.length) {
    mount.innerHTML = emptyStateHTML("Belum ada artikel", 'Klik "+ Artikel Baru".');
    return;
  }

  const rows = DASH.articles.map((a) => {
    const thumb = a.cover_image_url
      ? `<img class="mw-table__thumb" src="${escapeHtml(a.cover_image_url)}" alt="">`
      : `<div class="mw-table__thumb"></div>`;

    const status = a.is_published
      ? `<span class="mw-tag mw-tag--published">Publish</span>`
      : `<span class="mw-tag mw-tag--draft">Draft</span>`;
    const featured = a.is_featured
      ? ` <span class="mw-tag mw-tag--featured">Unggulan</span>` : "";

    return `
      <tr>
        <td>${thumb}</td>
        <td>
          <div style="font-weight:700; margin-bottom:2px;">${escapeHtml(a.title)}</div>
          <div class="mw-text-muted" style="font-size:12px;">
            ${escapeHtml(a.mw_categories?.name || "Tanpa kategori")} ·
            ${escapeHtml(formatDateId(a.published_at || a.created_at))}
          </div>
        </td>
        <td>${status}${featured}</td>
        <td>${a.views ?? 0}</td>
        <td>
          <div class="mw-table__actions">
            <button type="button" data-action="edit" data-id="${a.id}">Edit</button>
            <button type="button" data-action="delete" data-id="${a.id}" class="is-danger">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  mount.innerHTML = `
    <div class="mw-table-wrap">
      <table class="mw-table">
        <thead>
          <tr>
            <th style="width:70px;">Gambar</th>
            <th>Judul</th>
            <th style="width:150px;">Status</th>
            <th style="width:80px;">Views</th>
            <th style="width:160px;">Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  mount.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit")   openArticleModal(id);
      if (btn.dataset.action === "delete") deleteArticle(id);
    });
  });
}

function bindArticleModal() {
  const modal = document.getElementById("mw-article-modal");
  const form  = document.getElementById("mw-article-form");
  if (!modal || !form) return;

  document.getElementById("mw-new-article")?.addEventListener("click", () => openArticleModal(null));
  document.getElementById("mw-refresh-articles")?.addEventListener("click", () => loadArticles());
  document.getElementById("mw-article-modal-close")?.addEventListener("click", closeArticleModal);
  document.getElementById("mw-article-cancel")?.addEventListener("click", closeArticleModal);

  modal.addEventListener("click", (e) => { if (e.target === modal) closeArticleModal(); });

  const titleEl = form.querySelector('[name=title]');
  const slugEl  = form.querySelector('[name=slug]');
  let slugTouched = false;
  slugEl?.addEventListener("input", () => { slugTouched = true; });
  titleEl?.addEventListener("input", () => {
    if (!slugTouched || !slugEl.value) slugEl.value = slugify(titleEl.value);
  });

  const fileEl = form.querySelector('[name=cover_file]');
  fileEl?.addEventListener("change", () => previewImage(fileEl, "mw-cover-preview"));

  form.addEventListener("submit", handleArticleSubmit);
}

function openArticleModal(id = null) {
  const modal = document.getElementById("mw-article-modal");
  const form  = document.getElementById("mw-article-form");
  const title = document.getElementById("mw-article-modal-title");
  if (!modal || !form) return;

  form.reset();
  hideImagePreview("mw-cover-preview");
  DASH.editingArticleId = id;

  const catSelect = form.querySelector('[name=category_id]');
  if (catSelect) {
    catSelect.innerHTML = `<option value="">— Tanpa kategori —</option>` +
      DASH.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  }

  if (id) {
    const a = DASH.articles.find((x) => x.id === id);
    if (!a) return;
    title.textContent = "Edit Artikel";
    form.id.value           = a.id;
    form.title.value        = a.title || "";
    form.slug.value         = a.slug || "";
    form.author.value       = a.author || "";
    form.excerpt.value      = a.excerpt || "";
    form.content.value      = a.content || "";
    form.source_name.value  = a.source_name || "";
    form.source_url.value   = a.source_url || "";
    if (catSelect) catSelect.value = a.category_id || "";
    form.is_featured.checked  = !!a.is_featured;
    form.is_published.checked = !!a.is_published;
    if (a.cover_image_url) showImagePreview("mw-cover-preview", a.cover_image_url);
  } else {
    title.textContent = "Artikel Baru";
    form.id.value = "";
    form.is_published.checked = false;
    form.is_featured.checked = false;
  }

  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeArticleModal() {
  document.getElementById("mw-article-modal")?.classList.remove("is-open");
  document.body.style.overflow = "";
  DASH.editingArticleId = null;
}

async function handleArticleSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn  = document.getElementById("mw-article-save");

  const id           = form.id.value || null;
  const title        = form.title.value.trim();
  const slugInput    = form.slug.value.trim();
  const author       = form.author.value.trim();
  const excerpt      = form.excerpt.value.trim();
  const content      = form.content.value.trim();
  const sourceName   = form.source_name.value.trim();
  const sourceUrl    = form.source_url.value.trim();
  const categoryId   = form.category_id.value ? Number(form.category_id.value) : null;
  const isFeatured   = form.is_featured.checked;
  const isPublished  = form.is_published.checked;
  const coverFile    = form.cover_file.files?.[0] || null;

  if (!title)      return showToast("Judul wajib diisi.", "error");
  if (!sourceName) return showToast("Field 'Sumber' wajib diisi.", "error");

  const slug = slugInput || slugify(title);

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Menyimpan…";

  try {
    let coverUrl = id
      ? (DASH.articles.find((x) => x.id === id)?.cover_image_url || null)
      : null;

    if (coverFile) {
      if (coverFile.size > 3 * 1024 * 1024) throw new Error("Ukuran gambar melebihi 3MB.");
      coverUrl = await uploadImage(coverFile, "covers");
    }

    const prevPublished = id
      ? (DASH.articles.find((x) => x.id === id)?.published_at || null)
      : null;

    const payload = {
      title, slug,
      author:          author || null,
      excerpt:         excerpt || null,
      content:         content || null,
      source_name:     sourceName,
      source_url:      sourceUrl || null,
      category_id:     categoryId,
      cover_image_url: coverUrl,
      is_featured:     isFeatured,
      is_published:    isPublished,
      published_at:    isPublished ? (prevPublished || new Date().toISOString()) : null,
    };

    if (id) {
      const { error } = await supabaseClient.from(TABLES.articles).update(payload).eq("id", id);
      if (error) throw error;
      showToast("Artikel diperbarui.", "success");
    } else {
      const { error } = await supabaseClient.from(TABLES.articles).insert(payload);
      if (error) throw error;
      showToast("Artikel dibuat.", "success");
    }

    closeArticleModal();
    await loadArticles();
  } catch (err) {
    console.error("[dashboard] submit artikel error:", err);
    showToast(friendlyError(err), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteArticle(id) {
  const a = DASH.articles.find((x) => x.id === id);
  if (!a) return;
  if (!confirm(`Hapus artikel "${a.title}"?`)) return;

  try {
    const { error } = await supabaseClient.from(TABLES.articles).delete().eq("id", id);
    if (error) throw error;
    showToast("Artikel dihapus.", "success");
    await loadArticles();
  } catch (err) {
    console.error("[dashboard] delete artikel error:", err);
    showToast(friendlyError(err), "error");
  }
}

/* =====================================================================
   KATEGORI
   ===================================================================== */

async function loadCategories() {
  try {
    const { data, error } = await supabaseClient
      .from(TABLES.categories)
      .select("id, name, slug, created_at")
      .order("name", { ascending: true });
    if (error) throw error;
    DASH.categories = data || [];
  } catch (err) {
    console.error("[dashboard] loadCategories error:", err);
    DASH.categories = [];
  }
}

async function loadCategoryList() {
  await loadCategories();
  const mount = document.getElementById("mw-categories-list");
  if (!mount) return;

  if (!DASH.categories.length) {
    mount.innerHTML = emptyStateHTML("Belum ada kategori", 'Klik "+ Kategori Baru".');
    return;
  }

  mount.innerHTML = `
    <div class="mw-table-wrap">
      <table class="mw-table">
        <thead><tr><th>Nama</th><th>Slug</th><th style="width:180px;">Aksi</th></tr></thead>
        <tbody>
          ${DASH.categories.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>${escapeHtml(c.slug)}</td>
              <td>
                <div class="mw-table__actions">
                  <button type="button" data-action="edit-cat" data-id="${c.id}">Edit</button>
                  <button type="button" data-action="delete-cat" data-id="${c.id}" class="is-danger">Hapus</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  mount.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === "edit-cat")   openCategoryModal(id);
      if (btn.dataset.action === "delete-cat") deleteCategory(id);
    });
  });
}

function bindCategoryModal() {
  const modal = document.getElementById("mw-category-modal");
  const form  = document.getElementById("mw-category-form");
  if (!modal || !form) return;

  document.getElementById("mw-new-category")?.addEventListener("click", () => openCategoryModal(null));
  document.getElementById("mw-refresh-categories")?.addEventListener("click", () => loadCategoryList());
  document.getElementById("mw-category-modal-close")?.addEventListener("click", closeCategoryModal);
  document.getElementById("mw-category-cancel")?.addEventListener("click", closeCategoryModal);

  modal.addEventListener("click", (e) => { if (e.target === modal) closeCategoryModal(); });

  const nameEl = form.querySelector('[name=name]');
  const slugEl = form.querySelector('[name=slug]');
  let touched = false;
  slugEl?.addEventListener("input", () => { touched = true; });
  nameEl?.addEventListener("input", () => {
    if (!touched || !slugEl.value) slugEl.value = slugify(nameEl.value);
  });

  form.addEventListener("submit", handleCategorySubmit);
}

function openCategoryModal(id = null) {
  const modal = document.getElementById("mw-category-modal");
  const form  = document.getElementById("mw-category-form");
  const title = document.getElementById("mw-category-modal-title");
  if (!modal || !form) return;

  form.reset();
  DASH.editingCategoryId = id;

  if (id) {
    const c = DASH.categories.find((x) => x.id === id);
    if (!c) return;
    title.textContent = "Edit Kategori";
    form.id.value   = c.id;
    form.name.value = c.name || "";
    form.slug.value = c.slug || "";
  } else {
    title.textContent = "Kategori Baru";
    form.id.value = "";
  }

  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeCategoryModal() {
  document.getElementById("mw-category-modal")?.classList.remove("is-open");
  document.body.style.overflow = "";
  DASH.editingCategoryId = null;
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn  = document.getElementById("mw-category-save");

  const id   = form.id.value || null;
  const name = form.name.value.trim();
  const slug = (form.slug.value.trim() || slugify(name)).toLowerCase();

  if (!name) return showToast("Nama kategori wajib diisi.", "error");
  if (!slug) return showToast("Slug kategori tidak valid.", "error");

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Menyimpan…";

  try {
    if (id) {
      const { error } = await supabaseClient.from(TABLES.categories).update({ name, slug }).eq("id", Number(id));
      if (error) throw error;
      showToast("Kategori diperbarui.", "success");
    } else {
      const { error } = await supabaseClient.from(TABLES.categories).insert({ name, slug });
      if (error) throw error;
      showToast("Kategori dibuat.", "success");
    }
    closeCategoryModal();
    await loadCategoryList();
  } catch (err) {
    console.error("[dashboard] submit kategori error:", err);
    showToast(friendlyError(err), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteCategory(id) {
  const c = DASH.categories.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Hapus kategori "${c.name}"?`)) return;

  try {
    const { error } = await supabaseClient.from(TABLES.categories).delete().eq("id", id);
    if (error) throw error;
    showToast("Kategori dihapus.", "success");
    await loadCategoryList();
    await loadArticles();
  } catch (err) {
    console.error("[dashboard] delete kategori error:", err);
    showToast(friendlyError(err), "error");
  }
}

/* =====================================================================
   TENTANG
   ===================================================================== */

async function loadAboutForm() {
  const form = document.getElementById("mw-about-form");
  if (!form) return;

  try {
    const map = await loadSettings();
    const set = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? "";
    };

    ["about_title","about_intro",
     "about_value_1_t","about_value_1_d",
     "about_value_2_t","about_value_2_d",
     "about_value_3_t","about_value_3_d",
     "about_founder_name","about_founder_role","about_founder_bio",
     "about_team_name","about_team_role","about_team_bio",
     "about_how_1","about_how_2","about_how_3","about_how_4",
     "about_contact"].forEach((k) => set(k, map[k]));

    if (map.about_founder_photo) showImagePreview("mw-founder-preview", map.about_founder_photo);
    if (map.about_team_photo)    showImagePreview("mw-team-preview",    map.about_team_photo);
  } catch (err) {
    console.error("[dashboard] loadAboutForm error:", err);
  }
}

function bindAboutForm() {
  const form = document.getElementById("mw-about-form");
  if (!form) return;

  form.querySelector('[name=about_founder_photo_file]')?.addEventListener("change", (e) => {
    previewImage(e.target, "mw-founder-preview");
  });
  form.querySelector('[name=about_team_photo_file]')?.addEventListener("change", (e) => {
    previewImage(e.target, "mw-team-preview");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("mw-about-save");
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Menyimpan…";

    try {
      const fd = new FormData(form);
      const obj = {};
      ["about_title","about_intro",
       "about_value_1_t","about_value_1_d",
       "about_value_2_t","about_value_2_d",
       "about_value_3_t","about_value_3_d",
       "about_founder_name","about_founder_role","about_founder_bio",
       "about_team_name","about_team_role","about_team_bio",
       "about_how_1","about_how_2","about_how_3","about_how_4",
       "about_contact"].forEach((k) => { obj[k] = (fd.get(k) || "").toString().trim(); });

      const founderFile = form.querySelector('[name=about_founder_photo_file]').files?.[0];
      if (founderFile) {
        if (founderFile.size > 3 * 1024 * 1024) throw new Error("Foto founder melebihi 3MB.");
        obj.about_founder_photo = await uploadImage(founderFile, "team");
      }

      const teamFile = form.querySelector('[name=about_team_photo_file]').files?.[0];
      if (teamFile) {
        if (teamFile.size > 3 * 1024 * 1024) throw new Error("Foto tim melebihi 3MB.");
        obj.about_team_photo = await uploadImage(teamFile, "team");
      }

      await saveSettings(obj);
      invalidateSettingsCache();
      showToast("Halaman Tentang disimpan.", "success");
    } catch (err) {
      console.error("[dashboard] simpan about error:", err);
      showToast(friendlyError(err), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

/* =====================================================================
   PENGATURAN
   ===================================================================== */

async function loadSettingsForm() {
  const form = document.getElementById("mw-settings-form");
  if (!form) return;

  try {
    const map = await loadSettings();
    const set = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? "";
    };
    ["footer_desc","footer_copyright",
     "social_whatsapp","social_instagram","social_x","social_facebook","social_youtube"]
      .forEach((k) => set(k, map[k]));
  } catch (err) {
    console.error("[dashboard] loadSettingsForm error:", err);
  }
}

function bindSettingsForm() {
  const form = document.getElementById("mw-settings-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("mw-settings-save");
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Menyimpan…";

    try {
      const fd = new FormData(form);
      const obj = {};
      ["footer_desc","footer_copyright",
       "social_whatsapp","social_instagram","social_x","social_facebook","social_youtube"]
        .forEach((k) => { obj[k] = (fd.get(k) || "").toString().trim(); });

      await saveSettings(obj);
      invalidateSettingsCache();
      showToast("Pengaturan disimpan.", "success");
    } catch (err) {
      console.error("[dashboard] simpan settings error:", err);
      showToast(friendlyError(err), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

/* =====================================================================
   HELPERS
   ===================================================================== */

async function uploadImage(file, folder = "covers") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${safeName}`;

  const { error: upErr } = await supabaseClient
    .storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (upErr) throw upErr;

  const { data: pub } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  return pub?.publicUrl || null;
}

function previewImage(fileInput, previewId) {
  const file = fileInput.files?.[0];
  const wrap = document.getElementById(previewId);
  const img  = wrap?.querySelector("img");
  if (!wrap || !img) return;
  if (!file) {
    wrap.classList.remove("is-visible");
    img.removeAttribute("src");
    return;
  }
  img.src = URL.createObjectURL(file);
  wrap.classList.add("is-visible");
}

function showImagePreview(previewId, url) {
  const wrap = document.getElementById(previewId);
  const img  = wrap?.querySelector("img");
  if (!wrap || !img) return;
  img.src = url;
  wrap.classList.add("is-visible");
}

function hideImagePreview(previewId) {
  const wrap = document.getElementById(previewId);
  const img  = wrap?.querySelector("img");
  if (!wrap || !img) return;
  wrap.classList.remove("is-visible");
  img.removeAttribute("src");
}