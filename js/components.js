/* =====================================================================
   MEDIAWAN - COMPONENTS
   Komponen reusable: header, footer, sidebar mobile, kartu artikel,
   skeleton loader, empty/error state, badge, dsb.
   Semua halaman publik memakai renderHeader() dan renderFooter().
   ===================================================================== */

/* -------------------- MENU -------------------- */

const MENU_ITEMS = [
  { label: "Beranda",   href: "index.html",           slug: "beranda"   },
  { label: "Fakta",     href: "pages/category.html?slug=fakta",     slug: "fakta"     },
  { label: "Berita",    href: "pages/category.html?slug=berita",    slug: "berita"    },
  { label: "Teknologi", href: "pages/category.html?slug=teknologi", slug: "teknologi" },
  { label: "Hiburan",   href: "pages/category.html?slug=hiburan",   slug: "hiburan"   },
  { label: "Olahraga",  href: "pages/category.html?slug=olahraga",  slug: "olahraga"  },
  { label: "Tentang",   href: "pages/about.html",     slug: "tentang"   },
];

/**
 * Deteksi apakah kita sedang di dalam folder /pages/ atau /admin/.
 * Dipakai untuk menyesuaikan prefix link relatif.
 */
function getPathPrefix() {
  const path = window.location.pathname;
  if (path.includes("/pages/") || path.includes("/admin/")) return "../";
  return "";
}

/* -------------------- LOGO -------------------- */

/**
 * Logo "mediawan." berbasis HTML+CSS, bukan gambar.
 * "media" weight normal, "wan" weight BOLD, diakhiri titik.
 */
function logoTemplate({ size = "", light = false, href = null } = {}) {
  const cls = [
    "mw-logo",
    size ? `mw-logo--${size}` : "",
    light ? "mw-logo--light" : "",
  ].filter(Boolean).join(" ");

  const inner = `<span class="mw-logo__media">media</span><span class="mw-logo__wan">wan</span><span class="mw-logo__dot">.</span>`;

  if (href !== null) {
    return `<a href="${href}" class="${cls}" aria-label="Mediawan - Beranda">${inner}</a>`;
  }
  return `<span class="${cls}">${inner}</span>`;
}

/* -------------------- HEADER -------------------- */

/**
 * Render header ke elemen dengan id "mw-header".
 * @param {Object} opts
 * @param {string} opts.active - slug menu yang sedang aktif (mis. "berita").
 */
function renderHeader({ active = "" } = {}) {
  const mount = document.getElementById("mw-header");
  if (!mount) return;

  const prefix = getPathPrefix();
  const homeHref = `${prefix}index.html`;

  const navLinks = MENU_ITEMS.map((item) => {
    const href = `${prefix}${item.href}`;
    const isActive = item.slug === active;
    return `<a href="${href}" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  const sideLinks = MENU_ITEMS.map((item) => {
    const href = `${prefix}${item.href}`;
    const isActive = item.slug === active;
    return `<a href="${href}" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  mount.innerHTML = `
    <header class="mw-header">
      <div class="mw-container mw-header__inner">
        <button class="mw-header__burger" id="mw-burger"
                aria-label="Buka menu" aria-controls="mw-sidebar" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>

        <div class="mw-header__logo">${logoTemplate({ href: homeHref })}</div>

        <nav class="mw-header__nav" aria-label="Menu utama">
          ${navLinks}
        </nav>

        <form class="mw-header__search mw-search-mini" id="mw-search-form" role="search">
          <label class="mw-visually-hidden" for="mw-search-input">Cari artikel</label>
          <input id="mw-search-input" type="search" name="q"
                 placeholder="Cari berita…" autocomplete="off">
          <button type="submit" aria-label="Cari">🔍</button>
        </form>
      </div>
    </header>

    <!-- Sidebar mobile -->
    <aside class="mw-sidebar" id="mw-sidebar" aria-hidden="true">
      <div class="mw-sidebar__head">
        ${logoTemplate({ size: "sm", href: homeHref })}
        <button class="mw-sidebar__close" id="mw-sidebar-close" aria-label="Tutup menu">×</button>
      </div>
      <nav class="mw-sidebar__nav" aria-label="Menu mobile">
        ${sideLinks}
      </nav>
      <form class="mw-search-mini" id="mw-search-form-mobile" role="search">
        <label class="mw-visually-hidden" for="mw-search-input-mobile">Cari artikel</label>
        <input id="mw-search-input-mobile" type="search" name="q"
               placeholder="Cari berita…" autocomplete="off">
        <button type="submit" aria-label="Cari">🔍</button>
      </form>
    </aside>
    <div class="mw-backdrop" id="mw-backdrop"></div>
  `;

  bindHeaderEvents(prefix);
}

/** Pasang event untuk burger, sidebar close, backdrop, dan form search. */
function bindHeaderEvents(prefix) {
  const burger     = document.getElementById("mw-burger");
  const sidebar    = document.getElementById("mw-sidebar");
  const backdrop   = document.getElementById("mw-backdrop");
  const closeBtn   = document.getElementById("mw-sidebar-close");
  const searchForm = document.getElementById("mw-search-form");
  const searchFormMobile = document.getElementById("mw-search-form-mobile");

  const openSidebar = () => {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    sidebar.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };
  const closeSidebar = () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    sidebar.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  burger?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  // Submit pencarian -> ke pages/search.html
  const goSearch = (value) => {
    const q = String(value || "").trim();
    if (!q) return;
    window.location.href = `${prefix}pages/search.html?q=${encodeURIComponent(q)}`;
  };

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    goSearch(searchForm.querySelector("input[name=q]")?.value);
  });
  searchFormMobile?.addEventListener("submit", (e) => {
    e.preventDefault();
    goSearch(searchFormMobile.querySelector("input[name=q]")?.value);
  });
}

