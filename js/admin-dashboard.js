/* =====================================================================
   MEDIAWAN - ADMIN DASHBOARD
   CRUD artikel (termasuk upload gambar & status publish/unggulan)
   dan CRUD kategori. Hanya untuk user di tabel mw_admins.
   ===================================================================== */

const DASH = {
  user: null,
  categories: [],
  articles: [],
  editingArticleId: null,
  editingCategoryId: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireAdmin();
  if (!auth) return;

  DASH.user = auth.user;
  document.getElementById("mw-admin").hidden = false;
  document.getElementById("mw-admin-email").textContent = auth.email;

  bindTabs();
  bindLogout();
  bindArticleModal();
  bindCategoryModal();

  await loadCategories();      // dipakai untuk dropdown form artikel
  await loadArticles();
  await loadCategoryList();    // daftar di tab kategori
});

/* -------------------- TABS -------------------- */

function bindTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-tab]"));
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
      document.getElementById("mw-tab-articles").hidden   = tab !== "articles";
      document.getElementById("mw-tab-categories").hidden = tab !== "categories";
    });
  });
}

/* -------------------- LOGOUT -------------------- */

function bindLogout() {
  document.getElementById("mw-logout-btn")?.addEventListener("click", async () => {
    if (!confirm("Keluar dari dashboard?")) return;
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
}

/* =====================================================================
   ARTIKEL
   ===================================================================== */

async function loadArticles() {
  const mount = document.getElementById("mw-articles-list");
  mount.innerHTML = `<div class="mw-skeleton" style="height:200px;"></div>`;

  try {
    const { data, error } = await supabaseClient
      .from(TABLES.articles)
      .select(`
        id, title, slug, excerpt, cover_image_url,
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

  if (!DASH.articles.length) {
    mount.innerHTML = emptyStateHTML(
      "Belum ada artikel",
      'Klik "+ Artikel Baru" untuk membuat artikel pertamamu.'
    );
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
      ? ` <span class="mw-tag mw-tag--featured">Unggulan</span>`
      : "";

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

/* -------------------- MODAL ARTIKEL -------------------- */

function bindArticleModal() {
  const modal = document.getElementById("mw-article-modal");
  const form  = document.getElementById("mw-article-form");

  document.getElementById("mw-new-article")?.addEventListener("click", () => openArticleModal(null));
  document.getElementById("mw-refresh-articles")?.addEventListener("click", () => loadArticles());
  document.getElementById("mw-article-modal-close")?.addEventListener("click", closeArticleModal);
  document.getElementById("mw-article-cancel")?.addEventListener("click", closeArticleModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeArticleModal();
  });

  // Auto-generate slug dari judul (kalau slug masih kosong / belum diubah manual)
  const titleEl = form.querySelector('[name=title]');
  const slugEl  = form.querySelector('[name=slug]');
  let slugTouched = false;
  slugEl.addEventListener("input", () => { slugTouched = true; });
  titleEl.addEventListener("input", () => {
    if (!slugTouched || !slugEl.value) {
      slugEl.value = slugify(titleEl.value);
    }
  });

  // Preview gambar
  const fileEl = form.querySelector('[name=cover_file]');
  fileEl.addEventListener("change", () => {
    const file = fileEl.files?.[0];
    const wrap = document.getElementById("mw-cover-preview");
    const img  = wrap.querySelector("img");
    if (!file) {
      wrap.classList.remove("is-visible");
      img.removeAttribute("src");
      return;
    }
    const url = URL.createObjectURL(file);
    img.src = url;
    wrap.classList.add("is-visible");
  });

  form.addEventListener("submit", handleArticleSubmit);
}

function openArticleModal(id = null) {
  const modal = document.getElementById("mw-article-modal");
  const form  = document.getElementById("mw-article-form");
  const title = document.getElementById("mw-article-modal-title");
  const preview = document.getElementById("mw-cover-preview");
  const previewImg = preview.querySelector("img");

  form.reset();
  preview.classList.remove("is-visible");
  previewImg.removeAttribute("src");
  DASH.editingArticleId = id;

  // Isi dropdown kategori
  const catSelect = form.querySelector('[name=category_id]');
  catSelect.innerHTML = `<option value="">— Tanpa kategori —</option>` +
    DASH.categories.map((c) =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join("");

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
    form.category_id.value  = a.category_id || "";
    form.is_featured.checked  = !!a.is_featured;
    form.is_published.checked = !!a.is_published;

    if (a.cover_image_url) {
      previewImg.src = a.cover_image_url;
      preview.classList.add("is-visible");
    }
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
  document.getElementById("mw-article-modal").classList.remove("is-open");
  document.body.style.overflow = "";
  DASH.editingArticleId = null;
}

/* -------------------- SUBMIT ARTIKEL -------------------- */

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

  // Validasi wajib
  if (!title)      return showToast("Judul wajib diisi.", "error");
  if (!sourceName) return showToast("Field 'Sumber' wajib diisi.", "error");

  const slug = slugInput || slugify(title);

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Menyimpan…";

  try {
    // Upload gambar kalau ada file baru
    let coverUrl = id
      ? (DASH.articles.find((x) => x.id === id)?.cover_image_url || null)
      : null;

    if (coverFile) {
      if (coverFile.size > 3 * 1024 * 1024) {
        throw new Error("Ukuran gambar melebihi 3MB.");
      }
      coverUrl = await uploadCoverImage(coverFile);
    }

    // Payload artikel
    const payload = {
      title,
      slug,
      author:          author || null,
      excerpt:         excerpt || null,
      content:         content || null,
      source_name:     sourceName,      // wajib
      source_url:      sourceUrl || null,
      category_id:     categoryId,
      cover_image_url: coverUrl,
      is_featured:     isFeatured,
      is_published:    isPublished,
      published_at:    isPublished ? (id
        ? (DASH.articles.find((x) => x.id === id)?.published_at || new Date().toISOString())
        : new Date().toISOString())
        : null,
    };

    if (id) {
      const { error } = await supabaseClient
        .from(TABLES.articles)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      showToast("Artikel diperbarui.", "success");
    } else {
      const { error } = await supabaseClient
        .from(TABLES.articles)
        .insert(payload);
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

/* -------------------- UPLOAD GAMBAR -------------------- */

async function uploadCoverImage(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `covers/${safeName}`;

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

/* -------------------- HAPUS ARTIKEL -------------------- */

async function deleteArticle(id) {
  const a = DASH.articles.find((x) => x.id === id);
  if (!a) return;
  if (!confirm(`Hapus artikel "${a.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;

  try {
    const { error } = await supabaseClient
      .from(TABLES.articles)
      .delete()
      .eq("id", id);
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

  if (!DASH.categories.length) {
    mount.innerHTML = emptyStateHTML("Belum ada kategori", 'Klik "+ Kategori Baru" untuk menambah.');
    return;
  }

  mount.innerHTML = `
    <div class="mw-table-wrap">
      <table class="mw-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Slug</th>
            <th style="width:180px;">Aksi</th>
          </tr>
        </thead>
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

/* -------------------- MODAL KATEGORI -------------------- */

function bindCategoryModal() {
  const modal = document.getElementById("mw-category-modal");
  const form  = document.getElementById("mw-category-form");

  document.getElementById("mw-new-category")?.addEventListener("click", () => openCategoryModal(null));
  document.getElementById("mw-refresh-categories")?.addEventListener("click", () => loadCategoryList());
  document.getElementById("mw-category-modal-close")?.addEventListener("click", closeCategoryModal);
  document.getElementById("mw-category-cancel")?.addEventListener("click", closeCategoryModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCategoryModal();
  });

  // Auto-slug dari nama
  const nameEl = form.querySelector('[name=name]');
  const slugEl = form.querySelector('[name=slug]');
  let touched = false;
  slugEl.addEventListener("input", () => { touched = true; });
  nameEl.addEventListener("input", () => {
    if (!touched || !slugEl.value) slugEl.value = slugify(nameEl.value);
  });

  form.addEventListener("submit", handleCategorySubmit);
}

function openCategoryModal(id = null) {
  const modal = document.getElementById("mw-category-modal");
  const form  = document.getElementById("mw-category-form");
  const title = document.getElementById("mw-category-modal-title");

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
  document.getElementById("mw-category-modal").classList.remove("is-open");
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
      const { error } = await supabaseClient
        .from(TABLES.categories)
        .update({ name, slug })
        .eq("id", Number(id));
      if (error) throw error;
      showToast("Kategori diperbarui.", "success");
    } else {
      const { error } = await supabaseClient
        .from(TABLES.categories)
        .insert({ name, slug });
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
  if (!confirm(`Hapus kategori "${c.name}"? Artikel yang memakai kategori ini akan menjadi tanpa kategori.`)) return;

  try {
    const { error } = await supabaseClient
      .from(TABLES.categories)
      .delete()
      .eq("id", id);
    if (error) throw error;
    showToast("Kategori dihapus.", "success");
    await loadCategoryList();
    await loadArticles();
  } catch (err) {
    console.error("[dashboard] delete kategori error:", err);
    showToast(friendlyError(err), "error");
  }
}