/* -------------------- FOOTER -------------------- */

/** Render footer ke elemen dengan id "mw-footer". */
function renderFooter() {
  const mount = document.getElementById("mw-footer");
  if (!mount) return;

  const prefix = getPathPrefix();

  mount.innerHTML = `
    <footer class="mw-footer">
      <div class="mw-container">
        <div class="mw-footer__grid">
          <div>
            ${logoTemplate({ light: true, size: "lg", href: `${prefix}index.html` })}
            <p style="color:#b9b4ab; margin-top:12px; max-width:340px;">
              Mediawan adalah media berita & fakta independen.
              Kami menyajikan informasi yang terverifikasi, hangat, dan mudah dipahami.
            </p>
          </div>

          <div>
            <h3 class="mw-footer__title">Kategori</h3>
            <ul class="mw-footer__list">
              <li><a href="${prefix}pages/category.html?slug=fakta">Fakta</a></li>
              <li><a href="${prefix}pages/category.html?slug=berita">Berita</a></li>
              <li><a href="${prefix}pages/category.html?slug=teknologi">Teknologi</a></li>
              <li><a href="${prefix}pages/category.html?slug=hiburan">Hiburan</a></li>
              <li><a href="${prefix}pages/category.html?slug=olahraga">Olahraga</a></li>
            </ul>
          </div>

          <div>
            <h3 class="mw-footer__title">Mediawan</h3>
            <ul class="mw-footer__list">
              <li><a href="${prefix}pages/about.html">Tentang Kami</a></li>
              <li><a href="${prefix}pages/search.html">Pencarian</a></li>
              <li><a href="${prefix}admin/index.html">Masuk Admin</a></li>
            </ul>
          </div>

          <div>
            <h3 class="mw-footer__title">Surat Kabar</h3>
            <p style="color:#b9b4ab; font-size:14px; margin-bottom:12px;">
              Dapatkan ringkasan berita terbaik setiap minggu.
            </p>
            <form class="mw-newsletter" id="mw-newsletter-form">
              <label class="mw-visually-hidden" for="mw-newsletter-email">Email</label>
              <input class="mw-input" id="mw-newsletter-email" type="email"
                     name="email" placeholder="email@kamu.com" required>
              <button class="mw-btn mw-btn--accent" type="submit">Langganan</button>
            </form>
          </div>
        </div>

        <div class="mw-footer__bottom">
          <span>© ${new Date().getFullYear()} Mediawan. Semua hak dilindungi.</span>
          <span>Dibuat dengan ❤ di Indonesia.</span>
        </div>
      </div>
    </footer>
  `;

  bindNewsletter();
}

/** Handler form newsletter di footer. */
function bindNewsletter() {
  const form = document.getElementById("mw-newsletter-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[name=email]');
    const email = String(emailInput.value || "").trim().toLowerCase();
    const btn = form.querySelector("button[type=submit]");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      showToast("Masukkan email yang valid.", "error");
      return;
    }

    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Mengirim…";

    try {
      const { error } = await supabaseClient
        .from(TABLES.subscribers)
        .insert({ email });

      if (error) throw error;

      showToast("Terima kasih! Emailmu sudah terdaftar.", "success");
      form.reset();
    } catch (err) {
      // Duplikat = sudah pernah daftar, tetap dianggap sukses dari sisi user
      if (/duplicate key/i.test(err?.message || "")) {
        showToast("Email ini sudah berlangganan.", "info");
        form.reset();
      } else {
        showToast(friendlyError(err), "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

/* -------------------- KARTU ARTIKEL -------------------- */

/**
 * Bangun HTML satu kartu artikel.
 * @param {Object} a - row artikel dari Supabase.
 * @param {Object} opts - { compact: boolean, prefix: string }
 */
function articleCardHTML(a, { compact = false, prefix = "" } = {}) {
  const url = `${prefix}${articleUrl(a.slug)}`;
  const img = a.cover_image_url || `${prefix}${APP.defaultImage}`;
  const category = a.mw_categories?.name || "";
  const date = formatRelativeId(a.published_at || a.created_at);

  return `
    <article class="mw-card ${compact ? "mw-card--compact" : ""}">
      <a href="${url}" class="mw-card__media" aria-label="${escapeHtml(a.title)}">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(a.title)}" loading="lazy">
      </a>
      <div class="mw-card__body">
        <div class="mw-card__meta">
          ${category ? `<span class="mw-badge">${escapeHtml(category)}</span>` : ""}
          <span>${escapeHtml(date)}</span>
        </div>
        <h3 class="mw-card__title">
          <a href="${url}">${escapeHtml(a.title)}</a>
        </h3>
        ${a.excerpt ? `<p class="mw-card__excerpt">${escapeHtml(a.excerpt)}</p>` : ""}
      </div>
    </article>
  `;
}

/* -------------------- LIST ITEM (Terpopuler) -------------------- */

function popularItemHTML(a, index, prefix = "") {
  const url = `${prefix}${articleUrl(a.slug)}`;
  return `
    <li class="mw-list__item">
      <span class="mw-list__num">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <h4 class="mw-list__title"><a href="${url}">${escapeHtml(a.title)}</a></h4>
        <div class="mw-list__meta">
          ${a.mw_categories?.name ? escapeHtml(a.mw_categories.name) + " · " : ""}
          ${a.views ?? 0} kali dibaca
        </div>
      </div>
    </li>
  `;
}

/* -------------------- SKELETON -------------------- */

function skeletonCards(count = 6) {
  return Array.from({ length: count })
    .map(() => `<div class="mw-skeleton mw-skeleton--card"></div>`)
    .join("");
}

function skeletonList(count = 5) {
  return Array.from({ length: count })
    .map(() => `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div class="mw-skeleton" style="width:32px;height:32px;border-radius:8px;"></div>
        <div style="flex:1;">
          <div class="mw-skeleton mw-skeleton--title"></div>
          <div class="mw-skeleton mw-skeleton--text"></div>
        </div>
      </div>
    `)
    .join("");
}

/* -------------------- EMPTY / ERROR STATE -------------------- */

function emptyStateHTML(title = "Belum ada artikel", message = "Nantikan konten terbaru dari Mediawan.") {
  return `
    <div class="mw-state">
      <div class="mw-state__title">${escapeHtml(title)}</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function errorStateHTML(message = "Gagal memuat data. Coba lagi sebentar lagi.") {
  return `
    <div class="mw-state mw-state--error">
      <div class="mw-state__title">Terjadi kesalahan</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/* -------------------- INIT -------------------- */

/**
 * Panggil sekali di setiap halaman publik.
 * @param {Object} opts - { active: "berita", footer: true }
 */
function initPageChrome({ active = "", footer = true } = {}) {
  renderHeader({ active });
  if (footer) renderFooter();
}